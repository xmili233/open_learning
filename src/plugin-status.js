import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PLUGIN_NAME = "open-learning";

export function parsePluginList(output) {
  const result = JSON.parse(output);
  if (!Array.isArray(result.installed)) throw new Error("Invalid Codex plugin list");

  const plugin = result.installed.find((item) => item.name === PLUGIN_NAME);
  if (!plugin?.installed) return { state: "not_installed" };
  if (!plugin.enabled) return { state: "disabled", version: plugin.version };
  return { state: "installed", version: plugin.version };
}

async function findCodex() {
  const fixedPaths = [
    path.join(os.homedir(), ".local", "bin", "codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
  ];

  for (const candidate of fixedPaths) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  return "codex";
}

export async function checkOpenLearningPlugin() {
  try {
    const executable = await findCodex();
    const { stdout } = await execFileAsync(
      executable,
      ["plugin", "list", "--json"],
      { maxBuffer: 1_000_000, timeout: 4_000, windowsHide: true }
    );
    return parsePluginList(stdout);
  } catch (error) {
    if (error?.code === "ENOENT") return { state: "codex_missing" };
    return { state: "error" };
  }
}
