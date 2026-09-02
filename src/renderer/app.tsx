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
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  Check,
  Copy,
  Mic,
  Puzzle,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const MARKETPLACE_URL = "https://github.com/xmili233/open_learning";
const ONBOARDING_KEY = "open-learning:onboarding-complete";

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

function Formula({ source }: { source: string }) {
  const display = source.startsWith("$$");
  const value = source.slice(display ? 2 : 1, display ? -2 : -1);
  const html = katex.renderToString(value, {
    displayMode: display,
    maxExpand: 200,
    maxSize: 8,
    output: "htmlAndMathml",
    strict: "error",
    throwOnError: false,
    trust: false,
  });
  return (
    <span
      className={cn(display && "block overflow-x-auto py-2")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function InkText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g).map((part, index) =>
        part.startsWith("$") ? <Formula key={index} source={part} /> : <span key={index}>{part}</span>
      )}
    </>
  );
}

function MarkedText({ marks, text }: { marks: string[]; text: string }) {
  if (!marks.length) return <InkText text={text} />;
  const markPattern = new RegExp(
    `(${marks.map((mark) => mark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g"
  );
  return (
    <>
      {text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g).map((part, index) => {
        if (part.startsWith("$")) {
          const formula = <Formula source={part} />;
          return marks.some((mark) => part.includes(mark))
            ? <mark className="paper-marker" key={index}>{formula}</mark>
            : <span key={index}>{formula}</span>;
        }
        return part.split(markPattern).map((piece, pieceIndex) =>
          marks.includes(piece)
            ? <mark className="paper-marker" key={`${index}-${pieceIndex}`}>{piece}</mark>
            : <span key={`${index}-${pieceIndex}`}>{piece}</span>
        );
      })}
    </>
  );
}

function FocusArrow() {
  return (
    <svg
      aria-hidden="true"
      className="absolute -left-12 top-0 size-10 text-ink-ai"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 48 32"
    >
      <path d="M3 18 C 14 8, 26 26, 42 15" />
      <path d="M34 9 L 43 15 L 33 21" />
    </svg>
  );
}

function InkNode({
  focused,
  index,
  language,
  node,
  selected,
  sessionId,
}: {
  focused: boolean;
  index: number;
  language: Language;
  node: BoardState["nodes"][number];
  selected: boolean;
  sessionId: string;
}) {
  const copy = getMessages(language);
  const [answer, setAnswer] = useState(node.input ?? "");
  useEffect(() => setAnswer(node.input ?? ""), [node.id, node.input]);
  const select = () => void window.openLearning.select([node.id]);
  const ink = node.owner === "student" ? "text-ink-student" : "text-ink-ai";
  const dimmed = !focused && node.kind !== "problem";

  const content = (
    <>
      {node.title ? (
        <span className="mr-2 underline decoration-wavy decoration-1 underline-offset-4">{node.title}</span>
      ) : null}
      <MarkedText marks={node.marks} text={node.body} />
    </>
  );

  return (
    <section
      aria-label={nodeKindLabel(language, node.kind)}
      className={cn(
        "relative font-hand text-2xl leading-9 transition-opacity duration-150 motion-reduce:transition-none",
        ink,
        dimmed && "opacity-55",
        selected && "paper-selected"
      )}
    >
      {focused ? <FocusArrow /> : null}
      {node.kind === "example" ? (
        <button
          aria-pressed={selected}
          className="w-full rounded-xl border-2 border-dashed border-current px-5 py-3 text-left"
          onClick={(event) => { event.stopPropagation(); select(); }}
          type="button"
        >
          {content}
          {node.steps.slice(0, node.revealed).map((step, stepIndex) => (
            <span className="mt-2 block pl-6" key={step}>{stepIndex + 1}. <InkText text={step} /></span>
          ))}
        </button>
      ) : (
        <>
          <button
            aria-pressed={selected}
            className={cn("relative w-full text-left", node.kind === "step" && "pl-8")}
            onClick={(event) => { event.stopPropagation(); select(); }}
            type="button"
          >
            {node.kind === "step" ? <span className="absolute left-0">{index}.</span> : null}
            {content}
          </button>
          {node.kind === "question" && node.check ? (
            <form
              className="mt-3 flex items-end gap-3 pl-8"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                void window.openLearning.answer({
                  input: answer,
                  node_id: node.id,
                  session_id: sessionId,
                }).catch(() => toast.error(copy.answerFailed));
              }}
            >
              <input
                aria-label={copy.answerPlaceholder}
                className="min-w-0 flex-1 border-0 border-b-2 border-ink-student bg-transparent px-2 py-1 font-hand text-2xl text-ink-student shadow-none outline-none focus-visible:ring-0"
                onChange={(event) => setAnswer(event.target.value)}
                placeholder={node.check.type === "choice" ? node.check.options?.join(" / ") : copy.answerPlaceholder}
                value={answer}
              />
              <Button
                aria-label={copy.checkAnswer}
                disabled={!answer.trim()}
                size="icon-sm"
                type="submit"
                variant="ghost"
              >
                <Check data-icon="inline-start" />
              </Button>
              <span aria-live="polite" className="min-w-24 text-sm font-sans text-foreground">
                {node.result === "correct" ? copy.answerCorrect : node.result === "wrong" ? copy.answerWrong : ""}
              </span>
            </form>
          ) : null}
        </>
      )}
    </section>
  );
}

function Board({ language, state }: { language: Language; state: BoardState }) {
  const copy = getMessages(language);
  let stepIndex = 0;

  return (
    <main
      aria-label={`${copy.canvasLabel}: ${state.title}`}
      className="size-full overflow-auto bg-paper"
      onClick={(event) => {
        if (event.target === event.currentTarget) void window.openLearning.tapBlank();
      }}
    >
      {state.nodes.length ? (
        <div
          className="mx-auto flex min-h-full w-full max-w-[60rem] flex-col gap-4 px-16 py-16 max-md:px-8 max-sm:px-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) void window.openLearning.tapBlank();
          }}
        >
          {state.nodes.filter((node) => !node.collapsed).map((node) => {
            if (node.kind === "step") stepIndex += 1;
            return (
              <InkNode
                focused={state.focus.includes(node.id)}
                index={stepIndex}
                key={node.id}
                language={language}
                node={node}
                selected={state.selection.includes(node.id)}
                sessionId={state.session_id!}
              />
            );
          })}
        </div>
      ) : (
        <Empty className="min-h-full border-0">
          <EmptyHeader>
            <EmptyTitle>{copy.emptyTitle}</EmptyTitle>
            <EmptyDescription>{copy.emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  );
}

function BoardScreen({
  language,
  state,
}: {
  language: Language;
  state: BoardState;
}) {
  return <Board language={language} state={state} />;
}

function ProductApp() {
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
      if (nextState.session_id) setView("board");
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
    return <BoardScreen language={language} state={state} />;
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

export function App() {
  return <ProductApp />;
}
