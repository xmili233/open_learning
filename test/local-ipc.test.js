import assert from "node:assert/strict";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { BoardStore } from "../src/board-state.js";
import { callBoardIpc, createBoardIpcServer } from "../src/local-ipc.js";

test("local IPC carries the complete teaching-board loop", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "open-learning-test-"));
  const runtimeFile = path.join(directory, "runtime.json");
  const store = new BoardStore();
  const changes = [];
  const local = await createBoardIpcServer({ store, runtimeFile, onChange: (state) => changes.push(state) });
  t.after(async () => {
    await local.close();
    await rm(directory, { recursive: true, force: true });
  });

  const status = await callBoardIpc("status", {}, { runtimeFile });
  assert.deepEqual(status, { ok: true, running: true, session_id: null, version: 0 });

  const opened = await callBoardIpc("open", { title: "递归", language: "zh", objective: "看见调用与返回" }, { runtimeFile });
  const patched = await callBoardIpc("patch", {
    session_id: opened.session_id,
    base_version: opened.version,
    operations: [
      { op: "put_node", id: "call", kind: "step", title: "调用", body: "进入更小的问题" },
      { op: "focus", ids: ["call"] }
    ]
  }, { runtimeFile });
  const read = await callBoardIpc("read", {
    session_id: opened.session_id,
    scope: "all",
    since_version: patched.version
  }, { runtimeFile });

  assert.equal(read.nodes[0].id, "call");
  assert.equal(read.version, 2);
  assert.equal(changes.length, 2);
});

test("startup removes a validated stale runtime socket", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "open-learning-stale-"));
  const runtimeFile = path.join(directory, "runtime.json");
  const staleSocket = path.join(directory, "stale.sock");
  await writeFile(staleSocket, "stale");
  await writeFile(runtimeFile, JSON.stringify({ endpoint: staleSocket, token: "expired" }));

  const local = await createBoardIpcServer({ store: new BoardStore(), runtimeFile });
  t.after(async () => {
    await local.close();
    await rm(directory, { recursive: true, force: true });
  });

  await assert.rejects(access(staleSocket));
  assert.notEqual(local.endpoint, staleSocket);
});
