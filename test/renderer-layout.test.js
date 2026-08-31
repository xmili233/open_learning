import assert from "node:assert/strict";
import test from "node:test";
import { positionFor } from "../src/renderer/layout.js";

test("renderer converts semantic layout hints into stable positions", () => {
  assert.deepEqual(
    positionFor(3, { intent: "compare", direction: "left_to_right" }),
    { x: 480, y: 260 }
  );
  assert.deepEqual(
    positionFor(4, { intent: "flow", direction: "left_to_right" }),
    { x: 80, y: 260 }
  );
  assert.deepEqual(
    positionFor(3, { intent: "flow", direction: "top_to_bottom" }),
    { x: 80, y: 250 }
  );
});
