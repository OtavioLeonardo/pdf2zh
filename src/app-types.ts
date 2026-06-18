export type Provider = "openai" | "claude" | "deepseek";
export type GlossaryStrategy = "hybrid" | "llm_only" | "pyate_only" | "keybert_only";
export type Stage =
  | "queued"
  | "extracting"
  | "preprocessing"
  | "translating"
  | "rebuilding"
  | "rendering_pdf"
  | "completed"
  | "cancelled"
  | "failed";

export type TranslationRequest = {
  inputPdf: string;
  provider: Provider;
  model: string;
  apiKey: string;
  glossaryModel?: string | null;
  glossaryStrategy?: GlossaryStrategy | null;
  mineruApiUrl: string;
  mineruApiKey?: string | null;
  outputDir: string;
  glossaryPath?: string | null;
  enableTranslation?: boolean | null;
  parallelTranslation?: boolean | null;
  translationConcurrency?: number | null;
};

export type TranslationEvent = {
  taskId?: string;
  type: "status" | "result" | "error";
  stage: Stage;
  progress: number;
  message: string;
  outputDir?: string;
  rawMd?: string | null;
  translatedMd?: string;
  translatedTyp?: string | null;
  translatedPdf?: string | null;
  glossaryPath?: string | null;
  reportPath?: string;
  retriedSegments?: number;
  report?: Record<string, unknown>;
  startedAt?: number | null;
};

export type AppSettings = {
  provider: Provider;
  model: string;
  apiKey: string;
  glossaryStrategy: GlossaryStrategy;
  glossaryModel: string;
  mineruApiUrl: string;
  mineruApiKey: string;
};

export type ServiceTestRequest = {
  provider: Provider;
  model: string;
  apiKey: string;
  mineruApiUrl: string;
  mineruApiKey: string;
};

export type ServiceTestResult = {
  success: boolean;
  message: string;
};

export type GlossaryRuntimeStatus = {
  pyateAvailable: boolean;
  spacyAvailable: boolean;
  keybertAvailable: boolean;
  sentenceTransformersAvailable: boolean;
  recommendedReady: boolean;
  message: string;
};

export type HistoryEntry = {
  id: string;
  title: string;
  outputDir: string;
  inputFile: string | null;
  rawMd: string | null;
  translatedMd: string | null;
  translatedTyp: string | null;
  translatedPdf: string | null;
  reportPath: string | null;
  mineruLogPath: string | null;
  glossaryPath: string | null;
  updatedAt: number;
  startedAt: string | null;
  provider: string | null;
  model: string | null;
  pdfGenerated: boolean;
  statusLabel: string;
};

export type TaskSnapshot = {
  taskId: string | null;
  type: "status" | "result" | "error";
  stage: Stage;
  progress: number;
  message: string;
  isRunning: boolean;
  outputDir: string | null;
  rawMd: string | null;
  translatedMd: string | null;
  translatedTyp: string | null;
  translatedPdf: string | null;
  reportPath: string | null;
  retriedSegments: number | null;
  startedAt: number | null;
  canRetry: boolean;
  updatedAt: number;
};

export type AppBootstrap = {
  settings: AppSettings;
  task: TaskSnapshot;
};

export type TutorialContent = {
  markdown: string;
  sourceLabel: string;
};

export const PROVIDER_MODELS: Record<Provider, string> = {
  openai: "gpt-5.4-mini",
  claude: "claude-sonnet-4-6",
  deepseek: "deepseek-v4-flash",
};

export const DEFAULT_SETTINGS: AppSettings = {
  provider: "openai",
  model: PROVIDER_MODELS.openai,
  apiKey: "",
  glossaryStrategy: "llm_only",
  glossaryModel: PROVIDER_MODELS.openai,
  mineruApiUrl: "https://mineru.net/api/v4/file-urls/batch",
  mineruApiKey: "",
};

export const DEFAULT_TASK: TaskSnapshot = {
  taskId: null,
  type: "status",
  stage: "queued",
  progress: 0,
  message: "选择论文 PDF，然后点击开始翻译。",
  isRunning: false,
  outputDir: null,
  rawMd: null,
  translatedMd: null,
  translatedTyp: null,
  translatedPdf: null,
  reportPath: null,
  retriedSegments: null,
  startedAt: null,
  canRetry: false,
  updatedAt: 0,
};

export const PROVIDER_MODEL_OPTIONS: Record<Provider, Array<{ label: string; value: string }>> = {
  openai: [
    { label: "GPT-5.5", value: "gpt-5.5" },
    { label: "GPT-5.4", value: "gpt-5.4" },
    { label: "GPT-5.4 Mini", value: "gpt-5.4-mini" },
  ],
  claude: [
    { label: "Claude Opus 4.8", value: "claude-opus-4-8" },
    { label: "Claude Sonnet 4.6", value: "claude-sonnet-4-6" },
    { label: "Claude Haiku 4.5", value: "claude-haiku-4-5" },
  ],
  deepseek: [
    { label: "DeepSeek V4 Flash", value: "deepseek-v4-flash" },
    { label: "DeepSeek V4 Pro", value: "deepseek-v4-pro" },
  ],
};

export const GLOSSARY_STRATEGY_OPTIONS: Array<{ label: string; value: GlossaryStrategy }> = [
  { label: "只用 LLM（默认）", value: "llm_only" },
  { label: "混合方案（KeyBERT + pyate + LLM）", value: "hybrid" },
  { label: "只用 pyate", value: "pyate_only" },
  { label: "只用 KeyBERT", value: "keybert_only" },
];

export const STAGE_ORDER: Stage[] = [
  "queued",
  "extracting",
  "preprocessing",
  "translating",
  "rebuilding",
  "rendering_pdf",
  "completed",
];

export const STAGE_LABELS: Record<Stage, string> = {
  queued: "排队中",
  extracting: "解析 PDF",
  preprocessing: "保护结构",
  translating: "翻译正文",
  rebuilding: "回填结构",
  rendering_pdf: "生成 PDF",
  completed: "完成",
  cancelled: "已取消",
  failed: "失败",
};

export function isTerminalStage(stage: Stage) {
  return stage === "completed" || stage === "cancelled" || stage === "failed";
}

export function isTaskRunning(event: Pick<TranslationEvent, "type" | "stage">) {
  return event.type !== "result" && event.type !== "error" && !isTerminalStage(event.stage);
}

export function deriveOutputDir(pdfPath: string) {
  const normalized = pdfPath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  const fileName = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const baseName = fileName.replace(/\.pdf$/i, "");
  return `~/Documents/pdf2zh/${baseName}-translated`;
}

export function taskSnapshotFromEvent(event: TranslationEvent, previousTask?: TaskSnapshot | null): TaskSnapshot {
  const isRunning = isTaskRunning(event);
  const isSameTask = previousTask?.taskId != null && event.taskId != null && previousTask.taskId === event.taskId;
  const startedAt = isSameTask
    ? previousTask?.startedAt ?? event.startedAt ?? Date.now()
    : event.startedAt ?? Date.now();
  const canRetry = isTerminalStage(event.stage);

  return {
    taskId: event.taskId ?? null,
    type: event.type,
    stage: event.stage,
    progress: event.progress,
    message: event.message,
    isRunning,
    outputDir: event.outputDir ?? (isSameTask ? previousTask?.outputDir ?? null : null),
    rawMd: event.rawMd ?? (isSameTask ? previousTask?.rawMd ?? null : null),
    translatedMd: event.translatedMd ?? (isSameTask ? previousTask?.translatedMd ?? null : null),
    translatedTyp: event.translatedTyp ?? (isSameTask ? previousTask?.translatedTyp ?? null : null),
    translatedPdf: event.translatedPdf ?? (isSameTask ? previousTask?.translatedPdf ?? null : null),
    reportPath: event.reportPath ?? (isSameTask ? previousTask?.reportPath ?? null : null),
    retriedSegments: event.retriedSegments ?? (isSameTask ? previousTask?.retriedSegments ?? null : null),
    startedAt,
    canRetry,
    updatedAt: Date.now(),
  };
}
