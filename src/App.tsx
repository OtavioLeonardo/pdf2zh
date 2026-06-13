import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { MainWindow } from "./pages/MainWindow";
import { ProgressWindow } from "./pages/ProgressWindow";
import { SettingsWindow } from "./pages/SettingsWindow";
import { TutorialWindow } from "./pages/TutorialWindow";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import "./App.css";

function App() {
  const windowLabel = getCurrentWebviewWindow().label;
  let page = <MainWindow />;

  if (windowLabel === "settings") {
    page = <SettingsWindow />;
  } else if (windowLabel === "task-progress") {
    page = <ProgressWindow />;
  } else if (windowLabel === "tutorial") {
    page = <TutorialWindow />;
  }

  return <AppErrorBoundary windowLabel={windowLabel}>{page}</AppErrorBoundary>;
}

export default App;
