import assert from "node:assert/strict";
import test from "node:test";
import { BoardError, BoardStore } from "../src/board-state.js";

const sessionId = "123e4567-e89b-42d3-a456-426614174000";

function store() {
  const value = new BoardStore({ idFactory: () => sessionId });
  value.open({ title: "相遇问题", language: "zh" });
  return value;
}

function patch(value, version, operations) {
  return value.patch({ session_id: sessionId, base_version: version, operations });
}

test("a student problem, Codex marks, and a locally checked answer form one board loop", () => {
  const board = store();
  patch(board, 1, [
    {
      op: "put_node",
      id: "problem",
      kind: "problem",
      owner: "student",
      body: "两车相距 240 km，以 60 km/h 和 40 km/h 相向而行。"
    },
    { op: "mark", id: "problem", spans: ["240 km", "相向而行"] },
    {
      op: "put_node",
      id: "equation",
      kind: "question",
      body: "写出相遇时的等式",
      check: { type: "expression", expect: "60t+40t=240" }
    },
    { op: "focus", ids: ["equation"] }
  ]);

  const answered = board.answer({
    session_id: sessionId,
    node_id: "equation",
    input: "100t = 240"
  });
  assert.equal(answered.version, 3);
  assert.equal(answered.nodes.find((node) => node.id === "equation").result, "correct");

  const read = board.read({
    session_id: sessionId,
    scope: "selection_and_focus",
    since_version: 2
  });
  assert.equal(read.nodes[0].id, "equation");
  assert.deepEqual(read.events, [{
    type: "answer",
    node_id: "equation",
    input: "100t = 240",
    result: "correct",
    version: 3
  }]);
});

test("student-owned work is protected and rejected patches stay atomic", () => {
  const board = store();
  patch(board, 1, [
    { op: "put_node", id: "work", kind: "step", owner: "student", body: "100t = 240" }
  ]);

  assert.throws(() => patch(board, 2, [
    { op: "put_node", id: "temporary", kind: "step", body: "This must not land" },
    { op: "remove_node", id: "work" }
  ]), (error) => error instanceof BoardError && error.code === "OWNER_PROTECTED");
  assert.deepEqual(board.snapshot().nodes.map((node) => node.id), ["work"]);
  assert.equal(board.snapshot().version, 2);

  patch(board, 2, [
    { op: "put_node", id: "hint", kind: "step", body: "两车路程之和 = 240" },
    { op: "clear" }
  ]);
  assert.deepEqual(board.snapshot().nodes.map((node) => node.id), ["work"]);
});

test("examples reveal forward and collapsed scaffolding frees visible space", () => {
  const board = store();
  patch(board, 1, [
    {
      op: "put_node",
      id: "example",
      kind: "example",
      body: "一道相似题",
      steps: ["设时间为 t", "写两段路程", "路程相加"]
    },
    { op: "reveal", id: "example", upto: 1 }
  ]);
  assert.equal(board.snapshot().nodes[0].revealed, 1);
  assert.throws(
    () => patch(board, 2, [{ op: "reveal", id: "example", upto: 0 }]),
    (error) => error instanceof BoardError && error.code === "INVALID_REVEAL"
  );

  patch(board, 2, Array.from({ length: 5 }, (_, index) => ({
    op: "put_node",
    id: "step_" + index,
    kind: "step",
    body: "步骤 " + index
  })));
  assert.throws(
    () => patch(board, 3, [{ op: "put_node", id: "seventh", kind: "step", body: "太多了" }]),
    (error) => error instanceof BoardError && error.code === "BOARD_FULL"
  );
  patch(board, 3, [
    { op: "collapse", ids: ["step_0"] },
    { op: "put_node", id: "seventh", kind: "step", body: "现在可以显示" }
  ]);
  assert.equal(board.snapshot().nodes.find((node) => node.id === "step_0").collapsed, true);
});

test("numeric, expression, and choice checks return reliable student events", () => {
  const board = store();
  patch(board, 1, [
    {
      op: "put_node",
      id: "numeric",
      kind: "question",
      body: "几小时相遇？",
      check: { type: "numeric", expect: 2.4 }
    },
    {
      op: "put_node",
      id: "expression",
      kind: "question",
      body: "等式",
      check: { type: "expression", expect: "60t+40t=240" }
    },
    {
      op: "put_node",
      id: "choice",
      kind: "question",
      body: "相向时用什么？",
      check: { type: "choice", expect: "相加", options: ["相加", "相减"] }
    }
  ]);

  assert.equal(board.answer({ session_id: sessionId, node_id: "numeric", input: "2.4" })
    .nodes.find((node) => node.id === "numeric").result, "correct");
  assert.equal(board.answer({ session_id: sessionId, node_id: "expression", input: "240 = 100t" })
    .nodes.find((node) => node.id === "expression").result, "correct");
  assert.equal(board.answer({ session_id: sessionId, node_id: "choice", input: "相减" })
    .nodes.find((node) => node.id === "choice").result, "wrong");
});

test("student interaction invalidates a pending Codex patch", () => {
  const board = store();
  patch(board, 1, [
    { op: "put_node", id: "condition", kind: "step", body: "相向而行" }
  ]);
  const selected = board.select(["condition"]);
  assert.equal(selected.version, 3);
  assert.deepEqual(selected.selection, ["condition"]);

  assert.throws(
    () => patch(board, 2, [{ op: "put_node", id: "stale", kind: "step", body: "过期内容" }]),
    (error) => error instanceof BoardError && error.code === "VERSION_CONFLICT"
  );

  const blank = board.tapBlank();
  assert.equal(blank.version, 4);
  assert.deepEqual(blank.selection, []);
  const read = board.read({ session_id: sessionId, scope: "all", since_version: 2 });
  assert.deepEqual(read.events.map((event) => event.type), ["select", "tap_blank"]);
});
