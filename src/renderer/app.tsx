import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { BoardState, Language, PluginStatus } from "@/types";
import {
  ArrowLeft,
  Check,
  Copy,
  Mic,
  Puzzle,
  RefreshCw,
} from "lucide-react";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { positionFor } from "./layout.js";

const MARKETPLACE_URL = "https://github.com/xmili233/open_learning";
const ONBOARDING_KEY = "open-learning:onboarding-complete";

interface DrawnEdge {
  d: string;
  key: string;
  label: string;
  labelX: number;
  labelY: number;
}

function usePluginStatus() {
  const [status, setStatus] = useState<PluginStatus>({ state: "checking" });

  const check = useCallback(async () => {
    const next = await window.openLearning.getPluginStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), 5_000);
    return () => window.clearInterval(timer);
  }, [check]);

  return { check, status };
}

function LoadingScreen() {
  return (
    <div className="size-full overflow-auto bg-background">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </main>
    </div>
  );
}

function PluginInstallScreen({
  language,
  onCheck,
  status,
}: {
  language: Language;
  onCheck: () => Promise<void>;
  status: PluginStatus;
}) {
  const copy = getMessages(language);
  const problem =
    status.state === "codex_missing"
      ? { description: copy.missingCodexDescription, title: copy.missingCodexTitle }
      : status.state === "disabled"
        ? { description: copy.disabledDescription, title: copy.disabledTitle }
        : status.state === "error"
          ? { description: copy.pluginErrorDescription, title: copy.pluginErrorTitle }
          : null;

  const copyUrl = async () => {
    try {
      await window.openLearning.copyMarketplaceUrl();
      toast.success(copy.copied);
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  return (
    <div className="size-full overflow-auto bg-background">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16 sm:py-24">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold leading-10">{copy.installTitle}</h1>
          <p className="max-w-xl text-base leading-6 text-muted-foreground">
            {copy.installDescription}
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-6">
            <ol className="flex flex-col gap-5">
              {[copy.openPluginsStep, copy.addMarketplaceStep, copy.installPluginStep].map(
                (step, index) => (
                  <li className="flex items-start gap-3" key={step}>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="pt-1 text-sm leading-5">{step}</span>
                  </li>
                )
              )}
            </ol>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {copy.gitAddressLabel}
              </p>
              <code className="overflow-x-auto rounded-lg border bg-surface-secondary px-3 py-2.5 text-sm">
                {MARKETPLACE_URL}
              </code>
            </div>

            <Button className="self-start" onClick={() => void copyUrl()} size="lg">
              <Copy data-icon="inline-start" />
              {copy.copyGitAddress}
            </Button>

          </CardContent>
        </Card>

        {problem ? (
          <div className="flex items-start justify-between gap-4 rounded-xl border bg-surface p-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{problem.title}</p>
              <p className="text-sm leading-5 text-muted-foreground">{problem.description}</p>
            </div>
            <Button onClick={() => void onCheck()} size="sm" variant="outline">
              <RefreshCw data-icon="inline-start" />
              {copy.checkAgain}
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function InstallSuccessDialog({
  language,
  onStart,
  open,
}: {
  language: Language;
  onStart: () => void;
  open: boolean;
}) {
  const copy = getMessages(language);

  return (
    <Dialog open={open}>
      <DialogContent
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-surface-secondary text-success">
          <Check aria-hidden="true" className="size-5" />
        </div>
        <DialogHeader>
          <DialogTitle>{copy.successTitle}</DialogTitle>
          <DialogDescription>{copy.successDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onStart} size="lg">
            {copy.startUsing}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadyScreen({ language }: { language: Language }) {
  const copy = getMessages(language);

  return (
    <div className="size-full overflow-auto bg-background">
      <main className="mx-auto flex min-h-full w-full max-w-xl items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <Badge
            className="mb-7 gap-2 bg-surface px-3 py-1.5 text-sm font-normal"
            variant="outline"
          >
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            {copy.readyStatus}
          </Badge>

          <h1 className="text-3xl font-semibold leading-10">{copy.readyTitle}</h1>
          <p className="mt-3 max-w-md text-base leading-6 text-muted-foreground">
            {copy.readyDescription}
          </p>

          <div className="mt-8 flex max-w-full items-center gap-2 rounded-full bg-surface-secondary px-4 py-2.5 text-sm">
            <Mic aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">“{copy.readyPrompt}”</span>
          </div>
          <p className="mt-4 text-sm leading-5 text-muted-foreground">{copy.readyHint}</p>
        </div>
      </main>
    </div>
  );
}

function LessonCard({
  language,
  onOpen,
  state,
}: {
  language: Language;
  onOpen: () => void;
  state: BoardState;
}) {
  const copy = getMessages(language);

  return (
    <article className="flex flex-col gap-3">
      <Card className="aspect-video overflow-hidden py-0">
        <button
          aria-label={`${copy.openLesson}: ${state.title}`}
          className="flex size-full flex-col gap-3 p-5 text-left transition-colors hover:bg-surface-secondary/40 motion-reduce:transition-none"
          onClick={onOpen}
          type="button"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-surface-secondary">
              <Puzzle aria-hidden="true" className="size-5" />
            </div>
            <Badge variant="secondary">{copy.currentLesson}</Badge>
          </div>
          <div className="grid flex-1 grid-cols-2 content-center gap-2">
            {state.nodes.slice(0, 4).map((node) => (
              <div className="rounded-lg border bg-surface p-2" key={node.id}>
                <p className="truncate text-xs font-medium">{node.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {nodeKindLabel(language, node.kind)}
                </p>
              </div>
            ))}
          </div>
        </button>
      </Card>
      <div className="flex flex-col gap-1 px-1">
        <h2 className="truncate font-medium">{state.title}</h2>
        <p className="truncate text-sm text-muted-foreground">
          {state.objective || copy.objectiveFallback}
        </p>
      </div>
    </article>
  );
}

function LibraryScreen({
  failed,
  language,
  onOpenBoard,
  onRetry,
  state,
}: {
  failed: boolean;
  language: Language;
  onOpenBoard: () => void;
  onRetry: () => void;
  state?: BoardState;
}) {
  const copy = getMessages(language);

  if (!failed && state && !state.session_id) {
    return <ReadyScreen language={language} />;
  }

  return (
    <div className="size-full overflow-auto bg-background">
      <main className="mx-auto flex w-full max-w-[60rem] flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold leading-8">{copy.libraryTitle}</h1>
          <p className="text-sm leading-5 text-muted-foreground">{copy.libraryDescription}</p>
        </div>

        {failed ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>{copy.loadFailedTitle}</EmptyTitle>
              <EmptyDescription>{copy.loadFailedDescription}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={onRetry}>{copy.retry}</Button>
            </EmptyContent>
          </Empty>
        ) : !state ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="aspect-video rounded-xl" />
          </div>
        ) : state ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <LessonCard language={language} onOpen={onOpenBoard} state={state} />
          </div>
        ) : null}
      </main>
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
      return [{
        d: `M ${x1} ${y1} C ${x1 + 55} ${y1}, ${x2 - 55} ${y2}, ${x2} ${y2}`,
        key: `${edge.from}\u0000${edge.to}\u0000${edge.label}`,
        label: edge.label,
        labelX: (x1 + x2) / 2,
        labelY: (y1 + y2) / 2 - 8,
      }];
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
            <marker id="arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
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
            <span className="mt-2 block text-lg font-semibold leading-6">{node.title}</span>
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

function BoardScreen({
  language,
  onBack,
  state,
}: {
  language: Language;
  onBack: () => void;
  state: BoardState;
}) {
  const copy = getMessages(language);
  const objective = state.objective || copy.objectiveFallback;

  return (
    <div className="grid size-full grid-rows-[auto_1fr_auto] bg-background">
      <header className="flex min-h-16 items-center justify-between gap-6 border-b bg-surface px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button aria-label={copy.backToLibrary} onClick={onBack} size="icon-sm" variant="ghost">
            <ArrowLeft />
          </Button>
          <h1 className="truncate text-lg font-semibold leading-6">{state.title}</h1>
        </div>
        <Badge aria-live="polite" className="gap-2 px-2.5 py-1" variant="outline">
          <span aria-hidden="true" className="size-2 rounded-full bg-success" />
          {copy.connected}
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

export function App() {
  const { check, status } = usePluginStatus();
  const [state, setState] = useState<BoardState>();
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<"board" | "library">("library");
  const [onboardingComplete, setOnboardingComplete] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) === "true"
  );

  const loadState = useCallback(() => {
    setFailed(false);
    return window.openLearning.getState().then(setState).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    const unsubscribe = window.openLearning.onState((nextState) => {
      setFailed(false);
      setState(nextState);
    });
    void loadState();
    return unsubscribe;
  }, [loadState]);

  useEffect(() => {
    if (status.state !== "not_installed" && status.state !== "disabled") return;
    localStorage.removeItem(ONBOARDING_KEY);
    setOnboardingComplete(false);
    setView("library");
  }, [status.state]);

  const language = resolveLanguage(state?.language ?? navigator.language);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  if (status.state === "checking") return <LoadingScreen />;

  if (status.state !== "installed") {
    return <PluginInstallScreen language={language} onCheck={check} status={status} />;
  }

  if (view === "board" && state?.session_id) {
    return <BoardScreen language={language} onBack={() => setView("library")} state={state} />;
  }

  return (
    <>
      <LibraryScreen
        failed={failed}
        language={language}
        onOpenBoard={() => setView("board")}
        onRetry={() => void loadState()}
        state={state}
      />
      <InstallSuccessDialog
        language={language}
        onStart={() => {
          localStorage.setItem(ONBOARDING_KEY, "true");
          setOnboardingComplete(true);
        }}
        open={!onboardingComplete}
      />
    </>
  );
}
