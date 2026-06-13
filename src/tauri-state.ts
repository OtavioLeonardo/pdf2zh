import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  type AppBootstrap,
  type AppSettings,
  type ServiceTestRequest,
  type ServiceTestResult,
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

    void invoke<AppBootstrap>("get_app_bootstrap")
      .then((bootstrap) => {
        if (!mounted) {
          return;
        }

        setSettings(bootstrap.settings);
        setTask(bootstrap.task);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
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
      setTask(taskSnapshotFromEvent(event.payload));
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

export async function openSettingsWindow() {
  await invoke("open_settings_window");
}

export async function openProgressWindow() {
  await invoke("open_progress_window");
}

export async function openTutorialWindow() {
  await invoke("open_tutorial_window");
}
