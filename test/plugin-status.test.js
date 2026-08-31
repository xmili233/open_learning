import assert from "node:assert/strict";
import test from "node:test";
import { parsePluginList } from "../src/plugin-status.js";

test("plugin status recognizes installed, disabled, and missing states", () => {
  assert.deepEqual(
    parsePluginList(JSON.stringify({
      installed: [{ name: "open-learning", installed: true, enabled: true, version: "0.1.0" }]
    })),
    { state: "installed", version: "0.1.0" }
  );
  assert.deepEqual(
    parsePluginList(JSON.stringify({
      installed: [{ name: "open-learning", installed: true, enabled: false, version: "0.1.0" }]
    })),
    { state: "disabled", version: "0.1.0" }
  );
  assert.deepEqual(parsePluginList(JSON.stringify({ installed: [] })), {
    state: "not_installed"
  });
});
