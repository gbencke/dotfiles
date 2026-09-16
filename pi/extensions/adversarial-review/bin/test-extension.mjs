// Node 22: node --experimental-strip-types --test bin/test-extension.mjs
import assert from "node:assert/strict";
import test from "node:test";
import extension from "../index.ts";

test("commands retain scope arguments and register the final report guard", async () => {
  const commands = new Map();
  const events = new Map();
  const messages = [];
  extension({
    registerCommand: (name, command) => commands.set(name, command),
    on: (name, handler) => events.set(name, handler),
    sendMessage: (...args) => messages.push(args),
  });
  assert.deepEqual(
    [...commands.keys()],
    ["review-repo", "review-change", "review-consolidate"],
  );
  await commands
    .get("review-change")
    .handler("938 --verify selection-stale-write", { hasUI: false });
  assert.match(messages[0][0].content, /938 --verify selection-stale-write/);
  assert.match(messages[0][0].content, /report-tools\.mjs validate/);
  assert.equal(messages[0][1].triggerTurn, true);
  const guard = events.get("message_end");
  assert.equal(
    guard({ message: { role: "user", content: "unrelated" } }),
    undefined,
  );
  const result = guard({
    message: {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "SHIP\nREPORT: /__absent__/.gbencke/adversarial-review/reports/test.md",
        },
      ],
    },
  });
  assert.match(result.message.content[0].text, /no approval issued/);
  assert.doesNotMatch(result.message.content[0].text, /^REPORT:/m);
});
