import assert from "node:assert/strict";
import test from "node:test";
import { BoardError, BoardStore } from "../src/board-state.js";

const sessionId = "123e4567-e89b-42d3-a456-426614174000";

test("open, transform, select, and read a live board", () => {
  const store = new BoardStore({ idFactory: () => sessionId });
  const opened = store.open({ title: "Bayesian updating", language: "en", objective: "See belief change" });
  assert.equal(opened.version, 1);

  const patched = store.patch({
    session_id: sessionId,
    base_version: 1,
    operations: [
      { op: "put_node", id: "prior", kind: "concept", title: "Prior", body: "Belief before evidence" },
      { op: "put_node", id: "evidence", kind: "example", title: "Evidence", body: "New observation" },
      { op: "put_edge", from: "prior", to: "evidence", label: "updated by" },
      { op: "focus", ids: ["prior", "evidence"] }
    ]
  });
  assert.deepEqual(patched, { ok: true, session_id: sessionId, version: 2, changed: 4 });

  store.select(["evidence"]);
  const read = store.read({ session_id: sessionId, scope: "selection_and_focus", since_version: 2 });
  assert.equal(read.unchanged, true);
  assert.deepEqual(read.selection, ["evidence"]);
  assert.equal(read.nodes.length, 2);

  store.patch({
    session_id: sessionId,
    base_version: 2,
    operations: [
      { op: "remove_node", id: "evidence" },
      { op: "put_node", id: "posterior", kind: "step", title: "Posterior", body: "Belief after evidence" },
      { op: "focus", ids: ["posterior"] }
    ],
    layout: { intent: "flow", direction: "left_to_right", preserve_existing: true }
  });
  const state = store.snapshot();
  assert.deepEqual(state.nodes.map((node) => node.id), ["prior", "posterior"]);
  assert.equal(state.edges.length, 0);
  assert.deepEqual(state.selection, []);
});

test("a rejected patch is atomic", () => {
  const store = new BoardStore({ idFactory: () => sessionId });
  store.open({ title: "Atomic", language: "en" });

  assert.throws(() => store.patch({
    session_id: sessionId,
    base_version: 1,
    operations: [
      { op: "put_node", id: "kept-out", kind: "concept", title: "Never committed" },
      { op: "put_edge", from: "missing", to: "kept-out", label: "invalid" }
    ]
  }), (error) => error instanceof BoardError && error.code === "MISSING_NODE");
  assert.equal(store.snapshot().nodes.length, 0);
  assert.equal(store.snapshot().version, 1);
});

test("stale versions fail with a recoverable conflict", () => {
  const store = new BoardStore({ idFactory: () => sessionId });
  store.open({ title: "Version", language: "zh" });
  assert.throws(() => store.patch({
    session_id: sessionId,
    base_version: 0,
    operations: [{ op: "clear" }]
  }), (error) => error instanceof BoardError && error.code === "VERSION_CONFLICT");
});
