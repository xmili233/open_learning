import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { BoardStore } from "../src/board-state.js";
import { createBoardIpcServer } from "../src/local-ipc.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("STDIO MCP invokes open, repeated patch, and read through local IPC", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "open-learning-mcp-test-"));
  const runtimeFile = path.join(directory, "runtime.json");
  const isolatedPlugin = path.join(directory, "plugin");
  const isolatedServer = path.join(isolatedPlugin, "mcp/server.bundle.js");
  await mkdir(path.dirname(isolatedServer), { recursive: true });
  await copyFile(path.join(root, "plugins/open-learning/mcp/server.bundle.js"), isolatedServer);
  const local = await createBoardIpcServer({ store: new BoardStore(), runtimeFile });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [isolatedServer],
    cwd: isolatedPlugin,
    env: { ...process.env, OPEN_LEARNING_RUNTIME_FILE: runtimeFile },
    stderr: "pipe"
  });
  const client = new Client({ name: "open-learning-test", version: "0.1.0" });
  await client.connect(transport);
  t.after(async () => {
    await client.close();
    await local.close();
    await rm(directory, { recursive: true, force: true });
  });

  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((tool) => tool.name), [
    "learning_board_open",
    "learning_board_patch",
    "learning_board_read"
  ]);

  const opened = await client.callTool({
    name: "learning_board_open",
    arguments: { title: "Bayes", language: "en", objective: "Teach by transforming the board" }
  });
  const openResult = opened.structuredContent;
  assert.equal(openResult.version, 1);

  const first = await client.callTool({
    name: "learning_board_patch",
    arguments: {
      session_id: openResult.session_id,
      base_version: 1,
      operations: [{ op: "put_node", id: "prior", kind: "concept", title: "Prior", body: "Before evidence" }]
    }
  });
  const second = await client.callTool({
    name: "learning_board_patch",
    arguments: {
      session_id: openResult.session_id,
      base_version: first.structuredContent.version,
      operations: [
        { op: "put_node", id: "posterior", kind: "step", title: "Posterior", body: "After evidence" },
        { op: "put_edge", from: "prior", to: "posterior", label: "updates to" },
        { op: "focus", ids: ["posterior"] }
      ]
    }
  });
  const read = await client.callTool({
    name: "learning_board_read",
    arguments: { session_id: openResult.session_id, scope: "all", since_version: second.structuredContent.version }
  });

  assert.equal(read.structuredContent.nodes.length, 2);
  assert.deepEqual(read.structuredContent.focus, ["posterior"]);
  assert.equal(read.structuredContent.version, 3);
});
