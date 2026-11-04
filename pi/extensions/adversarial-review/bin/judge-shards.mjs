// Sharded judge: the data half (no model calls). docs/adr/0007-sharded-judge.md
//
// One judge that re-types every finding hits the model's output limit on a big
// review. Here code does the copying and the gates; models make only decisions:
//   partition  envelopes + prior ledger -> shards (same id never split)
//   checkShard a shard judge's decision rows are complete and consistent
//   assemble   decision rows + envelopes + prior -> cumulative ledger rows
//   applyMerges cross-shard merges from the final judge
//   buildSidecar ledger + coverage -> schema-v2 sidecar with counts and verdict
import { countsFor, expectedVerdict } from "./report-tools.mjs";

const SEVERITIES = ["P0", "P1", "P2", "P3"];
const ROW_STATUSES = ["open", "disproved", "fixed_verified", "deferred"];
const TEXT_FIELDS = ["file", "line", "title", "root_cause", "failure_condition", "evidence", "suggestion"];
const text = (v) => typeof v === "string" && v.trim().length > 0;
const uniq = (items) => [...new Set(items.filter(text))];
const effective = (f) => (f.status === "not_rechecked" ? f.prior_status : f.status);
const size = (v) => JSON.stringify(v).length;
const PRIOR = "prior:";

/** Number every envelope: refs E1..En in file order, so decisions stay short. */
export function numberEnvelopes(files) {
  const out = [];
  for (const { path, envelopes } of files)
    envelopes.forEach((envelope, index) => out.push({ ref: `E${out.length + 1}`, source: `${path}#${index}`, envelope }));
  return out;
}

const idsOf = (f) => uniq([f.id, ...(Array.isArray(f.aliases) ? f.aliases : [])]);

/**
 * Split into shards of about `budget` bytes. Envelopes and prior rows that share
 * an id (or alias) always land together; components are packed by their main
 * file so one file's findings stay in one shard. Prior rows no envelope names
 * join a shard that holds their file, or are carried as not_rechecked.
 */
export function partition(envelopes, priorFindings, budget) {
  const parent = new Map();
  const find = (k) => {
    while (parent.get(k) !== k) k = parent.get(k);
    return k;
  };
  const add = (k) => parent.has(k) || parent.set(k, k);
  const union = (ids) => {
    ids.forEach(add);
    for (const id of ids.slice(1)) parent.set(find(id), find(ids[0]));
  };
  for (const e of envelopes) union(idsOf(e.envelope.finding));
  const envIds = new Set(parent.keys());
  for (const p of priorFindings) if (idsOf(p).some((id) => envIds.has(id))) union(idsOf(p));

  const components = new Map();
  const component = (id) => {
    const root = find(id);
    if (!components.has(root)) components.set(root, { envelopes: [], priors: [] });
    return components.get(root);
  };
  for (const e of envelopes) component(e.envelope.finding.id).envelopes.push(e);
  const loose = [];
  for (const p of priorFindings) {
    const hit = idsOf(p).find((id) => envIds.has(id));
    if (hit) component(hit).priors.push(p);
    else loose.push(p);
  }

  const mainFile = (c) => {
    const n = new Map();
    for (const e of c.envelopes) n.set(e.envelope.finding.file, (n.get(e.envelope.finding.file) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0][0];
  };
  const byFile = new Map();
  for (const c of components.values()) {
    const file = String(mainFile(c));
    byFile.set(file, [...(byFile.get(file) ?? []), c]);
  }

  const shards = [];
  let current = null;
  for (const file of [...byFile.keys()].sort()) {
    const group = byFile.get(file);
    const bytes = group.reduce((s, c) => s + size(c.envelopes) + size(c.priors), 0);
    if (!current || (current.bytes > 0 && current.bytes + bytes > budget)) {
      current = { envelopes: [], priors: [], files: new Set(), bytes: 0 };
      shards.push(current);
    }
    for (const c of group) current.envelopes.push(...c.envelopes), current.priors.push(...c.priors);
    current.files.add(file);
    current.bytes += bytes;
  }
  for (const p of loose) {
    const home = shards.find((s) => s.files.has(p.file) || s.envelopes.some((e) => e.envelope.finding.file === p.file));
    if (home) home.priors.push(p);
  }
  return shards.map((s) => ({ envelopes: s.envelopes, priors: s.priors, files: [...s.files] }));
}

/** Throws with every problem in a shard judge's rows; the launcher retries once. */
export function checkShard(rows, shard, foreignPriorIds = []) {
  const errors = [];
  const refs = new Map(shard.envelopes.map((e) => [e.ref, e]));
  const priors = new Map(shard.priors.map((p) => [`${PRIOR}${p.id}`, p]));
  const foreign = new Set(foreignPriorIds);
  const seen = new Map();
  if (!Array.isArray(rows)) throw new Error("judge-shard output must be a JSON array of decision rows");
  rows.forEach((row, i) => {
    const at = `row ${i} (${row?.id ?? "no id"})`;
    if (!(typeof row?.id === "string" && /^[\w.-]+$/.test(row.id))) errors.push(`${at}: id must be a slug`);
    if (foreign.has(row?.id)) errors.push(`${at}: id belongs to a prior finding in another shard; pick a new id`);
    const sources = Array.isArray(row?.sources) ? row.sources : [];
    if (!sources.some((r) => refs.has(r))) errors.push(`${at}: sources must include at least one envelope ref (E…)`);
    for (const r of sources) {
      if (!refs.has(r) && !priors.has(r)) errors.push(`${at}: unknown source ${r}`);
      if (seen.has(r)) errors.push(`${at}: source ${r} already used by ${seen.get(r)}`);
      seen.set(r, row?.id);
    }
    const base = refs.get(row?.base);
    if (!base || !sources.includes(row.base)) {
      errors.push(`${at}: base must be one of its envelope refs`);
      return;
    }
    if (!ROW_STATUSES.includes(row.status)) errors.push(`${at}: status must be ${ROW_STATUSES.join("|")}`);
    if (!SEVERITIES.includes(row.severity)) errors.push(`${at}: severity must be P0-P3`);
    const state = base.envelope.challenge?.state;
    if (row.status === "open" && !["VALID", "AMBIGUOUS"].includes(state))
      errors.push(`${at}: open needs a VALID or AMBIGUOUS base envelope (base ${row.base} is ${state})`);
    if (row.status === "disproved" && state !== "INVALID") errors.push(`${at}: disproved needs an INVALID base envelope`);
    if (state === "AMBIGUOUS" && !text(base.envelope.challenge?.next_check) && !text(row.next_check))
      errors.push(`${at}: AMBIGUOUS base needs next_check`);
    if (row.status === "fixed_verified" && !(text(row.closure?.fix_commit) && text(row.closure?.verification) && row.closure?.evidence?.length))
      errors.push(`${at}: fixed_verified needs closure {evidence[], fix_commit, verification}`);
    if (row.status === "deferred" && !["reason", "owner", "ticket"].every((k) => text(row.deferral?.[k])))
      errors.push(`${at}: deferred needs deferral {reason, owner, ticket}`);
    const ids = uniq(sources.map((r) => (refs.has(r) ? refs.get(r).envelope.finding.id : priors.get(r)?.id)));
    if (ids.some((id) => id !== row.id) && !text(row.merge_reason)) errors.push(`${at}: merging ids ${ids.join(", ")} needs merge_reason`);
    const implicit = ids.map((id) => `${PRIOR}${id}`).filter((r) => priors.has(r));
    for (const r of uniq([...sources.filter((r) => priors.has(r)), ...implicit]))
      if (priors.get(r).severity !== row.severity && !text(row.severity_reason))
        errors.push(`${at}: ${r} was ${priors.get(r).severity}; a severity change needs severity_reason`);
  });
  for (const ref of refs.keys()) if (!seen.has(ref)) errors.push(`envelope ${ref} is in no row`);
  if (errors.length) throw new Error(`judge-shard output rejected:\n- ${errors.join("\n- ")}`);
}

/** Decision rows -> ledger rows. Prior rows no decision names are carried as not_rechecked. */
export function assemble(shards, decisions, priorFindings, meta) {
  const revision = meta.head_sha ?? meta.patch_sha256;
  const envelopes = new Map(shards.flatMap((s) => s.envelopes).map((e) => [e.ref, e]));
  const priorById = new Map();
  for (const p of priorFindings) for (const id of idsOf(p)) priorById.set(id, p);
  const all = decisions.flat();
  // An id is claimed by the row named after it, or by the row citing that prior;
  // another row reusing the id in an envelope must not take it as an alias.
  const claimed = new Map();
  for (const row of all) {
    claimed.set(row.id, row);
    for (const r of row.sources.filter((r) => r.startsWith(PRIOR))) for (const id of idsOf(priorById.get(r.slice(PRIOR.length)))) claimed.set(id, row);
  }
  const taken = new Set();
  const rows = [];
  for (const row of all) {
    const members = row.sources.filter((r) => envelopes.has(r)).map((r) => envelopes.get(r));
    const base = envelopes.get(row.base);
    const free = (id) => id !== row.id && (claimed.get(id) ?? row) === row && !taken.has(id);
    const memberIds = uniq(members.flatMap((e) => idsOf(e.envelope.finding))).filter(free);
    // Prior rows join through explicit sources, the row id, or an envelope reusing their id.
    const priors = uniq([
      ...row.sources.filter((r) => r.startsWith(PRIOR)).map((r) => r.slice(PRIOR.length)),
      ...[row.id, ...memberIds].filter((id) => priorById.has(id) && (claimed.get(id) ?? row) === row).map((id) => priorById.get(id).id),
    ]).map((id) => priorById.get(id));
    const aliases = uniq([...memberIds, ...priors.flatMap(idsOf)]).filter(free);
    aliases.forEach((id) => taken.add(id));
    const { lens, ...finding } = base.envelope.finding;
    const challenge = { ...base.envelope.challenge };
    const sameState = members.filter((e) => e !== base && e.envelope.challenge?.state === challenge.state);
    challenge.kill_attempts = uniq([...(challenge.kill_attempts ?? []), ...sameState.flatMap((e) => e.envelope.challenge?.kill_attempts ?? [])]);
    if (challenge.state === "AMBIGUOUS" && !text(challenge.next_check)) challenge.next_check = row.next_check;
    const out = {
      ...finding,
      id: row.id,
      aliases,
      severity: row.severity,
      lenses: uniq([...members.map((e) => e.envelope.finding.lens), ...priors.flatMap((p) => p.lenses ?? [])]),
      labels: challenge.state === "VALID" ? ["CONFIRMED"] : challenge.state === "AMBIGUOUS" ? ["NEEDS-HUMAN"] : [],
      first_seen: [meta.date, ...priors.map((p) => p.first_seen)].filter(text).sort((a, b) => Date.parse(a) - Date.parse(b))[0],
      last_checked_sha: revision,
      status: row.status,
      challenge,
      envelope_refs: members.map((e) => e.source),
    };
    if (text(row.severity_reason)) out.severity_reason = row.severity_reason;
    const changed = priors.filter((p) => p.severity !== row.severity);
    if (changed.length && !text(out.severity_reason))
      out.severity_reason = `Set to ${row.severity} by the shard judge from base envelope ${row.base} (${lens}: ${challenge.reason}); prior ${changed.map((p) => `${p.id} was ${p.severity}`).join(", ")}.`;
    delete out.merge_reason;
    if (aliases.length)
      out.merge_reason =
        uniq([row.merge_reason, finding.merge_reason, ...priors.map((p) => p.merge_reason)]).join(" ") ||
        `The shard judge grouped the cited sources, reported under ${aliases.join(", ")}, as this one root cause.`;
    if (row.status === "disproved")
      out.closure = row.closure ?? base.envelope.disposition?.closure ?? { evidence: challenge.kill_attempts };
    if (row.status === "fixed_verified") out.closure = row.closure;
    if (row.status === "deferred") out.deferral = row.deferral;
    if (Array.isArray(row.independent_evidence) && new Set(row.independent_evidence).size >= 2) {
      out.independent_evidence = row.independent_evidence;
      out.labels.push("CONSENSUS");
    }
    rows.push(out);
  }
  // Two shards may coin the same new id for different root causes: keep both.
  const ids = new Set();
  for (const r of rows) {
    let id = r.id;
    for (let n = 2; ids.has(id) || (id !== r.id && taken.has(id)); n++) id = `${r.id}-${n}`;
    r.id = id;
    ids.add(id);
  }
  const represented = new Set(rows.flatMap((r) => [r.id, ...r.aliases]));
  for (const p of priorFindings) {
    if (represented.has(p.id)) continue;
    const carried = p.status === "not_rechecked" ? { ...p } : { ...p, status: "not_rechecked", prior_status: effective(p) };
    carried.challenge = {
      ...p.challenge,
      kill_attempts: uniq([...(p.challenge?.kill_attempts ?? []), `Not rechecked on ${meta.date}: no envelope of this review named this finding; inherited evidence not reread.`]),
    };
    rows.push(carried);
  }
  return rows;
}

/** Final judge merges: `alias` joins `into`. The fresher row keeps its content; `into` keeps its id. */
export function applyMerges(findings, merges) {
  const rows = [...findings];
  const errors = [];
  for (const m of merges ?? []) {
    const a = rows.find((f) => f.id === m.alias);
    const b = rows.find((f) => f.id === m.into);
    if (!a || !b || a === b || !text(m.merge_reason)) {
      errors.push(`merge ${m.alias} -> ${m.into}: both ids must exist, differ, and have merge_reason`);
      continue;
    }
    const fresh = b.status === "not_rechecked" && a.status !== "not_rechecked" ? a : b;
    const merged = {
      ...fresh,
      id: b.id,
      aliases: uniq([...(a.aliases ?? []), a.id, ...(b.aliases ?? [])]).filter((id) => id !== b.id),
      lenses: uniq([...(a.lenses ?? []), ...(b.lenses ?? [])]),
      first_seen: [a.first_seen, b.first_seen].filter(text).sort((x, y) => Date.parse(x) - Date.parse(y))[0],
      merge_reason: uniq([b.merge_reason, a.merge_reason, m.merge_reason]).join(" "),
    };
    if (a.severity !== b.severity && !text(merged.severity_reason))
      merged.severity_reason = `Merged ${a.id} (${a.severity}) with ${b.id} (${b.severity}); kept ${merged.severity}: ${m.merge_reason}`;
    rows.splice(rows.indexOf(b), 1, merged);
    rows.splice(rows.indexOf(a), 1);
  }
  if (errors.length) throw new Error(`final judge merges rejected:\n- ${errors.join("\n- ")}`);
  return rows;
}

/** One line per ledger row: what the final judge reads instead of the full ledger. */
export function indexLines(findings) {
  return findings.map((f) =>
    [f.id, f.status === "not_rechecked" ? `not_rechecked(${f.prior_status})` : f.status, f.severity, f.challenge?.state, (f.lenses ?? []).join(","), `${f.file}:${f.line}`, f.title]
      .map((v) => String(v ?? "").replace(/\s*\n\s*|\|/g, " "))
      .join(" | "),
  );
}

export function lensCounts(findings) {
  const out = {};
  for (const f of findings)
    if (effective(f) === "open" && f.challenge?.state !== "INVALID")
      for (const lens of f.lenses ?? []) {
        out[lens] ??= { P0: 0, P1: 0, P2: 0, P3: 0, uncertain: 0, not_rechecked: 0 };
        if (f.status === "not_rechecked") out[lens].not_rechecked++;
        else if (f.challenge?.state === "AMBIGUOUS") out[lens].uncertain++;
        else out[lens][f.severity]++;
      }
  return out;
}

/** Sidecar from code: counts and the verdict gates are computed, not written by a model. */
export function buildSidecar({ meta, mode, repository, priorReports, findings, coverage, solutionFit }) {
  const s = {
    schema_version: 2,
    repository,
    target: meta.target,
    pr_number: meta.pr_number ?? null,
    mode,
    scope: { kind: "full" },
    date: meta.date,
    base_sha: meta.base_sha ?? null,
    head_sha: meta.head_sha ?? null,
    patch_sha256: meta.patch_sha256 ?? null,
    ...(meta.patch_path ? { patch_path: meta.patch_path } : {}),
    snapshot_consistent: meta.snapshot_consistent,
    lenses: meta.lenses,
    prior_reports: priorReports,
    coverage,
    findings,
    counts: countsFor(findings),
    uncertain_counts: countsFor(findings, true),
    verdict: { implementation: null, solution_fit: mode === "repo" ? null : (solutionFit ?? "unknown-intent"), overall: null },
  };
  const gates = expectedVerdict(s);
  s.verdict.overall = gates.overall;
  s.verdict.implementation = gates.p0 || gates.p1 ? "DEFECTIVE" : gates.criticalGap ? "UNDETERMINED" : gates.valid ? "CORRECT-WITH-NITS" : "CORRECT";
  return s;
}
