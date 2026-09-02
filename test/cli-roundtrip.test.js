import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { BoardStore } from "../src/board-state.js";
import { runCli } from "../src/cli.js";
import { callBoardIpc, createBoardIpcServer } from "../src/local-ipc.js";

function output() {
  let value = "";
  return {
    stream: { write: (chunk) => { value += chunk; } },
    json: () => JSON.parse(value)
  };
}

test("CLI launches the app and carries the complete board loop", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "open-learning-cli-test-"));
  const runtimeFile = path.join(directory, "runtime.json");
  const callBoard = (action, args) => callBoardIpc(action, args, { runtimeFile });
  let server;
  let boardStore;
  let launches = 0;
  const launchApp = async () => {
    launches += 1;
    boardStore = new BoardStore();
    server = await createBoardIpcServer({ store: boardStore, runtimeFile });
  };
  t.after(async () => {
    await server?.close();
    await rm(directory, { recursive: true, force: true });
  });

  const closed = output();
  assert.equal(await runCli(["status"], { callBoard, launchApp, stdout: closed.stream }), 0);
  assert.deepEqual(closed.json(), { ok: true, running: false, session_id: null, version: 0 });

  const openedOutput = output();
  assert.equal(await runCli([
    "board",
    "open",
    JSON.stringify({ title: "Bayes", language: "en", objective: "See belief change" })
  ], { callBoard, launchApp, stdout: openedOutput.stream }), 0);
  const opened = openedOutput.json();
  assert.equal(launches, 1);
  assert.equal(opened.version, 1);

  const patchedOutput = output();
  assert.equal(await runCli([
    "board",
    "patch",
    JSON.stringify({
      session_id: opened.session_id,
      base_version: opened.version,
      operations: [
        {
          op: "put_node",
          id: "problem",
          kind: "problem",
          owner: "student",
          body: "Two cars travel toward each other for 240 km."
        },
        { op: "mark", id: "problem", spans: ["240 km"] },
        {
          op: "put_node",
          id: "answer",
          kind: "question",
          body: "Write the equation",
          check: { type: "expression", expect: "60t+40t=240" }
        },
        { op: "focus", ids: ["answer"] }
      ]
    })
  ], { callBoard, launchApp, stdout: patchedOutput.stream }), 0);
  const patched = patchedOutput.json();
  boardStore.answer({
    session_id: opened.session_id,
    node_id: "answer",
    input: "100t=240"
  });

  const readOutput = output();
  assert.equal(await runCli([
    "board",
    "read",
    JSON.stringify({ session_id: opened.session_id, scope: "all", since_version: patched.version })
  ], { callBoard, launchApp, stdout: readOutput.stream }), 0);
  const read = readOutput.json();
  assert.equal(read.nodes.length, 2);
  assert.deepEqual(read.focus, ["answer"]);
  assert.equal(read.version, 3);
  assert.equal(read.events[0].result, "correct");
});

test("CLI rejects malformed input without launching the app", async () => {
  const stdout = output();
  const stderr = output();
  let launched = false;
  const code = await runCli(["board", "open", "not-json"], {
    launchApp: async () => { launched = true; },
    stderr: stderr.stream,
    stdout: stdout.stream
  });

  assert.equal(code, 1);
  assert.equal(launched, false);
  assert.equal(stderr.json().error.code, "INVALID_JSON");
});
