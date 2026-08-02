/**
 * Self-check: drives the extension with a fake ExtensionAPI.
 *   npx tsx goal-loop.test.ts
 * Fails loudly if the loop keeps going after a passing check, forgets to reset
 * the context after a failing one, drops the failure tail, or ignores the cap.
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import register from "./index.ts";

type Handler = (args: string, ctx: any) => Promise<void>;

function harness(onTurn?: (run: (name: string) => Promise<void>) => Promise<void>) {
	const commands = new Map<string, Handler>();
	const sent: string[] = [];
	let widget: string[] = [];
	const notes: string[] = [];
	let sessions = 0;
	const pi = {
		registerCommand: (name: string, opts: { handler: Handler }) => commands.set(name, opts.handler),
		on: () => {},
		sendUserMessage: (text: string) => sent.push(text),
	};
	// One context object stands in for both the command context and every
	// replacement context; isIdle() reports busy once so waitForTurn advances.
	let idleCalls = 0;
	const ctx: any = {
		cwd: "/tmp",
		mode: "tui",
		ui: {
			notify: (m: string) => notes.push(m),
			setStatus: () => {},
			setWidget: (_key: string, lines: string[]) => {
				widget = lines;
			},
		},
		sessionManager: { getSessionFile: () => `/tmp/session-${sessions}.jsonl` },
		isIdle: () => ++idleCalls % 2 === 0,
		waitForIdle: async () => {
			await onTurn?.((name: string) => commands.get(name)!("", ctx));
		},
		sendUserMessage: async (text: string) => sent.push(text),
		newSession: async (o: any) => {
			sessions += 1;
			await o.withSession(ctx);
			return { cancelled: false };
		},
	};
	register(pi as any);
	return {
		run: (name: string, args = "") => commands.get(name)!(args, ctx),
		sent,
		notes,
		widget: () => widget,
		sessionCount: () => sessions,
	};
}

async function main() {
	const tmp = mkdtempSync(join(tmpdir(), "goal-loop-"));
	// Red until the Nth run, so the loop has to reset the context to make progress.
	const redUntil = (n: number, tag: string) =>
		`c=${join(tmp, tag)}; i=$(( $(cat $c 2>/dev/null || echo 0) + 1 )); echo $i > $c; echo "run $i"; test $i -ge ${n}`;

	// Rejects a missing check command, without burning a session.
	{
		const h = harness();
		await h.run("goal", "   ");
		assert.equal(h.sent.length, 0);
		assert.equal(h.sessionCount(), 0);
		assert.match(h.notes[0], /Usage/);
	}

	// Check passes on attempt 1: one session, one prompt, then stop.
	{
		const h = harness();
		await h.run("goal", "true :: keep it green");
		assert.equal(h.sessionCount(), 1);
		assert.equal(h.sent.length, 1);
		assert.match(h.sent[0], /Goal: keep it green/);
		assert.match(h.notes[0], /Goal met on attempt 1/);
		assert.deepEqual(h.widget(), [
			"goal-loop — keep it green",
			"check: true",
			"attempt 1/8: check exited 0 after 0s",
			"done: goal met on attempt 1/8",
		]);
	}

	// Failure resets the context and carries the failure tail into attempt 2.
	{
		const h = harness();
		await h.run("goal", `${redUntil(2, "two")} :: fix it`);
		assert.equal(h.sessionCount(), 2);
		assert.match(h.sent[0], /Run the check first/);
		assert.match(h.sent[1], /Tail of the output:\n\nrun 1/);
		assert.match(h.sent[1], /attempt 2 of 8/);
		assert.match(h.notes[0], /Goal met on attempt 2/);
		const log = h.widget();
		assert.match(log[2], /attempt 1\/8: check exited 1 after \d+s/);
		assert.equal(log[3], "attempt 1/8: discarding context, restarting fresh");
		assert.match(log[4], /attempt 2\/8: check exited 0/);
		assert.equal(log[5], "done: goal met on attempt 2/8");
	}

	// Attempt cap: gives up instead of looping forever.
	{
		const h = harness();
		await h.run("goal", "false :: never happens");
		assert.equal(h.sent.length, 8);
		assert.match(h.notes[0], /gave up after 8/);
		assert.equal(h.widget().at(-1), "gave up: 8 attempts spent, check still fails");
	}

	// /goal-stop, invoked while attempt 1 is in flight, halts the loop.
	{
		let stopped = false;
		const h = harness(async (run) => {
			if (stopped) return;
			stopped = true;
			await run("goal-stop");
		});
		await h.run("goal", "false :: stopped early");
		assert.equal(h.sent.length, 1);
		assert.match(h.notes.at(-1)!, /Goal loop stopped/);
		assert.equal(h.widget().at(-1), "stopped by /goal-stop after attempt 1/8");
	}

	rmSync(tmp, { recursive: true, force: true });
	console.log("goal-loop: all checks passed");
}

main();
