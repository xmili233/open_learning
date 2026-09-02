import type { BoardNode, Language } from "@/types";

const messages = {
  en: {
    answerCorrect: "Equivalent",
    answerFailed: "The answer could not be checked.",
    answerPlaceholder: "Write here…",
    answerWrong: "Try this step again",
    addMarketplaceStep: "Choose Add Marketplace.",
    backToLibrary: "Learning space",
    brand: "Open Learning",
    canvasLabel: "Live teaching canvas",
    canvasTitle: "Live teaching canvas",
    checkAgain: "Check again",
    checkAnswer: "Check answer",
    checkingPlugin: "Checking plugin status",
    connected: "Codex connected",
    copied: "Git address copied",
    copyFailed: "The Git address could not be copied.",
    copyGitAddress: "Copy Git address",
    currentLesson: "Current lesson",
    disabledDescription: "Enable Open Learning in Codex Plugins, then return here.",
    disabledTitle: "The plugin is installed but disabled",
    emptyDescription:
      "Keep this window open, then start an Open Learning lesson in Codex Voice.",
    emptyTitle: "Codex will draw here while it teaches.",
    gitAddressLabel: "Marketplace Git address",
    installDescription:
      "Add the Open Learning Marketplace in Codex. This app will detect the plugin automatically.",
    installPluginStep: "Paste the Git address, then install Open Learning.",
    installTitle: "Install the Codex plugin to get started",
    installed: "Plugin installed",
    libraryDescription:
      "Lessons created by Codex appear here while Open Learning is running.",
    libraryTitle: "Learning space",
    loadFailedDescription: "Open Learning could not read the current board.",
    loadFailedTitle: "The teaching canvas is unavailable",
    missingCodexDescription:
      "Install or update the Codex desktop app, then check again.",
    missingCodexTitle: "Codex was not found on this Mac",
    objectiveFallback:
      "The canvas changes during the lesson — it is not an after-class summary.",
    openLesson: "Open lesson",
    openPluginsStep: "In Codex, open Plugins.",
    pluginErrorDescription:
      "Open Learning could not read the local plugin list. Codex may need to be updated.",
    pluginErrorTitle: "Plugin status is unavailable",
    pluginWaiting: "Waiting for installation",
    readyDescription: "Open Codex, turn on Voice, and say what you want to learn.",
    readyHint: "The canvas opens and updates automatically during the lesson.",
    readyPrompt: "Use Open Learning to teach me Bayesian updating.",
    readyStatus: "Ready",
    readyTitle: "You're ready to learn in Codex",
    selectLine: "Select line",
    retry: "Retry",
    startUsing: "Start using",
    successDescription:
      "Start a new Codex task so it can load the Open Learning skill and canvas tools.",
    successTitle: "Open Learning is ready",
    waiting: "Waiting for Codex",
    kinds: {
      concept: "Concept",
      example: "Example",
      problem: "Your problem",
      question: "Question",
      step: "Step",
    },
  },
  zh: {
    answerCorrect: "等价",
    answerFailed: "暂时无法检查答案。",
    answerPlaceholder: "写在这里…",
    answerWrong: "再看这一步",
    addMarketplaceStep: "点击“添加 Marketplace”。",
    backToLibrary: "学习空间",
    brand: "Open Learning",
    canvasLabel: "实时教学画板",
    canvasTitle: "实时教学画板",
    checkAgain: "重新检查",
    checkAnswer: "检查答案",
    checkingPlugin: "正在检查插件状态",
    connected: "Codex 已连接",
    copied: "Git 地址已复制",
    copyFailed: "无法复制 Git 地址。",
    copyGitAddress: "复制 Git 地址",
    currentLesson: "当前学习",
    disabledDescription: "请在 Codex Plugins 中启用 Open Learning，然后返回这里。",
    disabledTitle: "插件已安装但未启用",
    emptyDescription: "保持此窗口打开，然后在 Codex Voice 中开始学习。",
    emptyTitle: "Codex 会在讲解过程中使用这里。",
    gitAddressLabel: "Marketplace Git 地址",
    installDescription:
      "在 Codex 中添加 Open Learning Marketplace。本应用会自动检测插件安装状态。",
    installPluginStep: "粘贴 Git 地址，然后安装 Open Learning。",
    installTitle: "安装 Codex 插件即可使用",
    installed: "插件已安装",
    libraryDescription: "Codex 创建的学习内容会在 Open Learning 运行时出现在这里。",
    libraryTitle: "学习空间",
    loadFailedDescription: "Open Learning 无法读取当前画板。",
    loadFailedTitle: "教学画板暂时不可用",
    missingCodexDescription: "请先安装或更新 Codex 桌面应用，然后重新检查。",
    missingCodexTitle: "没有在这台 Mac 上找到 Codex",
    objectiveFallback: "画板会在学习过程中变化，而不是在课后生成总结。",
    openLesson: "打开学习",
    openPluginsStep: "在 Codex 中打开 Plugins。",
    pluginErrorDescription: "Open Learning 无法读取本地插件列表，Codex 可能需要更新。",
    pluginErrorTitle: "暂时无法获取插件状态",
    pluginWaiting: "等待安装",
    readyDescription: "打开 Codex 并开启语音，告诉它你想学什么。",
    readyHint: "学习开始后，画板会自动打开并实时更新。",
    readyPrompt: "用 Open Learning 教我贝叶斯更新。",
    readyStatus: "已就绪",
    readyTitle: "现在可以在 Codex 中开始学习了",
    selectLine: "选择这一行",
    retry: "重试",
    startUsing: "开始使用",
    successDescription: "请新建一个 Codex 任务，以加载 Open Learning Skill 和画板工具。",
    successTitle: "Open Learning 已安装",
    waiting: "等待 Codex",
    kinds: {
      concept: "概念",
      example: "例子",
      problem: "你的题",
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
