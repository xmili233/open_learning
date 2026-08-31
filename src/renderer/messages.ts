import type { BoardNode, Language } from "@/types";

const messages = {
  en: {
    brand: "Open Learning",
    canvasLabel: "Live teaching canvas",
    canvasTitle: "Live teaching canvas",
    connected: "Codex connected",
    emptyDescription:
      "Keep this window open, then start an Open Learning lesson in Codex Voice.",
    emptyTitle: "Codex will draw here while it teaches.",
    loadFailedDescription: "Open Learning could not read the current board.",
    loadFailedTitle: "The teaching canvas is unavailable",
    objectiveFallback:
      "The canvas changes during the lesson — it is not an after-class summary.",
    retry: "Retry",
    waiting: "Waiting for Codex",
    kinds: {
      concept: "Concept",
      example: "Example",
      question: "Question",
      step: "Step",
    },
  },
  zh: {
    brand: "Open Learning",
    canvasLabel: "实时教学画板",
    canvasTitle: "实时教学画板",
    connected: "Codex 已连接",
    emptyDescription: "保持此窗口打开，然后在 Codex Voice 中开始学习。",
    emptyTitle: "Codex 会在讲解过程中使用这里。",
    loadFailedDescription: "Open Learning 无法读取当前画板。",
    loadFailedTitle: "教学画板暂时不可用",
    objectiveFallback: "画板会在学习过程中变化，而不是在课后生成总结。",
    retry: "重试",
    waiting: "等待 Codex",
    kinds: {
      concept: "概念",
      example: "例子",
      question: "问题",
      step: "步骤",
    },
  },
} satisfies Record<Language, Record<string, unknown>>;

export function resolveLanguage(language?: string): Language {
  if (language === "zh" || language?.toLowerCase().startsWith("zh")) {
    return "zh";
  }
  return "en";
}

export function getMessages(language?: string) {
  return messages[resolveLanguage(language)];
}

export function nodeKindLabel(
  language: Language,
  kind: BoardNode["kind"]
) {
  return messages[language].kinds[kind];
}
