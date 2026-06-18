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
  type GlossaryRuntimeStatus,
  GLOSSARY_STRATEGY_OPTIONS,
  PROVIDER_MODELS,
  PROVIDER_MODEL_OPTIONS,
  TYPST_TABLE_MODE_OPTIONS,
} from "../app-types";
import { inspectGlossaryRuntime, saveAppSettings, testLlmConnection, testMineruConnection, useAppBootstrap } from "../tauri-state";
import { SecretInput } from "../components/SecretInput";

const DEFAULT_MINERU_API_URL = "https://mineru.net/api/v4/file-urls/batch";

export function SettingsWindow() {
  const { loading, settings } = useAppBootstrap();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [testingMineru, setTestingMineru] = useState(false);
  const [checkingGlossaryRuntime, setCheckingGlossaryRuntime] = useState(false);
  const [glossaryRuntimeStatus, setGlossaryRuntimeStatus] = useState<GlossaryRuntimeStatus | null>(null);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setDraft(settings);
    }
  }, [hasUnsavedChanges, settings]);

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
      const savedSettings = await saveAppSettings(draft);
      setDraft(savedSettings);
      setHasUnsavedChanges(false);
      notifications.show({
        color: "appleBlue",
        title: "设置已保存",
        message: "主窗口和任务窗口已经同步到最新设置。",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        color: "dark",
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
        color: "appleBlue",
        title: "LLM API 测试成功",
        message: result.message,
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        color: "dark",
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
        color: "appleBlue",
        title: "MinerU 测试成功",
        message: result.message,
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        color: "dark",
        title: "MinerU 测试失败",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setTestingMineru(false);
    }
  }

  async function handleInspectGlossaryRuntime() {
    setCheckingGlossaryRuntime(true);
    try {
      const result = await inspectGlossaryRuntime();
      setGlossaryRuntimeStatus(result);
      notifications.show({
        color: result.recommendedReady ? "appleBlue" : "gray",
        title: result.recommendedReady ? "术语增强环境已就绪" : "术语增强环境未完全就绪",
        message: result.message,
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        color: "dark",
        title: "检测失败",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setCheckingGlossaryRuntime(false);
    }
  }

  return (
    <AppShell className="app-shell settings-shell" padding={0}>
      <AppShell.Main className="settings-main">
        <Stack gap="lg">
          <Box className="window-page-header">
            <Group gap="sm">
              <ThemeIcon size={42} radius="xl" color="appleBlue" variant="light">
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
              onChange={(value) => {
                setHasUnsavedChanges(true);
                setDraft((current) => {
                  const provider = (value as Provider | null) ?? "openai";
                  return {
                    ...current,
                    provider,
                    model: PROVIDER_MODELS[provider],
                    glossaryModel: PROVIDER_MODELS[provider],
                  };
                });
              }}
            />

            <Select
              label="模型名"
              data={modelOptions}
              value={draft.model}
              disabled={loading}
              allowDeselect={false}
              searchable
              nothingFoundMessage="没有匹配的模型"
              onChange={(value) => {
                setHasUnsavedChanges(true);
                setDraft((current) => ({ ...current, model: value ?? PROVIDER_MODELS[current.provider] }));
              }}
            />

            <SecretInput
              label="模型 API Key"
              placeholder="填写 OpenAI、Claude 或 DeepSeek 的 API Key"
              helpTitle="去哪里申请模型 API Key？"
              helpDescription="选择你正在使用的模型提供方，在对应控制台创建 API Key 后粘贴到这里。"
              helpSteps={[
                "DeepSeek：打开 DeepSeek 开放平台，登录后进入 API Keys 创建密钥。",
                "OpenAI / Claude：分别到 OpenAI Platform 或 Anthropic Console 的 API Keys 页面创建。",
                "创建后建议只复制一次并妥善保存，之后可以回到这里测试 LLM API。",
              ]}
              helpLinks={[
                { label: "打开 DeepSeek API Keys", url: "https://platform.deepseek.com/api_keys" },
                { label: "打开 OpenAI API Keys", url: "https://platform.openai.com/api-keys" },
                { label: "打开 Anthropic Console", url: "https://console.anthropic.com/settings/keys" },
              ]}
              value={draft.apiKey}
              disabled={loading}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setHasUnsavedChanges(true);
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
              description="默认使用 LLM 术语预处理；需要更强术语增强时，可切换到混合方案或单独方案。"
              data={GLOSSARY_STRATEGY_OPTIONS}
              value={draft.glossaryStrategy}
              disabled={loading}
              allowDeselect={false}
              onChange={(value) => {
                setHasUnsavedChanges(true);
                setDraft((current) => ({
                  ...current,
                  glossaryStrategy: (value as GlossaryStrategy | null) ?? "llm_only",
                }));
              }}
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
              onChange={(value) => {
                setHasUnsavedChanges(true);
                setDraft((current) => ({
                  ...current,
                  glossaryModel: value ?? PROVIDER_MODELS[current.provider],
                }));
              }}
              />

            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                只有需要更强术语抽取时才建议安装 pyate / KeyBERT。
              </Text>
              <Button
                variant="light"
                leftSection={checkingGlossaryRuntime ? <Loader size={14} /> : <IconPlugConnected size={16} />}
                loading={checkingGlossaryRuntime}
                disabled={loading}
                onClick={() => void handleInspectGlossaryRuntime()}
              >
                检测术语增强环境
              </Button>
            </Group>

            {glossaryRuntimeStatus ? (
              <Text size="sm" c={glossaryRuntimeStatus.recommendedReady ? "green" : "dimmed"}>
                {glossaryRuntimeStatus.message}
              </Text>
            ) : null}

            <Divider />

            <TextInput
              label="MinerU API URL"
              description="请填写 MinerU 精准解析的本地上传接口，固定使用 `/api/v4/file-urls/batch`。应用会自动申请上传链接、上传 PDF、轮询结果并下载 zip。"
              placeholder="例如 https://mineru.net/api/v4/file-urls/batch"
              value={draft.mineruApiUrl}
              disabled={loading}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setHasUnsavedChanges(true);
                setDraft((current) => ({ ...current, mineruApiUrl: value }));
              }}
            />

            <SecretInput
              label="MinerU API Key"
              placeholder="填写 MinerU API 管理页面创建的 Token"
              helpTitle="去哪里申请 MinerU API Key？"
              helpDescription={`默认接口地址就是 ${DEFAULT_MINERU_API_URL}，通常不需要修改。`}
              helpSteps={[
                "打开 MinerU 官网并登录账号。",
                "进入 API 管理、开发者或 Token 页面，创建一个新的 API Token。",
                "把 Token 粘贴到这里，再点击下方“测试 MinerU”确认可用。",
              ]}
              helpLinks={[{ label: "打开 MinerU 官网", url: "https://mineru.net" }]}
              value={draft.mineruApiKey}
              disabled={loading}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setHasUnsavedChanges(true);
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

            <Divider />

            <Select
              label="复杂表格输出"
              description="渲染表格会尽量输出可编辑 Typst 表格；图片模式更稳，适合特别复杂的跨行跨列表格。"
              data={TYPST_TABLE_MODE_OPTIONS}
              value={draft.typstTableMode}
              disabled={loading}
              allowDeselect={false}
              onChange={(value) => {
                setHasUnsavedChanges(true);
                setDraft((current) => ({
                  ...current,
                  typstTableMode: value === "image" ? "image" : "render",
                }));
              }}
            />
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
