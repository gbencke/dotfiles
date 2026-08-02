/**
 * goal-loop — keep fixing until a check command passes, with a fresh context
 * per attempt.
 *
 *   /goal pytest -x -q :: fix the failing scheduler tests
 *   pi -p "/goal npm test :: fix the failing tests"     (headless, same command)
 *   /goal-stop                                          (abandon after the current attempt)
 *
 * One attempt = one prompt + the agent's turn. Then pi runs the check itself; a
 * non-zero exit starts a NEW session seeded with only the goal and the failure
 * tail, so attempt N never inherits attempt N-1's wrong turns.
 *
 * Why it is shaped like this: newSession() exists only on a command context, and
 * every context is invalidated by the switch it performs. withSession() hands
 * back a fresh command context, so the loop recurses through it instead of
 * iterating.
 */

import { execFile } from "node:child_process";
import type { ExtensionAPI, ReplacedSessionContext } from "@earendil-works/pi-coding-agent";

const MAX_ATTEMPTS = 8;
const TAIL_CHARS = 4000;
const LOG_LINES = 12;
const CHECK_TIMEOUT_MS = 15 * 60 * 1000;
const TURN_START_TIMEOUT_MS = 30_000;

type Loop = { check: string; goal: string; attempt: number; tail?: string; log: string[] };

// /goal-stop runs in a different extension instance than the loop it stops
// (session replacement rebuilds the instance), so the flag cannot be closure state.
const store = globalThis as unknown as { __goalStop?: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run the check with node directly, not pi.exec: the captured `pi` of the
 * instance that started the loop is stale the moment a session is replaced.
 */
function runCheck(check: string, cwd: string): Promise<{ code: number; output: string }> {
	return new Promise((resolve) => {
		execFile(
			"bash",
			["-c", check],
			{ cwd, timeout: CHECK_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 },
			(error, stdout, stderr) => {
				const raw = (error as { code?: number | string } | null)?.code;
				resolve({
					code: error ? (typeof raw === "number" ? raw : 1) : 0,
					output: `${stdout}${stderr}` || String(error ?? ""),
				});
			},
		);
	});
}

function parseLoop(args: string): Loop | undefined {
	const [rawCheck, ...rest] = args.split("::");
	const check = rawCheck.trim();
	if (!check) return undefined;
	return { check, goal: rest.join("::").trim() || `make \`${check}\` pass`, attempt: 1, log: [] };
}

function kickoff(l: Loop): string {
	return [
		`Goal: ${l.goal}`,
		`Check command: ${l.check}`,
		l.tail ? `It currently fails. Tail of the output:\n\n${l.tail}` : "Run the check first to see the failure.",
		"",
		"Fix the root cause with the smallest diff. Do not edit, skip, or weaken the check itself.",
		`Stop when you believe it passes — the check then runs automatically, and a failure restarts you in a fresh session with no memory of this attempt. This is attempt ${l.attempt} of ${MAX_ATTEMPTS}.`,
	].join("\n");
}

export default function (pi: ExtensionAPI) {
	/**
	 * Narrate a step. The TUI surface is a widget, not the transcript: every
	 * attempt wipes the transcript, and the widget is re-attached to each
	 * replacement context from the log carried in the loop. Headless runs get the
	 * same lines on stderr, where stdout belongs to the model's answer.
	 */
	function say(ctx: ReplacedSessionContext, loop: Loop, line: string) {
		loop.log.push(line);
		if (ctx.mode === "tui") {
			ctx.ui.setWidget("goal-loop", [`goal-loop — ${loop.goal}`, `check: ${loop.check}`, ...loop.log.slice(-LOG_LINES)]);
		} else {
			process.stderr.write(`[goal-loop] ${line}\n`);
		}
	}

	/** Wait for the turn our message triggered to finish. */
	async function waitForTurn(ctx: ReplacedSessionContext) {
		// ponytail: poll for turn start because sendUserMessage does not await
		// delivery; an event-based barrier is only worth it if 100ms granularity hurts.
		const deadline = Date.now() + TURN_START_TIMEOUT_MS;
		while (ctx.isIdle() && Date.now() < deadline) await sleep(100);
		await ctx.waitForIdle();
	}

	async function attempt(ctx: ReplacedSessionContext, loop: Loop): Promise<void> {
		const label = `attempt ${loop.attempt}/${MAX_ATTEMPTS}`;
		const started = Date.now();
		say(ctx, loop, `${label}: working…`);
		ctx.ui.setStatus("goal-loop", `goal: ${label} working`);
		await ctx.sendUserMessage(kickoff(loop));
		await waitForTurn(ctx);

		ctx.ui.setStatus("goal-loop", `goal: ${label} running check`);
		const result = await runCheck(loop.check, ctx.cwd);
		const secs = Math.round((Date.now() - started) / 1000);
		ctx.ui.setStatus("goal-loop", undefined);
		loop.log.pop(); // replace the "working" line with the outcome
		say(ctx, loop, `${label}: check exited ${result.code} after ${secs}s`);
		if (ctx.mode !== "tui" && result.output.trim()) {
			process.stderr.write(`${result.output.trim().slice(-TAIL_CHARS)}\n`);
		}

		if (result.code === 0) {
			say(ctx, loop, `done: goal met on ${label}`);
			ctx.ui.notify(`Goal met on attempt ${loop.attempt}: \`${loop.check}\` passes`, "info");
			return;
		}
		if (store.__goalStop) {
			say(ctx, loop, `stopped by /goal-stop after ${label}`);
			ctx.ui.notify("Goal loop stopped", "info");
			return;
		}
		if (loop.attempt >= MAX_ATTEMPTS) {
			say(ctx, loop, `gave up: ${MAX_ATTEMPTS} attempts spent, check still fails`);
			ctx.ui.notify(`Goal loop gave up after ${MAX_ATTEMPTS} attempts: \`${loop.check}\` still fails`, "error");
			return;
		}

		const next: Loop = {
			...loop,
			attempt: loop.attempt + 1,
			tail: result.output.slice(-TAIL_CHARS),
			log: loop.log, // one running log across all attempts
		};
		say(ctx, next, `${label}: discarding context, restarting fresh`);
		await ctx.newSession({
			parentSession: ctx.sessionManager.getSessionFile(),
			// Only plain data crosses this boundary; ctx above is stale from here on.
			withSession: async (fresh) => attempt(fresh, next),
		});
	}

	pi.registerCommand("goal", {
		description: "Fix until a check passes, fresh context per attempt: /goal <check> :: <goal>",
		handler: async (args, ctx) => {
			const loop = parseLoop(args);
			if (!loop) {
				ctx.ui.notify("Usage: /goal <check command> :: <goal>", "error");
				return;
			}
			store.__goalStop = false;
			// Attempt 1 gets a clean room too, which also gives the loop a
			// replacement context to recurse on.
			await ctx.newSession({
				parentSession: ctx.sessionManager.getSessionFile(),
				withSession: async (fresh) => attempt(fresh, loop),
			});
		},
	});

	pi.registerCommand("goal-stop", {
		description: "Stop the goal loop after the current attempt",
		handler: async (_args, ctx) => {
			store.__goalStop = true;
			ctx.ui.notify("Goal loop will stop after the current attempt", "info");
		},
	});
}
