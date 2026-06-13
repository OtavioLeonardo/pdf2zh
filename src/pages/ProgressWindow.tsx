import { invoke } from "@tauri-apps/api/core";
import {
  AppShell,
  Box,
  Button,
  Divider,
  Group,
  Progress,
  Stack,
  Stepper,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFolderOpen, IconSparkles } from "@tabler/icons-react";
import { STAGE_LABELS } from "../app-types";
import { useAppBootstrap } from "../tauri-state";

export function ProgressWindow() {
  const { task } = useAppBootstrap();

  const stepIndex =
    task.stage === "failed"
      ? 0
      : Math.max(
          ["queued", "extracting", "preprocessing", "translating", "rebuilding", "rendering_pdf", "completed"].indexOf(
            task.stage,
          ),
          0,
        );

  async function openDirectory(path: string | null) {
    if (!path) {
      return;
    }

    try {
      await invoke("open_output_dir", { path });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "无法打开目录",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <AppShell className="app-shell settings-shell" padding={0}>
      <AppShell.Main className="settings-main">
        <Stack gap="lg">
          <Box className="window-page-header">
            <Group gap="sm">
              <ThemeIcon size={42} radius="xl" color="cyan">
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
            <Progress color={task.stage === "failed" ? "red" : "teal"} value={task.progress} size="lg" />
            <Text c="dimmed" size="sm">
              {task.message}
            </Text>
          </Stack>

          <Stepper active={stepIndex} orientation="vertical" color="teal" iconSize={26}>
            <Stepper.Step label="解析 PDF" description="调用 MinerU 抽取 Markdown 与资源" />
            <Stepper.Step label="保护结构" description="锁定图、表、公式、代码与参考文献" />
            <Stepper.Step label="翻译正文" description="分段翻译并维持术语一致性" />
            <Stepper.Step label="回填与导出" description="恢复结构并生成 PDF" />
          </Stepper>

          <Divider />

          <Stack gap="sm">
            <Text fw={700}>导出结果</Text>
            <Text size="sm" c="dimmed">
              完成后这里会显示导出的 Markdown、PDF 和报告位置。
            </Text>

            <Text size="sm" className="result-path">
              Markdown: {task.translatedMd ?? "等待生成"}
            </Text>
            <Text size="sm" className="result-path">
              PDF: {task.translatedPdf ?? "等待生成"}
            </Text>
            <Text size="sm" className="result-path">
              Glossary: {task.outputDir ? `${task.outputDir}/glossary.tsv` : "等待生成"}
            </Text>
            <Text size="sm" className="result-path">
              MinerU Log: {task.outputDir ? `${task.outputDir}/mineru_debug.log` : "等待生成"}
            </Text>
            <Text size="sm" className="result-path">
              Report: {task.reportPath ?? "等待生成"}
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
            </Group>
          </Stack>
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
