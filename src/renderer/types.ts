export type Language = "en" | "zh";

export interface BoardNode {
  body: string;
  id: string;
  kind: "concept" | "example" | "question" | "step";
  title: string;
}

export interface BoardEdge {
  from: string;
  label: string;
  to: string;
}

export interface BoardState {
  edges: BoardEdge[];
  focus: string[];
  language?: Language;
  layout: {
    direction: "left_to_right" | "top_to_bottom";
    intent: "cluster" | "compare" | "flow";
    preserve_existing: boolean;
  };
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
      getState: () => Promise<BoardState>;
      getPluginStatus: () => Promise<PluginStatus>;
      onState: (callback: (state: BoardState) => void) => () => void;
      select: (ids: string[]) => Promise<BoardState>;
    };
  }
}
