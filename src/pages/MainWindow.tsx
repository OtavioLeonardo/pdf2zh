import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  ActionIcon,
  AppShell,
  Button,
  Group,
  ThemeIcon,
  Progress,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconFileOff,
  IconFileText,
  IconHelpCircle,
  IconPlayerPlayFilled,
  IconSettings2,
  IconTimeline,
} from "@tabler/icons-react";
import {
  type TranslationRequest,
  GLOSSARY_STRATEGY_OPTIONS,
  deriveOutputDir,
} from "../app-types";
import { openProgressWindow, openSettingsWindow, openTutorialWindow, useAppBootstrap } from "../tauri-state";

function getStoredValue(key: string, fallback: string) {
  return localStorage.getItem(key) ?? fallback;
}

export function MainWindow() {
  const { loading, settings, task } = useAppBootstrap();
  const [inputPdf, setInputPdf] = useState(getStoredValue("pdf2zh.inputPdf", ""));
  const [glossaryPath, setGlossaryPath] = useState(getStoredValue("pdf2zh.glossaryPath", ""));
  const [outputDir, setOutputDir] = useState(getStoredValue("pdf2zh.outputDir", ""));
  const [isDragActive, setIsDragActive] = useState(false);
  const lastTaskUpdateRef = useRef(0);
  const hasPdf = inputPdf.trim().length > 0;

  useEffect(() => {
    localStorage.setItem("pdf2zh.inputPdf", inputPdf);
    localStorage.setItem("pdf2zh.glossaryPath", glossaryPath);
    localStorage.setItem("pdf2zh.outputDir", outputDir);
  }, [glossaryPath, inputPdf, outputDir]);

  useEffect(() => {
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
              color: "yellow",
              title: "不是 PDF 文件",
              message: "拖入的文件里没有可用的 PDF。",
            });
            return;
          }

          setInputPdf(pdfPath);

          if (!outputDir || outputDir.endsWith("-translated")) {
            setOutputDir(deriveOutputDir(pdfPath));
          }

          notifications.show({
            color: "teal",
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
  }, [outputDir]);

  useEffect(() => {
    if (!task.updatedAt) {
      return;
    }

    if (task.updatedAt <= lastTaskUpdateRef.current) {
      return;
    }

    lastTaskUpdateRef.current = task.updatedAt;

    if (task.type === "result") {
      notifications.show({
        color: "teal",
        title: "翻译完成",
        message: task.translatedPdf ? "Markdown 和 PDF 都已经导出。" : "Markdown 已导出，PDF 未生成。",
        icon: <IconCheck size={16} />,
      });
    }

    if (task.type === "error") {
      notifications.show({
        color: "red",
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

      if (!outputDir || outputDir.endsWith("-translated")) {
        setOutputDir(deriveOutputDir(selected));
      }
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

  async function pickOutputDir() {
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: outputDir || undefined,
    });

    if (typeof selected === "string") {
      setOutputDir(selected);
    }
  }

  function clearPdfSelection() {
    if (!hasPdf) {
      return;
    }

    const derivedCurrentOutputDir = deriveOutputDir(inputPdf);
    setInputPdf("");

    if (outputDir === derivedCurrentOutputDir) {
      setOutputDir("");
    }

    notifications.show({
      color: "gray",
      title: "已取消 PDF",
      message: "当前已选论文已清空，可以重新拖入或重新选择。",
    });
  }

  async function handleSubmit() {
    if (!inputPdf || !settings.apiKey || !outputDir || !settings.model || !settings.mineruApiUrl) {
      notifications.show({
        color: "yellow",
        title: "信息还不完整",
        message: "请先选择 PDF，并在设置窗口里填写 MinerU API、模型 API Key。",
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
        } satisfies TranslationRequest,
      });

      notifications.show({
        color: "blue",
        title: "开始翻译",
        message: "后台流程已经启动，详细阶段可以在独立任务窗口里查看。",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "启动失败",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <AppShell className="workspace-shell" padding={0}>
      <AppShell.Main className="workspace-main">
        <div className="workspace-root">
          <aside className="workspace-sidebar">
            <div className="workspace-sidebar-section">
              <Text className="workspace-section-label">任务</Text>
              <Button
                fullWidth
                variant="filled"
                justify="space-between"
                rightSection={<IconFileText size={16} />}
                onClick={pickPdf}
              >
                选择 PDF
              </Button>
              <Button fullWidth variant="default" justify="space-between" onClick={pickGlossary}>
                术语表
              </Button>
              <Button fullWidth variant="default" justify="space-between" onClick={pickOutputDir}>
                输出目录
              </Button>
            </div>

            <div className="workspace-sidebar-section">
              <Text className="workspace-section-label">窗口</Text>
              <Button fullWidth variant="subtle" justify="space-between" onClick={() => void openSettingsWindow()}>
                设置
              </Button>
              <Button fullWidth variant="subtle" justify="space-between" onClick={() => void openProgressWindow()}>
                任务详情
              </Button>
              <Button fullWidth variant="subtle" justify="space-between" onClick={() => void openTutorialWindow()}>
                使用教程
              </Button>
            </div>
          </aside>

          <section className="workspace-stage">
            <div className={`workspace-dropzone ${isDragActive ? "workspace-dropzone-active" : ""}`}>
              <div className="workspace-dropzone-inner">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text className="workspace-title">PDF</Text>
                    <Text className="workspace-hint">拖入文件，或用左侧按钮选择。</Text>
                  </div>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" size="lg" onClick={() => void openTutorialWindow()} aria-label="打开教程">
                      <IconHelpCircle size={18} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="lg" onClick={() => void openProgressWindow()} aria-label="打开任务详情窗口">
                      <IconTimeline size={18} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="lg" onClick={() => void openSettingsWindow()} aria-label="打开设置窗口">
                      <IconSettings2 size={18} />
                    </ActionIcon>
                  </Group>
                </Group>

                {hasPdf ? (
                  <Group justify="flex-end">
                    <Button
                      variant="subtle"
                      color="gray"
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
                      color={isDragActive ? "teal" : hasPdf ? "cyan" : "gray"}
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
                            : "也可以使用左侧的“选择 PDF”按钮导入文件。"}
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

                <div className="workspace-fields">
                  <TextInput
                    label="术语表"
                    placeholder="可选"
                    readOnly
                    value={glossaryPath}
                    classNames={{ input: "workspace-input" }}
                  />
                  <TextInput
                    label="输出目录"
                    placeholder="未设置"
                    readOnly
                    value={outputDir}
                    classNames={{ input: "workspace-input" }}
                  />
                </div>

                <div className="workspace-runtime-strip">
                  <span>{settings.provider.toUpperCase()}</span>
                  <span>{settings.model}</span>
                  <span>{settings.mineruApiUrl ? "MinerU 已配置" : "MinerU 未配置"}</span>
                  <span>{glossaryStrategyLabel}</span>
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
                    开始翻译
                  </Button>
                </Group>
              </div>
            </div>
          </section>
        </div>

        <footer className="workspace-statusbar">
          <div className="workspace-statusbar-main">
            <Text className="workspace-status-label">{task.stage === "failed" ? "失败" : "任务进度"}</Text>
            <Progress value={task.progress} color={task.stage === "failed" ? "red" : "teal"} className="workspace-progress" />
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
