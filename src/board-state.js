import { randomUUID } from "node:crypto";
import { z } from "zod";

const id = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const shortText = z.string().max(120);

export const openInputShape = {
  title: z.string().min(1).max(120),
  language: z.enum(["zh", "en"]),
  objective: z.string().max(500).default("")
};

const answerCheck = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("numeric"),
    expect: z.union([z.string().max(120), z.number().finite()]),
    tolerance: z.number().positive().max(1).default(1e-6)
  }).strict(),
  z.object({
    type: z.literal("expression"),
    expect: z.string().min(1).max(500)
  }).strict(),
  z.object({
    type: z.literal("choice"),
    expect: z.string().min(1).max(120),
    options: z.array(shortText).min(2).max(8)
  }).strict()
]);

const node = z.object({
  op: z.literal("put_node"),
  id,
  kind: z.enum(["problem", "concept", "example", "question", "step"]),
  title: shortText.default(""),
  body: z.string().max(2_000).default(""),
  owner: z.enum(["ai", "student"]).default("ai"),
  steps: z.array(z.string().max(500)).max(20).optional(),
  check: answerCheck.optional()
}).strict();

const operation = z.discriminatedUnion("op", [
  node,
  z.object({ op: z.literal("remove_node"), id }).strict(),
  z.object({ op: z.literal("mark"), id, spans: z.array(z.string().min(1).max(120)).max(12) }).strict(),
  z.object({ op: z.literal("reveal"), id, upto: z.number().int().nonnegative().max(20) }).strict(),
  z.object({ op: z.literal("collapse"), ids: z.array(id).min(1).max(12) }).strict(),
  z.object({ op: z.literal("focus"), ids: z.array(id).max(1) }).strict(),
  z.object({ op: z.literal("clear") }).strict()
]);

export const patchInputShape = {
  session_id: z.string().uuid(),
  base_version: z.number().int().nonnegative(),
  operations: z.array(operation).min(1).max(64)
};

export const readInputShape = {
  session_id: z.string().uuid(),
  scope: z.enum(["all", "selection_and_focus"]).default("selection_and_focus"),
  since_version: z.number().int().nonnegative().optional()
};

const answerInput = z.object({
  session_id: z.string().uuid(),
  node_id: id,
  input: z.string().min(1).max(500)
}).strict();

const openInput = z.object(openInputShape).strict();
const patchInput = z.object(patchInputShape).strict();
const readInput = z.object(readInputShape).strict();

export class BoardError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "BoardError";
    this.code = code;
    this.details = details;
  }
}

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BoardError("INVALID_INPUT", "The board request is invalid.", z.flattenError(result.error));
  }
  return result.data;
}

function cloneState(state) {
  return {
    ...state,
    nodes: new Map(state.nodes),
    focus: [...state.focus],
    selection: [...state.selection],
    events: [...state.events]
  };
}

function tokenize(source) {
  const raw = [];
  let rest = source.replace(/\s+/g, "");
  while (rest) {
    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    const variable = rest.match(/^[A-Za-z][A-Za-z0-9_]*/);
    if (number) {
      raw.push({ type: "number", value: number[0] });
      rest = rest.slice(number[0].length);
    } else if (variable) {
      raw.push({ type: "variable", value: variable[0] });
      rest = rest.slice(variable[0].length);
    } else if ("+-*/^()".includes(rest[0])) {
      raw.push({ type: rest[0], value: rest[0] });
      rest = rest.slice(1);
    } else {
      throw new BoardError("INVALID_ANSWER", "The expression contains an unsupported character.");
    }
  }

  const result = [];
  for (const token of raw) {
    const previous = result.at(-1);
    if (
      previous &&
      ["number", "variable", ")"].includes(previous.type) &&
      ["number", "variable", "("].includes(token.type)
    ) result.push({ type: "*", value: "*" });
    result.push(token);
  }
  return result;
}

function parseExpression(source, variables) {
  const input = tokenize(source);
  let position = 0;

  function primary() {
    const token = input[position++];
    if (!token) throw new BoardError("INVALID_ANSWER", "The expression ended unexpectedly.");
    if (token.type === "number") return Number(token.value);
    if (token.type === "variable") {
      variables.add(token.value);
      return { variable: token.value };
    }
    if (token.type === "(") {
      const value = expression(0);
      if (input[position++]?.type !== ")") throw new BoardError("INVALID_ANSWER", "A closing parenthesis is missing.");
      return value;
    }
    if (token.type === "+") return primary();
    if (token.type === "-") return { op: "negate", value: primary() };
    throw new BoardError("INVALID_ANSWER", "The expression is not valid.");
  }

  function expression(minimum) {
    let left = primary();
    const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };
    while (true) {
      const operator = input[position]?.type;
      const level = precedence[operator];
      if (!level || level < minimum) break;
      position += 1;
      const right = expression(level + (operator === "^" ? 0 : 1));
      left = { op: operator, left, right };
    }
    return left;
  }

  const tree = expression(0);
  if (position !== input.length) throw new BoardError("INVALID_ANSWER", "The expression is not valid.");
  return tree;
}

function evaluate(tree, values) {
  if (typeof tree === "number") return tree;
  if (tree.variable) return values[tree.variable];
  if (tree.op === "negate") return -evaluate(tree.value, values);
  const left = evaluate(tree.left, values);
  const right = evaluate(tree.right, values);
  if (tree.op === "+") return left + right;
  if (tree.op === "-") return left - right;
  if (tree.op === "*") return left * right;
  if (tree.op === "/") return left / right;
  return left ** right;
}

function residual(source, variables) {
  const parts = source.split("=");
  if (parts.length > 2 || parts.some((part) => !part.trim())) {
    throw new BoardError("INVALID_ANSWER", "Use one complete expression or equation.");
  }
  return {
    left: parseExpression(parts[0], variables),
    right: parts.length === 2 ? parseExpression(parts[1], variables) : 0
  };
}

function expressionEquivalent(actual, expected) {
  const variables = new Set();
  const actualTree = residual(actual, variables);
  const expectedTree = residual(expected, variables);
  const names = [...variables];
  // ponytail: deterministic sampling covers elementary algebra; use a CAS only when curriculum needs symbolic guarantees.
  const samples = [0.5, 1, 2, 3, -1, -2, 4.5, -3.5];
  const results = (tree) => samples.map((sample) => {
    const values = Object.fromEntries(names.map((name, index) => [name, sample + index * 0.37]));
    return evaluate(tree.left, values) - evaluate(tree.right, values);
  });
  const actualValues = results(actualTree);
  const expectedValues = results(expectedTree);
  if ([...actualValues, ...expectedValues].some((value) => !Number.isFinite(value))) return false;
  const pivot = samples.findIndex((_, index) =>
    Math.abs(actualValues[index]) > 1e-9 || Math.abs(expectedValues[index]) > 1e-9
  );
  if (pivot === -1) return true;
  if (Math.abs(actualValues[pivot]) < 1e-9 || Math.abs(expectedValues[pivot]) < 1e-9) return false;
  const scale = actualValues[pivot] / expectedValues[pivot];
  return actualValues.every((value, index) =>
    Math.abs(value - expectedValues[index] * scale) <= 1e-6 * Math.max(1, Math.abs(value))
  );
}

function checkAnswer(check, input) {
  if (check.type === "choice") return input === check.expect;
  if (check.type === "expression") return expressionEquivalent(input, check.expect);
  const actual = Number(input);
  const expected = Number(check.expect);
  return Number.isFinite(actual) && Number.isFinite(expected) &&
    Math.abs(actual - expected) <= check.tolerance * Math.max(1, Math.abs(expected));
}

export class BoardStore {
  #state = null;
  #idFactory;

  constructor({ idFactory = randomUUID } = {}) {
    this.#idFactory = idFactory;
  }

  open(input) {
    const args = parse(openInput, input);
    this.#state = {
      sessionId: this.#idFactory(),
      version: 1,
      title: args.title,
      language: args.language,
      objective: args.objective,
      nodes: new Map(),
      focus: [],
      selection: [],
      events: []
    };
    return { ok: true, session_id: this.#state.sessionId, version: this.#state.version };
  }

  patch(input) {
    const args = parse(patchInput, input);
    const current = this.#requireSession(args.session_id);
    if (args.base_version !== current.version) {
      throw new BoardError("VERSION_CONFLICT", "The board changed since it was last read.", {
        expected: current.version,
        received: args.base_version
      });
    }

    const next = cloneState(current);
    for (const op of args.operations) this.#apply(next, op);
    const visible = [...next.nodes.values()].filter((item) => !item.collapsed);
    if (visible.length > 6) {
      throw new BoardError("BOARD_FULL", "Collapse or remove a teaching object before adding another.", {
        visible: visible.map((item) => item.id)
      });
    }
    next.version += 1;
    this.#state = next;
    return { ok: true, session_id: next.sessionId, version: next.version, changed: args.operations.length };
  }

  read(input) {
    const args = parse(readInput, input);
    const state = this.#requireSession(args.session_id);
    const snapshot = this.snapshot();
    const events = state.events.filter((event) =>
      args.since_version === undefined || event.version > args.since_version
    );
    if (args.scope === "all") return { ok: true, ...snapshot, events };

    const visible = new Set([...state.focus, ...state.selection]);
    return {
      ok: true,
      session_id: state.sessionId,
      version: state.version,
      unchanged: args.since_version === state.version,
      focus: [...state.focus],
      selection: [...state.selection],
      nodes: snapshot.nodes.filter((item) => visible.has(item.id)),
      events
    };
  }

  answer(input) {
    const args = parse(answerInput, input);
    const current = this.#requireSession(args.session_id);
    const node = current.nodes.get(args.node_id);
    if (!node?.check) throw new BoardError("NOT_ANSWERABLE", "This teaching object does not accept an answer.");
    const next = cloneState(current);
    const result = checkAnswer(node.check, args.input) ? "correct" : "wrong";
    next.nodes.set(node.id, { ...node, input: args.input, result });
    this.#recordEvent(next, { type: "answer", node_id: node.id, input: args.input, result });
    this.#state = next;
    return this.snapshot();
  }

  select(ids) {
    if (!this.#state) return this.emptySnapshot();
    const selected = z.array(id).max(1).parse(ids).filter((item) => this.#state.nodes.has(item));
    const next = cloneState(this.#state);
    next.selection = selected;
    this.#recordEvent(next, { type: "select", node_id: selected[0] ?? null });
    this.#state = next;
    return this.snapshot();
  }

  tapBlank() {
    if (!this.#state) return this.emptySnapshot();
    const next = cloneState(this.#state);
    next.selection = [];
    this.#recordEvent(next, { type: "tap_blank" });
    this.#state = next;
    return this.snapshot();
  }

  snapshot() {
    if (!this.#state) return this.emptySnapshot();
    return {
      session_id: this.#state.sessionId,
      version: this.#state.version,
      title: this.#state.title,
      language: this.#state.language,
      objective: this.#state.objective,
      nodes: [...this.#state.nodes.values()],
      focus: [...this.#state.focus],
      selection: [...this.#state.selection]
    };
  }

  emptySnapshot() {
    return {
      session_id: null,
      version: 0,
      title: "Open Learning",
      objective: "",
      nodes: [],
      focus: [],
      selection: []
    };
  }

  #requireSession(sessionId) {
    if (!this.#state) throw new BoardError("APP_NOT_READY", "Open a board before using it.");
    if (this.#state.sessionId !== sessionId) {
      throw new BoardError("SESSION_NOT_FOUND", "The requested board session is not active.");
    }
    return this.#state;
  }

  #recordEvent(state, event) {
    state.version += 1;
    state.events.push({ ...event, version: state.version });
  }

  #protect(state, ids) {
    const protectedIds = ids.filter((item) => state.nodes.get(item)?.owner === "student");
    if (protectedIds.length) {
      throw new BoardError("OWNER_PROTECTED", "Student work cannot be changed or removed by Codex.", {
        ids: protectedIds
      });
    }
  }

  #apply(state, op) {
    if (op.op === "put_node") {
      const previous = state.nodes.get(op.id);
      if (previous?.owner === "student") this.#protect(state, [op.id]);
      if (op.kind === "problem" && op.owner !== "student") {
        throw new BoardError("INVALID_OWNER", "A problem must be owned by the student.");
      }
      if (op.steps && op.kind !== "example") {
        throw new BoardError("INVALID_NODE", "Only examples may contain revealable steps.");
      }
      if (op.check && op.kind !== "question") {
        throw new BoardError("INVALID_NODE", "Only questions may contain answer checks.");
      }
      state.nodes.set(op.id, {
        id: op.id,
        kind: op.kind,
        title: op.title,
        body: op.body,
        owner: op.owner,
        steps: op.steps ?? [],
        revealed: Math.min(previous?.revealed ?? 0, op.steps?.length ?? 0),
        marks: previous?.marks ?? [],
        collapsed: false,
        check: op.check
      });
      return;
    }
    if (op.op === "remove_node") {
      this.#protect(state, [op.id]);
      state.nodes.delete(op.id);
      state.focus = state.focus.filter((item) => item !== op.id);
      state.selection = state.selection.filter((item) => item !== op.id);
      return;
    }
    if (op.op === "mark") {
      const target = state.nodes.get(op.id);
      if (!target) throw new BoardError("MISSING_NODE", "The marked teaching object does not exist.", { id: op.id });
      const missing = op.spans.filter((span) => !target.body.includes(span));
      if (missing.length) {
        throw new BoardError("INVALID_MARK", "Every mark must match visible text exactly.", { missing });
      }
      state.nodes.set(op.id, { ...target, marks: op.spans });
      return;
    }
    if (op.op === "reveal") {
      const target = state.nodes.get(op.id);
      if (!target || target.kind !== "example") {
        throw new BoardError("INVALID_REVEAL", "Only an existing example can reveal steps.");
      }
      if (op.upto < target.revealed || op.upto > target.steps.length) {
        throw new BoardError("INVALID_REVEAL", "Reveal progress cannot move backward or exceed the example steps.");
      }
      state.nodes.set(op.id, { ...target, revealed: op.upto });
      return;
    }
    if (op.op === "collapse") {
      const missing = op.ids.filter((item) => !state.nodes.has(item));
      if (missing.length) {
        throw new BoardError("MISSING_NODE", "Collapsed teaching objects must exist.", { missing });
      }
      this.#protect(state, op.ids);
      for (const item of op.ids) state.nodes.set(item, { ...state.nodes.get(item), collapsed: true });
      state.focus = state.focus.filter((item) => !op.ids.includes(item));
      return;
    }
    if (op.op === "focus") {
      const missing = op.ids.filter((item) => !state.nodes.has(item));
      if (missing.length) {
        throw new BoardError("MISSING_NODE", "Focused teaching objects must exist.", { missing });
      }
      state.focus = [...op.ids];
      return;
    }
    for (const [nodeId, value] of state.nodes) {
      if (value.owner === "ai") state.nodes.delete(nodeId);
    }
    state.focus = state.focus.filter((item) => state.nodes.has(item));
    state.selection = state.selection.filter((item) => state.nodes.has(item));
  }
}
