import React from "react";
import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
  windowLabel: string;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

function windowTitleFromLabel(windowLabel: string) {
  if (windowLabel === "settings") {
    return "设置窗口";
  }

  if (windowLabel === "task-progress") {
    return "任务详情窗口";
  }

  if (windowLabel === "tutorial") {
    return "使用教程窗口";
  }

  return "主窗口";
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Unhandled render error in ${this.props.windowLabel}`, error, errorInfo);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="app-error-shell">
        <Paper className="app-error-card" radius="xl" shadow="xl">
          <Stack gap="md">
            <Title order={2}>{windowTitleFromLabel(this.props.windowLabel)}出了点问题</Title>
            <Text c="dimmed" size="sm">
              窗口没有关闭，前端刚刚遇到了一个异常。你可以直接刷新当前窗口，或者先关闭再重新打开。
            </Text>
            <Text className="app-error-message" size="sm">
              {this.state.error.message || "Unknown error"}
            </Text>
            <Group>
              <Button variant="default" onClick={() => window.location.reload()}>
                刷新窗口
              </Button>
              <Button variant="light" onClick={() => void getCurrentWebviewWindow().close()}>
                关闭窗口
              </Button>
            </Group>
          </Stack>
        </Paper>
      </div>
    );
  }
}
