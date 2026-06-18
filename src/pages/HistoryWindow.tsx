import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  AppShell,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBook2, IconFileTypePdf, IconFolderOpen, IconHistory, IconRefresh } from "@tabler/icons-react";
import { type HistoryEntry } from "../app-types";
import { getTranslationHistory, openProgressWindow, rerenderPdf } from "../tauri-state";

function formatUpdatedAt(timestamp: number) {
  if (!timestamp) {
    return "未知时间";
  }

  return new Date(timestamp).toLocaleString("zh-CN");
}

export function HistoryWindow() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [rerenderingEntryId, setRerenderingEntryId] = useState<string | null>(null);

  useEffect(() => {
    const loadEntries = async () => {
      try {
        setEntries(await getTranslationHistory());
      } catch {
        setEntries([]);
      }
    };

    void loadEntries();

    const unlistenPromise = listen("translation-event", () => {
      void loadEntries();
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  async function openPath(path: string | null) {
    if (!path) {
      return;
    }

    try {
      await invoke("open_output_dir", { path });
    } catch (error) {
      notifications.show({
        color: "dark",
        title: "无法打开",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleRerenderPdf(entry: HistoryEntry) {
    if (!entry.translatedMd) {
      notifications.show({
        color: "gray",
        title: "暂时无法重新生成",
        message: "这个记录里还没有 translated.md，暂时不能直接重排 PDF。",
      });
      return;
    }

    setRerenderingEntryId(entry.id);

    try {
      await rerenderPdf(entry.outputDir);
      await openProgressWindow();
      notifications.show({
        color: "appleBlue",
        title: "已开始重新生成 PDF",
        message: "这次不会重新翻译，只会重新走 PDF 排版导出。",
      });
    } catch (error) {
      notifications.show({
        color: "dark",
        title: "无法重新生成 PDF",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setRerenderingEntryId(null);
    }
  }

  return (
    <AppShell className="app-shell settings-shell" padding={0}>
      <AppShell.Main className="settings-main">
        <Stack gap="lg">
          <Box className="window-page-header">
            <Group gap="sm">
              <ThemeIcon size={42} radius="xl" color="appleBlue" variant="light">
                <IconHistory size={22} />
              </ThemeIcon>
              <Box>
                <Title order={2}>翻译历史</Title>
                <Text c="dimmed" size="sm">
                  统一展示 Documents/pdf2zh 目录下的翻译记录，方便重新打开 PDF 和输出目录。
                </Text>
              </Box>
            </Group>
          </Box>

          {entries === null ? (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          ) : entries.length === 0 ? (
            <Card radius="lg" padding="lg" withBorder>
              <Group gap="sm">
                <ThemeIcon size={34} radius="xl" color="appleBlue" variant="light">
                  <IconBook2 size={18} />
                </ThemeIcon>
                <Box>
                  <Text fw={700}>还没有历史记录</Text>
                  <Text size="sm" c="dimmed">
                    完成一次翻译后，这里会自动列出结果。
                  </Text>
                </Box>
              </Group>
            </Card>
          ) : (
            <Stack gap="sm">
              {entries.map((entry) => (
                <Card key={entry.id} radius="lg" padding="lg" withBorder className="history-card">
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Box>
                        <Text fw={700}>{entry.title}</Text>
                        <Text size="sm" c="dimmed">
                          {entry.statusLabel} · {formatUpdatedAt(entry.updatedAt)}
                        </Text>
                        {entry.inputFile ? (
                          <Text size="sm" c="dimmed" mt={4}>
                            {entry.inputFile.split(/[\\/]/).pop()}
                          </Text>
                        ) : null}
                      </Box>
                      <Text size="sm" c={entry.pdfGenerated ? "appleBlue" : "dimmed"}>
                        {entry.pdfGenerated ? "PDF 已生成" : entry.translatedMd ? "仅 Markdown" : entry.rawMd ? "仅 raw.md" : "处理中"}
                      </Text>
                    </Group>

                    <Group>
                      <Button
                        leftSection={<IconFolderOpen size={16} />}
                        variant="light"
                        onClick={() => void openPath(entry.outputDir)}
                      >
                        打开目录
                      </Button>
                      <Button
                        leftSection={<IconFileTypePdf size={16} />}
                        variant="default"
                        disabled={!entry.translatedPdf}
                        onClick={() => void openPath(entry.translatedPdf)}
                      >
                        打开 PDF
                      </Button>
                      <Button
                        leftSection={<IconRefresh size={16} />}
                        variant="default"
                        disabled={!entry.translatedMd}
                        loading={rerenderingEntryId === entry.id}
                        onClick={() => void handleRerenderPdf(entry)}
                      >
                        重新生成 PDF
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
