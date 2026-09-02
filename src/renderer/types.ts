export type Language = "en" | "zh";

export interface BoardNode {
  body: string;
  check?: {
    expect: number | string;
    options?: string[];
    tolerance?: number;
    type: "choice" | "expression" | "numeric";
  };
  collapsed: boolean;
  id: string;
  input?: string;
  kind: "concept" | "example" | "problem" | "question" | "step";
  marks: string[];
  owner: "ai" | "student";
  result?: "correct" | "wrong";
  revealed: number;
  steps: string[];
  title: string;
}

export interface BoardState {
  focus: string[];
  language?: Language;
  nodes: BoardNode[];
  objective: string;
  selection: string[];
  session_id: string | null;
  title: string;
  version: number;
}

export interface PluginStatus {
  state:
    | "checking"
    | "codex_missing"
    | "disabled"
    | "error"
    | "installed"
    | "not_installed";
  version?: string;
}

declare global {
  interface Window {
    openLearning: {
      copyMarketplaceUrl: () => Promise<void>;
      answer: (input: {
        input: string;
        node_id: string;
        session_id: string;
      }) => Promise<BoardState>;
      getState: () => Promise<BoardState>;
      getPluginStatus: () => Promise<PluginStatus>;
      onState: (callback: (state: BoardState) => void) => () => void;
      select: (ids: string[]) => Promise<BoardState>;
      tapBlank: () => Promise<BoardState>;
    };
  }
}
