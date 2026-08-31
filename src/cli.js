import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { BoardError } from "./board-state.js";
import { callBoardIpc } from "./local-ipc.js";

const HELP = `Open Learning CLI

Usage:
  open-learning app
  open-learning status
  open-learning board open '<json>'
  open-learning board patch '<json>'
  open-learning board read '<json>'

Use - instead of <json> to read one JSON object from stdin.
Every non-help command writes one compact JSON result.
`;

function isAppUnavailable(error) {
  return error instanceof BoardError && error.code === "APP_NOT_RUNNING";
}

function errorResult(error) {
  if (error instanceof BoardError) {
    return { ok: false, error: { code: error.code, message: error.message, details: error.details } };
  }
  return { ok: false, error: { code: "INTERNAL_ERROR", message: "Open Learning CLI failed." } };
}

async function spawnDetached(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      ...options
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function isDevelopmentRoot(directory) {
  try {
    const manifest = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
    await access(path.join(directory, "node_modules", ".bin", "electron"));
    return manifest.name === "open-learning";
  } catch {
    return false;
  }
}

export async function launchOpenLearningApp({
  cwd = process.cwd(),
  electron = process.versions.electron,
  executable = process.execPath,
  platform = process.platform
} = {}) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  if (electron) {
    await spawnDetached(executable, [], { env });
    return;
  }

  if (await isDevelopmentRoot(cwd)) {
    await spawnDetached(path.join(cwd, "node_modules", ".bin", "electron"), [cwd], { cwd, env });
    return;
  }

  if (platform === "darwin") {
    await spawnDetached("/usr/bin/open", ["-a", "Open Learning"], { env });
    return;
  }

  throw new BoardError(
    "APP_NOT_INSTALLED",
    "Open Learning is not installed or cannot be launched on this platform."
  );
}

async function waitForApp({ callBoard, launchApp, sleep, timeoutMs = 10_000 }) {
  try {
    return await callBoard("status", {});
  } catch (error) {
    if (!isAppUnavailable(error)) throw error;
  }

  await launchApp();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(100);
    try {
      return await callBoard("status", {});
    } catch (error) {
      if (!isAppUnavailable(error)) throw error;
    }
  }
  throw new BoardError("APP_START_TIMEOUT", "Open Learning did not become ready in time.");
}

async function parseInput(value, readStdin) {
  if (value === undefined) {
    throw new BoardError("INVALID_COMMAND", "A JSON input is required. Use - to read stdin.");
  }
  let text = value;
  if (value === "-") text = await readStdin();
  try {
    const input = JSON.parse(text);
    if (!input || Array.isArray(input) || typeof input !== "object") throw new Error();
    return input;
  } catch {
    throw new BoardError("INVALID_JSON", "The CLI input must be one JSON object.");
  }
}

export async function runCli(argv, {
  callBoard = callBoardIpc,
  launchApp = launchOpenLearningApp,
  readStdin = () => readFile(0, "utf8"),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  stderr = process.stderr,
  stdout = process.stdout
} = {}) {
  try {
    if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help" || argv[0] === "-h") {
      stdout.write(HELP);
      return 0;
    }

    let result;
    if (argv[0] === "status" && argv.length === 1) {
      try {
        result = await callBoard("status", {});
      } catch (error) {
        if (!isAppUnavailable(error)) throw error;
        result = { ok: true, running: false, session_id: null, version: 0 };
      }
    } else if (argv[0] === "app" && argv.length === 1) {
      result = await waitForApp({ callBoard, launchApp, sleep });
    } else if (argv[0] === "board" && ["open", "patch", "read"].includes(argv[1]) && argv.length === 3) {
      const input = await parseInput(argv[2], readStdin);
      await waitForApp({ callBoard, launchApp, sleep });
      result = await callBoard(argv[1], input);
    } else {
      throw new BoardError("INVALID_COMMAND", "Unknown command. Run open-learning --help.");
    }

    stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${JSON.stringify(errorResult(error))}\n`);
    return 1;
  }
}
