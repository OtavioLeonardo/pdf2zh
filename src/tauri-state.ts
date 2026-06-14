import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  type AppBootstrap,
  type HistoryEntry,
  type AppSettings,
  type ServiceTestRequest,
  type ServiceTestResult,
  type GlossaryRuntimeStatus,
  type TaskSnapshot,
  type TranslationEvent,
  DEFAULT_SETTINGS,
  DEFAULT_TASK,
  taskSnapshotFromEvent,
} from "./app-types";

export function useAppBootstrap() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [task, setTask] = useState<TaskSnapshot>(DEFAULT_TASK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadBootstrap = async () => {
      const bootstrap = await invoke<AppBootstrap>("get_app_bootstrap");
      if (!mounted) {
        return;
      }

      setSettings(bootstrap.settings);
      setTask((current) => {
        if (bootstrap.task.taskId && current.taskId === bootstrap.task.taskId) {
          return {
            ...bootstrap.task,
            updatedAt: Math.max(bootstrap.task.updatedAt, current.updatedAt),
          };
        }

        return bootstrap.task;
      });
    };

    void loadBootstrap()
      .catch(() => null)
      .finally(() => {
        if (!mounted) {
          return;
        }
        setLoading(false);
      });

    const timer = window.setInterval(() => {
      void loadBootstrap().catch(() => null);
    }, 2000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<AppSettings>("settings-updated", (event) => {
      setSettings(event.payload);
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<TranslationEvent>("translation-event", (event) => {
      setTask((current) => taskSnapshotFromEvent(event.payload, current));
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return { loading, settings, task };
}

export async function saveAppSettings(settings: AppSettings) {
  return invoke<AppSettings>("save_app_settings", { settings });
}

export async function testLlmConnection(request: ServiceTestRequest) {
  return invoke<ServiceTestResult>("test_llm_connection", { request });
}

export async function testMineruConnection(request: ServiceTestRequest) {
  return invoke<ServiceTestResult>("test_mineru_connection", { request });
}

export async function inspectGlossaryRuntime() {
  return invoke<GlossaryRuntimeStatus>("inspect_glossary_runtime");
}

export async function openSettingsWindow() {
  await invoke("open_settings_window");
}

export async function openProgressWindow() {
  await invoke("open_progress_window");
}

export async function openTutorialWindow() {
  await invoke("open_tutorial_window");
}

export async function rerenderPdf(outputDir: string) {
  return invoke<string>("rerender_pdf", { request: { outputDir } });
}

export async function cancelTranslation() {
  return invoke<void>("cancel_translation");
}

export async function openHistoryWindow() {
  await invoke("open_history_window");
}

export async function getTranslationHistory() {
  return invoke<HistoryEntry[]>("get_translation_history");
}
