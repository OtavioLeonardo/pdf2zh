import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { MainWindow } from "./pages/MainWindow";
import { HistoryWindow } from "./pages/HistoryWindow";
import { ProgressWindow } from "./pages/ProgressWindow";
import { SettingsWindow } from "./pages/SettingsWindow";
import { TutorialWindow } from "./pages/TutorialWindow";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import "./App.css";

function resolveWindowLabel() {
  try {
    return getCurrentWebviewWindow().label;
  } catch {
    return "main";
  }
}

function App() {
  const windowLabel = resolveWindowLabel();
  let page = <MainWindow />;

  if (windowLabel === "settings") {
    page = <SettingsWindow />;
  } else if (windowLabel === "history") {
    page = <HistoryWindow />;
  } else if (windowLabel === "task-progress") {
    page = <ProgressWindow />;
  } else if (windowLabel === "tutorial") {
    page = <TutorialWindow />;
  }

  return <AppErrorBoundary windowLabel={windowLabel}>{page}</AppErrorBoundary>;
}

export default App;
