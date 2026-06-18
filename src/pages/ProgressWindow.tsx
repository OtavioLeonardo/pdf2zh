import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AppShell,
  Box,
  Button,
  Divider,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlayerStopFilled, IconRefresh, IconFileTypePdf, IconFolderOpen, IconSparkles } from "@tabler/icons-react";
import { isTerminalStage, STAGE_LABELS } from "../app-types";
import { cancelTranslation, openHistoryWindow, rerenderPdf, useAppBootstrap } from "../tauri-state";

function joinOutputPath(outputDir: string | null, name: string) {
  if (!outputDir) {
    return null;
  }

  return `${outputDir.replace(/[\\/]+$/, "")}/${name}`;
}

const STAGE_DETAILS: Record<string, string> = {
  queued: "任务已经进入队列，正在准备本地与远程依赖。",
  extracting: "正在调用 MinerU 解析 PDF，这一步通常最容易因为网络或接口限流变慢。",
  preprocessing: "正在保护公式、图表、代码块，并整理术语上下文。",
  translating: "正在分段翻译正文；如果卡住，多半是模型响应较慢或某一段重试中。",
  rebuilding: "正在把保护过的结构回填到译文，并写出 Markdown。",
  rendering_pdf: "正在调用 Pandoc 和 Tectonic 重排 PDF，首次通常会比较久。",
  completed: "任务已经完成，可以直接打开目录查看结果。",
  cancelled: "任务已由你手动取消，当前结果会尽量保留。",
  failed: "任务已失败，建议查看当前阶段说明和输出目录里的日志。",
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}小时 ${minutes}分`;
  }

  if (minutes > 0) {
    return `${minutes}分 ${seconds}秒`;
  }

  return `${seconds}秒`;
}

function formatRelative(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 5) {
    return "刚刚";
  }
  if (seconds < 60) {
    return `${seconds} 秒前`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时前`;
}

export function ProgressWindow() {
  const { task } = useAppBootstrap();
  const [now, setNow] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);
  const [rerendering, setRerendering] = useState(false);
  const resolvedRawMd = task.rawMd ?? joinOutputPath(task.outputDir, "raw.md");
  const resolvedTranslatedMd = task.translatedMd ?? joinOutputPath(task.outputDir, "translated.md");
  const resolvedTranslatedPdf = task.translatedPdf ?? joinOutputPath(task.outputDir, "translated.pdf");
  const resolvedGlossary = joinOutputPath(task.outputDir, "glossary.tsv");
  const resolvedMineruLog = joinOutputPath(task.outputDir, "mineru_debug.log");
  const resolvedReport = task.reportPath ?? joinOutputPath(task.outputDir, "translation_report.json");
  const translationEnabled = Boolean(task.translatedMd || task.translatedPdf);

  const stepIndex =
    task.stage === "failed" || task.stage === "cancelled"
      ? 0
      : Math.max(
          ["queued", "extracting", "preprocessing", "translating", "rebuilding", "rendering_pdf", "completed"].indexOf(
            task.stage,
          ),
          0,
        );
  const stageDetail = STAGE_DETAILS[task.stage] ?? task.message;
  const elapsedMs = task.startedAt ? Math.max(0, (task.isRunning ? now : task.updatedAt || now) - task.startedAt) : 0;
  const sinceUpdateMs = task.updatedAt ? Math.max(0, now - task.updatedAt) : 0;
  const estimatedRemaining = useMemo(() => {
    if (!task.isRunning || !task.startedAt || task.progress < 8 || isTerminalStage(task.stage)) {
      return null;
    }

    const elapsed = Math.max(now - task.startedAt, 1000);
    const estimatedTotal = elapsed / Math.max(task.progress / 100, 0.01);
    const remaining = estimatedTotal - elapsed;
    if (!Number.isFinite(remaining) || remaining <= 30_000) {
      return null;
    }
    return remaining;
  }, [now, task.isRunning, task.progress, task.startedAt, task.stage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function openDirectory(path: string | null) {
    if (!path) {
      return;
    }

    try {
      await invoke("open_output_dir", { path });
    } catch (error) {
      notifications.show({
        color: "dark",
        title: "无法打开目录",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleRerenderPdf() {
    if (!task.outputDir) {
      return;
    }

    setRerendering(true);
    try {
      await rerenderPdf(task.outputDir);
      notifications.show({
        color: "appleBlue",
        title: "已开始重新生成 PDF",
        message: "这次不会重跑 MinerU 和翻译，只会重新走 PDF 排版。",
      });
    } catch (error) {
      notifications.show({
        color: "dark",
        title: "无法重新生成 PDF",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setRerendering(false);
    }
  }

  async function handleCancelTask() {
    setCancelling(true);
    try {
      await cancelTranslation();
      notifications.show({
        color: "gray",
        title: "任务已取消",
        message: "后台翻译进程已经收到终止指令。",
      });
    } catch (error) {
      notifications.show({
        color: "dark",
        title: "无法取消任务",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <AppShell className="app-shell settings-shell" padding={0}>
      <AppShell.Main className="settings-main">
        <Stack gap="lg">
          <Box className="window-page-header">
            <Group gap="sm">
              <ThemeIcon size={42} radius="xl" color="appleBlue" variant="light">
                <IconSparkles size={22} />
              </ThemeIcon>
              <Box>
                <Title order={2}>任务详情</Title>
                <Text c="dimmed" size="sm">
                  独立窗口展示详细阶段和导出结果，主页面只保留一条进度条。
                </Text>
              </Box>
            </Group>
          </Box>

          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={700}>{STAGE_LABELS[task.stage]}</Text>
              <Text c="dimmed" size="sm">
                {task.progress}%
              </Text>
            </Group>
            <Progress color={task.stage === "failed" ? "dark" : "appleBlue"} value={task.progress} size="lg" />
            <Text c="dimmed" size="sm">
              {task.message}
            </Text>
            <Text size="sm">{stageDetail}</Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <div className="task-metric">
              <Text className="task-metric-label">已运行</Text>
              <Text className="task-metric-value">{task.startedAt ? formatDuration(elapsedMs) : "尚未开始"}</Text>
            </div>
            <div className="task-metric">
              <Text className="task-metric-label">最近更新</Text>
              <Text className="task-metric-value">
                {task.updatedAt ? (task.isRunning ? formatRelative(sinceUpdateMs) : "已停止更新") : "暂无更新"}
              </Text>
            </div>
            <div className="task-metric">
              <Text className="task-metric-label">预计剩余</Text>
              <Text className="task-metric-value">{estimatedRemaining ? formatDuration(estimatedRemaining) : "暂无法估算"}</Text>
            </div>
          </SimpleGrid>

          <Group>
            <Button
              leftSection={<IconPlayerStopFilled size={16} />}
              color="dark"
              variant="light"
              disabled={!task.isRunning}
              loading={cancelling}
              onClick={() => void handleCancelTask()}
            >
              取消任务
            </Button>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="default"
              disabled={!task.outputDir || !task.translatedMd || task.isRunning || !task.canRetry}
              loading={rerendering}
              onClick={() => void handleRerenderPdf()}
            >
              重新生成 PDF
            </Button>
          </Group>

          <Stepper active={stepIndex} orientation="vertical" color="appleBlue" iconSize={26}>
            <Stepper.Step label="解析 PDF" description="调用 MinerU 抽取 Markdown 与资源" />
            <Stepper.Step label="保护结构" description="锁定图、表、公式、代码与参考文献" />
            <Stepper.Step
              label="翻译正文"
              description={translationEnabled ? "分段翻译并维持术语一致性" : "本次未开启翻译，跳过模型调用"}
            />
            <Stepper.Step
              label="回填与导出"
              description={translationEnabled ? "恢复结构并生成 PDF" : "直接导出 raw.md 与 MinerU 资源"}
            />
          </Stepper>

          <Divider />

          <Stack gap="sm">
            <Text fw={700}>导出结果</Text>
            <Text size="sm" c="dimmed">
              完成后这里会显示导出的 Markdown、PDF 和报告位置。
            </Text>

            <Text size="sm" className="result-path">
              Raw Markdown: {resolvedRawMd ?? "等待生成"}
            </Text>
            <Text size="sm" className="result-path">
              Markdown: {resolvedTranslatedMd ?? "等待生成"}
            </Text>
            <Text size="sm" className="result-path">
              PDF: {resolvedTranslatedPdf ?? "等待生成"}
            </Text>
            <Text size="sm" className="result-path">
              Glossary: {resolvedGlossary ?? "等待生成"}
            </Text>
            <Text size="sm" className="result-path">
              MinerU Log: {resolvedMineruLog ?? "等待生成"}
            </Text>
            <Text size="sm" className="result-path">
              Report: {resolvedReport ?? "等待生成"}
            </Text>

            <Group>
              <Button
                leftSection={<IconFolderOpen size={16} />}
                variant="light"
                disabled={!task.outputDir}
                onClick={() => void openDirectory(task.outputDir)}
              >
                打开输出目录
              </Button>
              <Button
                leftSection={<IconFileTypePdf size={16} />}
                variant="default"
                disabled={!task.outputDir || !task.translatedMd || task.isRunning || !task.canRetry}
                loading={rerendering}
                onClick={() => void handleRerenderPdf()}
              >
                重新生成 PDF
              </Button>
              <Button variant="subtle" onClick={() => void openHistoryWindow()}>
                去翻译历史
              </Button>
            </Group>
          </Stack>
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
