import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  ActionIcon,
  AppShell,
  Button,
  Group,
  HoverCard,
  SegmentedControl,
  Switch,
  ThemeIcon,
  Progress,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconFileOff,
  IconFileText,
  IconHistory,
  IconHelpCircle,
  IconPlayerPlayFilled,
  IconSettings2,
  IconTimeline,
} from "@tabler/icons-react";
import {
  type TranslationRequest,
  GLOSSARY_STRATEGY_OPTIONS,
  deriveOutputDir,
  isTerminalStage,
} from "../app-types";
import {
  isTauriRuntime,
  openHistoryWindow,
  openProgressWindow,
  openSettingsWindow,
  openTutorialWindow,
  useAppBootstrap,
} from "../tauri-state";

function getStoredValue(key: string, fallback: string) {
  return localStorage.getItem(key) ?? fallback;
}

export function MainWindow() {
  const { loading, settings, task } = useAppBootstrap();
  const [inputPdf, setInputPdf] = useState(getStoredValue("pdf2zh.inputPdf", ""));
  const [glossaryPath, setGlossaryPath] = useState(getStoredValue("pdf2zh.glossaryPath", ""));
  const [enableTranslation, setEnableTranslation] = useState(getStoredValue("pdf2zh.enableTranslation", "true") !== "false");
  const [parallelTranslation, setParallelTranslation] = useState(getStoredValue("pdf2zh.parallelTranslation", "false") === "true");
  const [translationConcurrency, setTranslationConcurrency] = useState(getStoredValue("pdf2zh.translationConcurrency", "3"));
  const [isDragActive, setIsDragActive] = useState(false);
  const lastTaskUpdateRef = useRef(0);
  const hasPdf = inputPdf.trim().length > 0;
  const outputDir = inputPdf ? deriveOutputDir(inputPdf) : "";

  useEffect(() => {
    localStorage.setItem("pdf2zh.inputPdf", inputPdf);
    localStorage.setItem("pdf2zh.glossaryPath", glossaryPath);
    localStorage.setItem("pdf2zh.enableTranslation", String(enableTranslation));
    localStorage.setItem("pdf2zh.parallelTranslation", String(parallelTranslation));
    localStorage.setItem("pdf2zh.translationConcurrency", translationConcurrency);
    localStorage.removeItem("pdf2zh.outputDir");
  }, [enableTranslation, glossaryPath, inputPdf, parallelTranslation, translationConcurrency]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let isMounted = true;

    const setup = async () => {
      const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
        if (!isMounted) {
          return;
        }

        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDragActive(true);
          return;
        }

        if (event.payload.type === "leave") {
          setIsDragActive(false);
          return;
        }

        if (event.payload.type === "drop") {
          setIsDragActive(false);
          const pdfPath = event.payload.paths.find((path) => /\.pdf$/i.test(path));

          if (!pdfPath) {
            notifications.show({
              color: "gray",
              title: "不是 PDF 文件",
              message: "拖入的文件里没有可用的 PDF。",
            });
            return;
          }

          setInputPdf(pdfPath);

          notifications.show({
            color: "appleBlue",
            title: "已接收 PDF",
            message: "论文已经放进翻译流程，接下来可以直接开始。",
          });
        }
      });

      return unlisten;
    };

    let unlistenRef: (() => void) | undefined;

    void setup().then((unlisten) => {
      unlistenRef = unlisten;
    });

    return () => {
      isMounted = false;
      unlistenRef?.();
    };
  }, []);

  useEffect(() => {
    if (!task.updatedAt || !isTerminalStage(task.stage)) {
      return;
    }

    if (task.updatedAt <= lastTaskUpdateRef.current) {
      return;
    }

    lastTaskUpdateRef.current = task.updatedAt;

    if (task.type === "result") {
      notifications.show({
        color: "appleBlue",
        title: enableTranslation ? "翻译完成" : "提取完成",
        message: enableTranslation
          ? task.translatedPdf
            ? "Markdown、Typst 和 PDF 都已经导出。"
            : "Markdown 和 Typst 已导出，PDF 未生成。"
          : "MinerU 文本提取已完成，raw.md 已导出。",
        icon: <IconCheck size={16} />,
      });
    }

    if (task.type === "error") {
      notifications.show({
        color: "dark",
        title: "翻译失败",
        message: task.message,
      });
    }
  }, [task]);

  const glossaryStrategyLabel = useMemo(
    () =>
      GLOSSARY_STRATEGY_OPTIONS.find((item) => item.value === settings.glossaryStrategy)?.label ??
      GLOSSARY_STRATEGY_OPTIONS[0].label,
    [settings.glossaryStrategy],
  );

  async function pickPdf() {
    const selected = await open({
      directory: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      multiple: false,
    });

    if (typeof selected === "string") {
      setInputPdf(selected);
    }
  }

  async function pickGlossary() {
    const selected = await open({
      directory: false,
      filters: [{ name: "Glossary", extensions: ["txt", "csv", "tsv", "md"] }],
      multiple: false,
    });

    if (typeof selected === "string") {
      setGlossaryPath(selected);
    }
  }

  function clearPdfSelection() {
    if (!hasPdf) {
      return;
    }
    setInputPdf("");

    notifications.show({
      color: "gray",
      title: "已取消 PDF",
      message: "当前已选论文已清空，可以重新拖入或重新选择。",
    });
  }

  async function handleSubmit() {
    if (!inputPdf || !outputDir || !settings.mineruApiUrl || (enableTranslation && (!settings.apiKey || !settings.model))) {
      notifications.show({
        color: "gray",
        title: "信息还不完整",
        message: enableTranslation
          ? "请先选择 PDF，并在设置窗口里填写 MinerU API、模型 API Key。"
          : "请先选择 PDF，并在设置窗口里填写 MinerU API。",
      });
      return;
    }

    try {
      await invoke<string>("start_translation", {
        request: {
          inputPdf,
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKey,
          glossaryModel: settings.glossaryModel,
          glossaryStrategy: settings.glossaryStrategy,
          mineruApiUrl: settings.mineruApiUrl,
          mineruApiKey: settings.mineruApiKey || null,
          outputDir,
          glossaryPath: glossaryPath || null,
          enableTranslation,
          parallelTranslation: enableTranslation ? parallelTranslation : false,
          translationConcurrency: enableTranslation && parallelTranslation ? Number(translationConcurrency) : 1,
        } satisfies TranslationRequest,
      });

      notifications.show({
        color: "appleBlue",
        title: enableTranslation ? "开始翻译" : "开始提取",
        message: enableTranslation
          ? "后台流程已经启动，详细阶段可以在独立任务窗口里查看。"
          : "后台 MinerU 提取已经启动，完成后会直接导出 raw.md。",
      });
    } catch (error) {
      notifications.show({
        color: "dark",
        title: "启动失败",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <AppShell className="workspace-shell" padding={0}>
      <AppShell.Main className="workspace-main">
        <div className="workspace-root">
          <section className="workspace-stage">
            <div className={`workspace-dropzone ${isDragActive ? "workspace-dropzone-active" : ""}`}>
              <div className="workspace-dropzone-inner">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text className="workspace-title">PDF</Text>
                    <Text className="workspace-hint">拖入文件，或用上方按钮选择。</Text>
                  </div>
                </Group>

                <div className="workspace-toolbar">
                  <Button
                    variant="filled"
                    leftSection={<IconFileText size={16} />}
                    onClick={pickPdf}
                  >
                    选择 PDF
                  </Button>
                  <Button variant="default" onClick={pickGlossary}>
                    术语表
                  </Button>
                  <Group gap="xs" className="workspace-toolbar-actions">
                    <ActionIcon variant="subtle" size="lg" onClick={() => void openSettingsWindow()} aria-label="打开设置窗口">
                      <IconSettings2 size={18} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="lg" onClick={() => void openProgressWindow()} aria-label="打开任务详情窗口">
                      <IconTimeline size={18} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="lg" onClick={() => void openHistoryWindow()} aria-label="打开翻译历史窗口">
                      <IconHistory size={18} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="lg" onClick={() => void openTutorialWindow()} aria-label="打开教程">
                      <IconHelpCircle size={18} />
                    </ActionIcon>
                  </Group>
                </div>

                {hasPdf ? (
                  <Group justify="flex-end">
                    <Button
                      variant="subtle"
                      color="appleBlue"
                      leftSection={<IconFileOff size={16} />}
                      onClick={clearPdfSelection}
                    >
                      取消 PDF
                    </Button>
                  </Group>
                ) : null}

                <div className={`workspace-file-panel ${hasPdf ? "workspace-file-panel-ready" : ""}`}>
                  <div className="workspace-file-surface">
                    <ThemeIcon
                      size={68}
                      radius={20}
                      variant={isDragActive ? "filled" : "light"}
                      color={isDragActive || hasPdf ? "appleBlue" : "gray"}
                      className="workspace-file-icon"
                    >
                      <IconFileText size={30} />
                    </ThemeIcon>

                    <div className="workspace-file-copy">
                      <Text className="workspace-file-headline">
                        {isDragActive ? "松开即可导入 PDF" : hasPdf ? "PDF 已就绪" : "拖入 PDF 到这里"}
                      </Text>
                      <Text className="workspace-file-subline">
                        {isDragActive
                          ? "系统会立即接收文件并自动补全输出目录。"
                          : hasPdf
                            ? "已经选中一个可翻译文件，可以直接开始。"
                            : "也可以使用上方的“选择 PDF”按钮导入文件。"}
                      </Text>
                    </div>
                  </div>

                  <div className="workspace-file-meta">
                    <Text className="workspace-file-path">{inputPdf || "未选择 PDF"}</Text>
                    <div className="workspace-file-badges">
                      <span className={`workspace-file-badge ${isDragActive ? "workspace-file-badge-active" : ""}`}>
                        {isDragActive ? "拖拽中" : hasPdf ? "已载入" : "等待文件"}
                      </span>
                      <span className="workspace-file-badge workspace-file-badge-muted">PDF</span>
                    </div>
                  </div>
                </div>

                <div className="workspace-runtime-strip">
                  <span>{settings.provider.toUpperCase()}</span>
                  <span>{settings.model}</span>
                  <span>{settings.mineruApiUrl ? "MinerU 已配置" : "MinerU 未配置"}</span>
                  <span>{glossaryStrategyLabel}</span>
                </div>

                <div className="workspace-translation-options">
                  <div className="workspace-translation-options-head">
                    <Group gap="sm" wrap="nowrap">
                      <Switch
                        checked={enableTranslation}
                        onChange={(event) => setEnableTranslation(event.currentTarget.checked)}
                        label="翻译正文"
                        size="md"
                      />
                      <Switch
                        checked={parallelTranslation}
                        onChange={(event) => setParallelTranslation(event.currentTarget.checked)}
                        label="并行翻译"
                        size="md"
                        disabled={!enableTranslation}
                      />
                      <HoverCard width={300} shadow="md" withArrow position="right">
                        <HoverCard.Target>
                          <ActionIcon
                            variant="light"
                            radius="xl"
                            size="md"
                            aria-label="查看并行翻译风险说明"
                            className="workspace-help-dot"
                          >
                            <IconHelpCircle size={15} />
                          </ActionIcon>
                        </HoverCard.Target>
                        <HoverCard.Dropdown>
                          <Text size="sm" className="workspace-help-copy">
                            只会并行正文翻译阶段，MinerU 提取和 PDF 渲染仍是串行。开启后通常更快，但术语统一和上下文衔接可能略差，建议先用 2 或 3 并发试跑。
                          </Text>
                        </HoverCard.Dropdown>
                      </HoverCard>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {enableTranslation ? "关闭后只运行 MinerU 提取，直接输出 raw.md。" : "当前只提取文本，不会调用模型翻译。"}
                    </Text>
                  </div>

                  {enableTranslation && parallelTranslation ? (
                    <Group gap="sm" align="center" className="workspace-concurrency-row">
                      <Text size="sm" fw={600} c="dark">
                        并发数
                      </Text>
                      <SegmentedControl
                        value={translationConcurrency}
                        onChange={setTranslationConcurrency}
                        data={[
                          { label: "2", value: "2" },
                          { label: "3", value: "3" },
                          { label: "4", value: "4" },
                        ]}
                        size="sm"
                      />
                    </Group>
                  ) : null}
                </div>

                <Group justify="space-between" align="center">
                  <Text c="dimmed" size="sm">
                    {loading ? "正在读取设置..." : task.message}
                  </Text>
                  <Button
                    leftSection={<IconPlayerPlayFilled size={16} />}
                    size="md"
                    onClick={handleSubmit}
                    loading={task.isRunning}
                  >
                    {enableTranslation ? "开始翻译" : "开始提取"}
                  </Button>
                </Group>
              </div>
            </div>
          </section>
        </div>

        <footer className="workspace-statusbar">
          <div className="workspace-statusbar-main">
            <Text className="workspace-status-label">{task.stage === "failed" ? "失败" : "任务进度"}</Text>
            <Progress value={task.progress} color={task.stage === "failed" ? "dark" : "appleBlue"} className="workspace-progress" />
          </div>
          <Group gap="md" wrap="nowrap">
            <Text size="sm" c="dimmed">
              {task.progress}%
            </Text>
            <Button variant="subtle" size="compact-sm" onClick={() => void openProgressWindow()}>
              详情
            </Button>
          </Group>
        </footer>
      </AppShell.Main>
    </AppShell>
  );
}
