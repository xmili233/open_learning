import { randomUUID } from "node:crypto";
import { z } from "zod";

const id = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const shortText = z.string().max(120);

export const openInputShape = {
  title: z.string().min(1).max(120),
  language: z.enum(["zh", "en"]),
  objective: z.string().max(500).default("")
};

const node = z.object({
  op: z.literal("put_node"),
  id,
  kind: z.enum(["concept", "example", "question", "step"]),
  title: shortText,
  body: z.string().max(2_000).default("")
}).strict();

const operation = z.discriminatedUnion("op", [
  node,
  z.object({ op: z.literal("remove_node"), id }).strict(),
  z.object({
    op: z.literal("put_edge"),
    from: id,
    to: id,
    label: shortText.default("")
  }).strict(),
  z.object({
    op: z.literal("remove_edge"),
    from: id,
    to: id,
    label: shortText.optional()
  }).strict(),
  z.object({ op: z.literal("focus"), ids: z.array(id).max(12) }).strict(),
  z.object({ op: z.literal("clear") }).strict()
]);

const layout = z.object({
  intent: z.enum(["flow", "compare", "cluster"]).default("flow"),
  direction: z.enum(["left_to_right", "top_to_bottom"]).default("left_to_right"),
  preserve_existing: z.boolean().default(true)
}).strict();

export const patchInputShape = {
  session_id: z.string().uuid(),
  base_version: z.number().int().nonnegative(),
  operations: z.array(operation).min(1).max(64),
  layout: layout.optional()
};

export const readInputShape = {
  session_id: z.string().uuid(),
  scope: z.enum(["all", "selection_and_focus"]).default("selection_and_focus"),
  since_version: z.number().int().nonnegative().optional()
};

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

function edgeKey(edge) {
  return `${edge.from}\u0000${edge.to}\u0000${edge.label}`;
}

function cloneState(state) {
  return {
    ...state,
    nodes: new Map(state.nodes),
    edges: new Map(state.edges),
    focus: [...state.focus],
    selection: [...state.selection],
    layout: { ...state.layout }
  };
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
      edges: new Map(),
      focus: [],
      selection: [],
      layout: { intent: "flow", direction: "left_to_right", preserve_existing: true }
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
    if (args.layout) next.layout = args.layout;
    next.version += 1;
    this.#state = next;
    return { ok: true, session_id: next.sessionId, version: next.version, changed: args.operations.length };
  }

  read(input) {
    const args = parse(readInput, input);
    const state = this.#requireSession(args.session_id);
    const snapshot = this.snapshot();
    if (args.scope === "all") return { ok: true, ...snapshot };

    const visible = new Set([...state.focus, ...state.selection]);
    return {
      ok: true,
      session_id: state.sessionId,
      version: state.version,
      unchanged: args.since_version === state.version,
      focus: [...state.focus],
      selection: [...state.selection],
      nodes: snapshot.nodes.filter((item) => visible.has(item.id)),
      edges: snapshot.edges.filter((edge) => visible.has(edge.from) && visible.has(edge.to))
    };
  }

  select(ids) {
    if (!this.#state) return this.emptySnapshot();
    const parsed = z.array(id).max(12).parse(ids);
    this.#state.selection = parsed.filter((item) => this.#state.nodes.has(item));
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
      edges: [...this.#state.edges.values()],
      focus: [...this.#state.focus],
      selection: [...this.#state.selection],
      layout: { ...this.#state.layout }
    };
  }

  emptySnapshot() {
    return {
      session_id: null,
      version: 0,
      title: "Open Learning",
      objective: "",
      nodes: [],
      edges: [],
      focus: [],
      selection: [],
      layout: { intent: "flow", direction: "left_to_right", preserve_existing: true }
    };
  }

  #requireSession(sessionId) {
    if (!this.#state) throw new BoardError("APP_NOT_READY", "Open a board before using it.");
    if (this.#state.sessionId !== sessionId) {
      throw new BoardError("SESSION_NOT_FOUND", "The requested board session is not active.");
    }
    return this.#state;
  }

  #apply(state, op) {
    if (op.op === "put_node") {
      state.nodes.set(op.id, { id: op.id, kind: op.kind, title: op.title, body: op.body });
      return;
    }
    if (op.op === "remove_node") {
      state.nodes.delete(op.id);
      for (const [key, edge] of state.edges) {
        if (edge.from === op.id || edge.to === op.id) state.edges.delete(key);
      }
      state.focus = state.focus.filter((item) => item !== op.id);
      state.selection = state.selection.filter((item) => item !== op.id);
      return;
    }
    if (op.op === "put_edge") {
      if (!state.nodes.has(op.from) || !state.nodes.has(op.to)) {
        throw new BoardError("MISSING_NODE", "Both edge endpoints must exist before adding an edge.", op);
      }
      const edge = { from: op.from, to: op.to, label: op.label };
      state.edges.set(edgeKey(edge), edge);
      return;
    }
    if (op.op === "remove_edge") {
      for (const [key, edge] of state.edges) {
        if (edge.from === op.from && edge.to === op.to && (op.label === undefined || edge.label === op.label)) {
          state.edges.delete(key);
        }
      }
      return;
    }
    if (op.op === "focus") {
      const missing = op.ids.filter((item) => !state.nodes.has(item));
      if (missing.length) throw new BoardError("MISSING_NODE", "Focused objects must exist.", { missing });
      state.focus = [...op.ids];
      return;
    }
    state.nodes.clear();
    state.edges.clear();
    state.focus = [];
    state.selection = [];
  }
}
