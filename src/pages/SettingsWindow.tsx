import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  AppShell,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPlugConnected, IconSettings2 } from "@tabler/icons-react";
import {
  type AppSettings,
  type GlossaryStrategy,
  type Provider,
  GLOSSARY_STRATEGY_OPTIONS,
  PROVIDER_MODELS,
  PROVIDER_MODEL_OPTIONS,
} from "../app-types";
import { saveAppSettings, testLlmConnection, testMineruConnection, useAppBootstrap } from "../tauri-state";
import { SecretInput } from "../components/SecretInput";

export function SettingsWindow() {
  const { loading, settings } = useAppBootstrap();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [testingMineru, setTestingMineru] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const modelOptions = useMemo(() => PROVIDER_MODEL_OPTIONS[draft.provider], [draft.provider]);
  const glossaryModelOptions = useMemo(() => PROVIDER_MODEL_OPTIONS[draft.provider], [draft.provider]);

  useEffect(() => {
    if (!modelOptions.some((option) => option.value === draft.model)) {
      setDraft((current) => ({ ...current, model: PROVIDER_MODELS[current.provider] }));
    }
  }, [draft.model, modelOptions]);

  useEffect(() => {
    if (!glossaryModelOptions.some((option) => option.value === draft.glossaryModel)) {
      setDraft((current) => ({ ...current, glossaryModel: PROVIDER_MODELS[current.provider] }));
    }
  }, [draft.glossaryModel, glossaryModelOptions]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveAppSettings(draft);
      notifications.show({
        color: "teal",
        title: "设置已保存",
        message: "主窗口和任务窗口已经同步到最新设置。",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "保存失败",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestLlm() {
    setTestingLlm(true);
    try {
      const result = await testLlmConnection(draft);
      notifications.show({
        color: "teal",
        title: "LLM API 测试成功",
        message: result.message,
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "LLM API 测试失败",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setTestingLlm(false);
    }
  }

  async function handleTestMineru() {
    setTestingMineru(true);
    try {
      const result = await testMineruConnection(draft);
      notifications.show({
        color: "teal",
        title: "MinerU 测试成功",
        message: result.message,
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "MinerU 测试失败",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setTestingMineru(false);
    }
  }

  return (
    <AppShell className="app-shell settings-shell" padding={0}>
      <AppShell.Main className="settings-main">
        <Stack gap="lg">
          <Box className="window-page-header">
            <Group gap="sm">
              <ThemeIcon size={42} radius="xl" color="teal">
                <IconSettings2 size={22} />
              </ThemeIcon>
              <Box>
                <Title order={2}>设置</Title>
                <Text c="dimmed" size="sm">
                  独立设置窗口，供主页面按钮和 macOS 的设置入口共同打开。
                </Text>
              </Box>
            </Group>
          </Box>

          <Stack gap="md">
            <Select
              label="模型提供方"
              data={[
                { label: "OpenAI", value: "openai" },
                { label: "Claude", value: "claude" },
                { label: "DeepSeek", value: "deepseek" },
              ]}
              value={draft.provider}
              disabled={loading}
              onChange={(value) =>
                setDraft((current) => {
                  const provider = (value as Provider | null) ?? "openai";
                  return {
                    ...current,
                    provider,
                    model: PROVIDER_MODELS[provider],
                    glossaryModel: PROVIDER_MODELS[provider],
                  };
                })
              }
            />

            <Select
              label="模型名"
              data={modelOptions}
              value={draft.model}
              disabled={loading}
              allowDeselect={false}
              searchable
              nothingFoundMessage="没有匹配的模型"
              onChange={(value) =>
                setDraft((current) => ({ ...current, model: value ?? PROVIDER_MODELS[current.provider] }))
              }
            />

            <SecretInput
              label="模型 API Key"
              placeholder="填写 OpenAI、Claude 或 DeepSeek 的 API Key"
              value={draft.apiKey}
              disabled={loading}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((current) => ({ ...current, apiKey: value }));
              }}
            />

            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                直接测试当前模型配置是否可用，不需要先保存。
              </Text>
              <Button
                variant="light"
                leftSection={testingLlm ? <Loader size={14} /> : <IconPlugConnected size={16} />}
                loading={testingLlm}
                disabled={loading}
                onClick={() => void handleTestLlm()}
              >
                测试 LLM API
              </Button>
            </Group>

            <Divider />

            <Select
              label="术语预处理方案"
              description="默认是混合方案，现代语义和术语约束会一起用。"
              data={GLOSSARY_STRATEGY_OPTIONS}
              value={draft.glossaryStrategy}
              disabled={loading}
              allowDeselect={false}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  glossaryStrategy: (value as GlossaryStrategy | null) ?? "hybrid",
                }))
              }
            />

            <Select
              label="术语表专用模型"
              description="可以和正文翻译模型分开设置。"
              data={glossaryModelOptions}
              value={draft.glossaryModel}
              disabled={loading}
              allowDeselect={false}
              searchable
              nothingFoundMessage="没有匹配的模型"
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  glossaryModel: value ?? PROVIDER_MODELS[current.provider],
                }))
              }
            />

            <Divider />

            <TextInput
              label="MinerU API URL"
              description="请填写 MinerU 精准解析的本地上传接口，固定使用 `/api/v4/file-urls/batch`。应用会自动申请上传链接、上传 PDF、轮询结果并下载 zip。"
              placeholder="例如 https://mineru.net/api/v4/file-urls/batch"
              value={draft.mineruApiUrl}
              disabled={loading}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((current) => ({ ...current, mineruApiUrl: value }));
              }}
            />

            <SecretInput
              label="MinerU API Key"
              placeholder="填写 MinerU API 管理页面创建的 Token"
              value={draft.mineruApiKey}
              disabled={loading}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((current) => ({ ...current, mineruApiKey: value }));
              }}
            />

            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                测试当前 MinerU 地址是否可访问，不需要先保存。
              </Text>
              <Button
                variant="light"
                leftSection={testingMineru ? <Loader size={14} /> : <IconPlugConnected size={16} />}
                loading={testingMineru}
                disabled={loading}
                onClick={() => void handleTestMineru()}
              >
                测试 MinerU
              </Button>
            </Group>
          </Stack>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {saving ? "正在保存..." : "保存后所有窗口会立刻同步。"}
            </Text>
            <Group>
              <Button variant="default" onClick={() => void getCurrentWindow().close()}>
                关闭
              </Button>
              <Button onClick={() => void handleSave()} loading={saving}>
                保存设置
              </Button>
            </Group>
          </Group>
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
