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
  let launches = 0;
  const launchApp = async () => {
    launches += 1;
    server = await createBoardIpcServer({ store: new BoardStore(), runtimeFile });
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
        { op: "put_node", id: "prior", kind: "concept", title: "Prior", body: "Before evidence" },
        { op: "put_node", id: "posterior", kind: "step", title: "Posterior", body: "After evidence" },
        { op: "put_edge", from: "prior", to: "posterior", label: "updates to" },
        { op: "focus", ids: ["posterior"] }
      ]
    })
  ], { callBoard, launchApp, stdout: patchedOutput.stream }), 0);
  const patched = patchedOutput.json();

  const readOutput = output();
  assert.equal(await runCli([
    "board",
    "read",
    JSON.stringify({ session_id: opened.session_id, scope: "all", since_version: patched.version })
  ], { callBoard, launchApp, stdout: readOutput.stream }), 0);
  const read = readOutput.json();
  assert.equal(read.nodes.length, 2);
  assert.deepEqual(read.focus, ["posterior"]);
  assert.equal(read.version, 2);
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
