import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile, chmod } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { BoardError } from "./board-state.js";

const MAX_REQUEST_BYTES = 1_000_000;

export function defaultRuntimeFile() {
  if (process.env.OPEN_LEARNING_RUNTIME_FILE) return process.env.OPEN_LEARNING_RUNTIME_FILE;
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Open Learning", "runtime.json");
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA ?? os.homedir(), "Open Learning", "runtime.json");
  }
  return path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"), "open-learning", "runtime.json");
}

function socketEndpoint() {
  if (process.platform === "win32") return `\\\\.\\pipe\\open-learning-${randomUUID()}`;
  const uid = typeof process.getuid === "function" ? process.getuid() : "user";
  return path.join(os.tmpdir(), `open-learning-${uid}-${randomUUID().slice(0, 8)}.sock`);
}

function isOwnedSocket(endpoint) {
  if (process.platform === "win32") return typeof endpoint === "string" && endpoint.startsWith("\\\\.\\pipe\\open-learning-");
  return typeof endpoint === "string"
    && endpoint.startsWith(path.join(os.tmpdir(), "open-learning-"))
    && endpoint.endsWith(".sock");
}

async function removeStaleRuntime(runtimeFile) {
  try {
    const descriptor = JSON.parse(await readFile(runtimeFile, "utf8"));
    if (process.platform !== "win32" && isOwnedSocket(descriptor.endpoint)) {
      await rm(descriptor.endpoint, { force: true });
    }
    await rm(runtimeFile, { force: true });
  } catch {
    await rm(runtimeFile, { force: true });
  }
}

function responseForError(error) {
  if (error instanceof BoardError) {
    return { ok: false, error: { code: error.code, message: error.message, details: error.details } };
  }
  return { ok: false, error: { code: "INTERNAL_ERROR", message: "The local board request failed." } };
}

export async function createBoardIpcServer({ store, runtimeFile = defaultRuntimeFile(), onChange = () => {} }) {
  await removeStaleRuntime(runtimeFile);
  const endpoint = socketEndpoint();
  const token = randomBytes(32).toString("hex");
  const server = net.createServer((socket) => {
    let input = "";
    let handled = false;
    socket.setEncoding("utf8");
    socket.on("error", () => {});
    socket.on("data", (chunk) => {
      if (handled) return;
      input += chunk;
      if (Buffer.byteLength(input) > MAX_REQUEST_BYTES) socket.destroy(new Error("Request too large"));
      if (!input.includes("\n")) return;
      handled = true;

      const line = input.slice(0, input.indexOf("\n"));
      Promise.resolve().then(() => {
        const request = JSON.parse(line);
        if (request.token !== token) throw new BoardError("UNAUTHORIZED", "Invalid local session token.");
        if (!request.arguments || typeof request.arguments !== "object") {
          throw new BoardError("INVALID_INPUT", "Tool arguments must be an object.");
        }

        let result;
        if (request.action === "open") result = store.open(request.arguments);
        else if (request.action === "patch") result = store.patch(request.arguments);
        else if (request.action === "read") result = store.read(request.arguments);
        else throw new BoardError("UNKNOWN_ACTION", "Unknown board action.");
        if (request.action !== "read") onChange(store.snapshot());
        return result;
      }).then(
        (result) => socket.end(`${JSON.stringify(result)}\n`),
        (error) => socket.end(`${JSON.stringify(responseForError(error))}\n`)
      );
    });
  });

  await mkdir(path.dirname(runtimeFile), { recursive: true, mode: 0o700 });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(endpoint, resolve);
  });
  if (process.platform !== "win32") await chmod(endpoint, 0o600);
  await writeFile(runtimeFile, JSON.stringify({ endpoint, token }), { mode: 0o600 });

  return {
    endpoint,
    runtimeFile,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      try {
        const current = JSON.parse(await readFile(runtimeFile, "utf8"));
        if (current.token === token) await rm(runtimeFile, { force: true });
      } catch {}
      if (process.platform !== "win32") await rm(endpoint, { force: true });
    }
  };
}

export async function callBoardIpc(action, args, { runtimeFile = defaultRuntimeFile(), timeoutMs = 5_000 } = {}) {
  let descriptor;
  try {
    descriptor = JSON.parse(await readFile(runtimeFile, "utf8"));
  } catch {
    throw new BoardError("APP_NOT_RUNNING", "Open Learning is not running. Open the app and try again.");
  }
  if (typeof descriptor.endpoint !== "string" || typeof descriptor.token !== "string") {
    throw new BoardError("APP_NOT_RUNNING", "Open Learning has an invalid runtime descriptor.");
  }

  return new Promise((resolve, reject) => {
    const socket = net.createConnection(descriptor.endpoint);
    let output = "";
    const timer = setTimeout(() => socket.destroy(new Error("Board request timed out")), timeoutMs);
    socket.setEncoding("utf8");
    socket.on("connect", () => socket.write(`${JSON.stringify({ token: descriptor.token, action, arguments: args })}\n`));
    socket.on("data", (chunk) => { output += chunk; });
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(new BoardError("APP_NOT_RUNNING", `Could not reach Open Learning: ${error.message}`));
    });
    socket.on("end", () => {
      clearTimeout(timer);
      try {
        const response = JSON.parse(output.trim());
        if (!response.ok) {
          reject(new BoardError(response.error?.code ?? "BOARD_ERROR", response.error?.message ?? "Board request failed.", response.error?.details));
          return;
        }
        resolve(response);
      } catch (error) {
        reject(new BoardError("INVALID_RESPONSE", `Open Learning returned an invalid response: ${error.message}`));
      }
    });
  });
}
