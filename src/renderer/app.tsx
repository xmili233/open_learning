import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getMessages, nodeKindLabel, resolveLanguage } from "@/messages";
import type { BoardState, Language } from "@/types";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { positionFor } from "./layout.js";

interface DrawnEdge {
  d: string;
  key: string;
  label: string;
  labelX: number;
  labelY: number;
}

function LoadingScreen() {
  return (
    <div className="grid size-full grid-rows-[4rem_1fr_2.5rem] bg-background">
      <div className="flex items-center justify-between border-b bg-surface px-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>
      <Skeleton className="m-6 rounded-xl" />
      <div className="border-t bg-surface" />
    </div>
  );
}

function Board({ language, state }: { language: Language; state: BoardState }) {
  const activeSession = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const [drawnEdges, setDrawnEdges] = useState<DrawnEdge[]>([]);

  if (activeSession.current !== state.session_id) {
    activeSession.current = state.session_id;
    positions.current.clear();
  }

  const positionedNodes = state.nodes.map((node, index) => {
    if (!positions.current.has(node.id) || !state.layout.preserve_existing) {
      positions.current.set(node.id, positionFor(index, state.layout));
    }
    return { node, position: positions.current.get(node.id)! };
  });

  const measureEdges = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const next = state.edges.flatMap((edge) => {
      const from = nodeRefs.current.get(edge.from);
      const to = nodeRefs.current.get(edge.to);
      if (!(from && to)) return [];
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const x1 = a.right - boardRect.left;
      const y1 = a.top + a.height / 2 - boardRect.top;
      const x2 = b.left - boardRect.left;
      const y2 = b.top + b.height / 2 - boardRect.top;
      return [
        {
          d: `M ${x1} ${y1} C ${x1 + 55} ${y1}, ${x2 - 55} ${y2}, ${x2} ${y2}`,
          key: `${edge.from}\u0000${edge.to}\u0000${edge.label}`,
          label: edge.label,
          labelX: (x1 + x2) / 2,
          labelY: (y1 + y2) / 2 - 8,
        },
      ];
    });
    setDrawnEdges(next);
  }, [state.edges]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measureEdges);
    window.addEventListener("resize", measureEdges);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureEdges);
    };
  }, [measureEdges, state.nodes]);

  const focused = new Set(state.focus);
  const selected = new Set(state.selection);
  const copy = getMessages(language);

  const clearSelection = (event: MouseEvent<HTMLElement>) => {
    if (event.target === event.currentTarget && state.selection.length) {
      void window.openLearning.select([]);
    }
  };

  return (
    <main
      aria-label={copy.canvasLabel}
      className="min-h-0 overflow-auto bg-background"
      onClick={clearSelection}
    >
      <div
        className="relative min-h-[660px] min-w-[1100px]"
        onClick={clearSelection}
        ref={boardRef}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <marker
              id="arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
            >
              <path className="fill-muted-foreground" d="M0,0 L8,4 L0,8 Z" />
            </marker>
          </defs>
          {drawnEdges.map((edge) => (
            <g key={edge.key}>
              <path
                className="fill-none stroke-muted-foreground stroke-[1.5px]"
                d={edge.d}
                markerEnd="url(#arrow)"
              />
              {edge.label ? (
                <text
                  className="fill-muted-foreground stroke-background stroke-[5px] text-[11px] [paint-order:stroke]"
                  textAnchor="middle"
                  x={edge.labelX}
                  y={edge.labelY}
                >
                  {edge.label}
                </text>
              ) : null}
            </g>
          ))}
        </svg>

        {positionedNodes.map(({ node, position }) => (
          <button
            aria-pressed={selected.has(node.id)}
            className={cn(
              "absolute min-h-28 w-[230px] rounded-xl border bg-surface p-4 text-left transition-[border-color,opacity,background-color] duration-150 motion-reduce:transition-none",
              "hover:border-border-strong hover:bg-surface-secondary/40",
              selected.has(node.id) && "border-interactive ring-2 ring-interactive/20",
              focused.size > 0 && !focused.has(node.id) && "opacity-30"
            )}
            key={node.id}
            onClick={(event) => {
              event.stopPropagation();
              void window.openLearning.select([node.id]);
            }}
            ref={(element) => {
              if (element) nodeRefs.current.set(node.id, element);
              else nodeRefs.current.delete(node.id);
            }}
            style={{ left: position.x, top: position.y }}
            type="button"
          >
            <span className="text-xs font-medium text-muted-foreground">
              {nodeKindLabel(language, node.kind)}
            </span>
            <span className="mt-2 block text-lg font-semibold leading-6">
              {node.title}
            </span>
            {node.body ? (
              <span className="mt-1 block whitespace-pre-wrap text-sm leading-5 text-muted-foreground">
                {node.body}
              </span>
            ) : null}
          </button>
        ))}

        {state.nodes.length === 0 ? (
          <Empty className="absolute inset-0 border-0">
            <EmptyHeader>
              <EmptyTitle>{copy.emptyTitle}</EmptyTitle>
              <EmptyDescription>{copy.emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
      </div>
    </main>
  );
}

export function App() {
  const [state, setState] = useState<BoardState>();
  const [failed, setFailed] = useState(false);

  const loadState = useCallback(() => {
    setFailed(false);
    return window.openLearning.getState().then(setState).catch(() => {
      setFailed(true);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = window.openLearning.onState((nextState) => {
      setFailed(false);
      setState(nextState);
    });
    void loadState();
    return unsubscribe;
  }, [loadState]);

  const language = resolveLanguage(state?.language ?? navigator.language);
  const copy = getMessages(language);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  if (!state && !failed) return <LoadingScreen />;

  if (failed || !state) {
    return (
      <main className="grid size-full place-items-center bg-background p-6">
        <Empty className="max-w-md border">
          <EmptyHeader>
            <EmptyTitle>{copy.loadFailedTitle}</EmptyTitle>
            <EmptyDescription>{copy.loadFailedDescription}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => void loadState()}>{copy.retry}</Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  const live = Boolean(state.session_id);
  const title = live ? state.title : copy.canvasTitle;
  const objective = state.objective || copy.objectiveFallback;

  return (
    <div className="grid size-full grid-rows-[auto_1fr_auto] bg-background">
      <header className="flex min-h-16 items-center justify-between gap-6 border-b bg-surface px-6 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {copy.brand}
          </p>
          <h1 className="truncate text-lg font-semibold leading-6">{title}</h1>
        </div>
        <Badge aria-live="polite" className="gap-2 px-2.5 py-1" variant="outline">
          <span
            aria-hidden="true"
            className={cn(
              "size-2 rounded-full",
              live ? "bg-success" : "bg-warning"
            )}
          />
          {live ? copy.connected : copy.waiting}
        </Badge>
      </header>
      <Board language={language} state={state} />
      <footer className="flex min-h-10 items-center justify-between gap-6 border-t bg-surface px-6 py-2 text-xs text-muted-foreground">
        <span className="truncate">{objective}</span>
        <span className="shrink-0">v{state.version}</span>
      </footer>
    </div>
  );
}
