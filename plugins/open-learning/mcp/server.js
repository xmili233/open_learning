#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BoardError, openInputShape, patchInputShape, readInputShape } from "../../../src/board-state.js";
import { callBoardIpc } from "../../../src/local-ipc.js";

const server = new McpServer({ name: "open-learning", version: "0.1.0" });

function toolResult(result) {
  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
    structuredContent: result
  };
}

async function call(action, args) {
  try {
    return toolResult(await callBoardIpc(action, args));
  } catch (error) {
    const result = error instanceof BoardError
      ? { ok: false, error: { code: error.code, message: error.message, details: error.details } }
      : { ok: false, error: { code: "INTERNAL_ERROR", message: "The board tool failed." } };
    return { ...toolResult(result), isError: true };
  }
}

server.registerTool("learning_board_open", {
  description: "Open a fresh live teaching board before starting a visual explanation. This replaces the active board.",
  inputSchema: openInputShape
}, (args) => call("open", args));

server.registerTool("learning_board_patch", {
  description: "Atomically add, update, remove, focus, or clear teaching objects during the explanation. Use one compact patch per teaching move.",
  inputSchema: patchInputShape
}, (args) => call("patch", args));

server.registerTool("learning_board_read", {
  description: "Read the current selection, focus, version, or full board before referring to or changing existing objects.",
  inputSchema: readInputShape
}, (args) => call("read", args));

await server.connect(new StdioServerTransport());
