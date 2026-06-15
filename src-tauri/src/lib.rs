use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

const SETTINGS_MENU_ID: &str = "app-settings";
const TUTORIAL_MENU_ID: &str = "app-tutorial";
const HISTORY_MENU_ID: &str = "app-history";
const SETTINGS_WINDOW_LABEL: &str = "settings";
const PROGRESS_WINDOW_LABEL: &str = "task-progress";
const TUTORIAL_WINDOW_LABEL: &str = "tutorial";
const HISTORY_WINDOW_LABEL: &str = "history";
const SETTINGS_FILE_NAME: &str = "settings.json";
const README_FILE_NAME: &str = "README.md";
const DEFAULT_MINERU_API_URL: &str = "https://mineru.net/api/v4/file-urls/batch";

struct AppState {
    running_task: Arc<Mutex<bool>>,
    task_process: Arc<Mutex<Option<u32>>>,
    settings: Arc<Mutex<AppSettings>>,
    task_snapshot: Arc<Mutex<TaskSnapshot>>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ServiceTestRequest {
    provider: String,
    model: String,
    api_key: String,
    mineru_api_url: String,
    mineru_api_key: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceTestResult {
    success: bool,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GlossaryRuntimeStatus {
    pyate_available: bool,
    spacy_available: bool,
    keybert_available: bool,
    sentence_transformers_available: bool,
    recommended_ready: bool,
    message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranslationRequest {
    input_pdf: String,
    provider: String,
    model: String,
    api_key: String,
    glossary_model: Option<String>,
    glossary_strategy: Option<String>,
    mineru_api_url: String,
    mineru_api_key: Option<String>,
    output_dir: String,
    glossary_path: Option<String>,
    enable_translation: Option<bool>,
    parallel_translation: Option<bool>,
    translation_concurrency: Option<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PdfRerenderRequest {
    output_dir: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TranslationEvent {
    task_id: String,
    r#type: String,
    stage: String,
    progress: u8,
    message: String,
    output_dir: Option<String>,
    raw_md: Option<String>,
    translated_md: Option<String>,
    translated_pdf: Option<String>,
    report_path: Option<String>,
    retried_segments: Option<u32>,
    started_at: Option<u128>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    provider: String,
    model: String,
    api_key: String,
    glossary_strategy: String,
    glossary_model: String,
    mineru_api_url: String,
    mineru_api_key: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TaskSnapshot {
    task_id: Option<String>,
    r#type: String,
    stage: String,
    progress: u8,
    message: String,
    is_running: bool,
    output_dir: Option<String>,
    raw_md: Option<String>,
    translated_md: Option<String>,
    translated_pdf: Option<String>,
    report_path: Option<String>,
    retried_segments: Option<u32>,
    started_at: Option<u128>,
    can_retry: bool,
    updated_at: u128,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppBootstrap {
    settings: AppSettings,
    task: TaskSnapshot,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TutorialContent {
    markdown: String,
    source_label: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HistoryEntry {
    id: String,
    title: String,
    output_dir: String,
    input_file: Option<String>,
    raw_md: Option<String>,
    translated_md: Option<String>,
    translated_pdf: Option<String>,
    report_path: Option<String>,
    mineru_log_path: Option<String>,
    glossary_path: Option<String>,
    updated_at: u128,
    started_at: Option<String>,
    provider: Option<String>,
    model: Option<String>,
    pdf_generated: bool,
    status_label: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            provider: "openai".to_string(),
            model: "gpt-5.4-mini".to_string(),
            api_key: String::new(),
            glossary_strategy: "llm_only".to_string(),
            glossary_model: "gpt-5.4-mini".to_string(),
            mineru_api_url: DEFAULT_MINERU_API_URL.to_string(),
            mineru_api_key: String::new(),
        }
    }
}

impl Default for TaskSnapshot {
    fn default() -> Self {
        Self {
            task_id: None,
            r#type: "status".to_string(),
            stage: "queued".to_string(),
            progress: 0,
            message: "选择论文 PDF，然后点击开始翻译。".to_string(),
            is_running: false,
            output_dir: None,
            raw_md: None,
            translated_md: None,
            translated_pdf: None,
            report_path: None,
            retried_segments: None,
            started_at: None,
            can_retry: false,
            updated_at: 0,
        }
    }
}

fn is_terminal_stage(stage: &str) -> bool {
    matches!(stage, "completed" | "cancelled" | "failed")
}

fn is_task_running(event: &TranslationEvent) -> bool {
    event.r#type != "result" && event.r#type != "error" && !is_terminal_stage(&event.stage)
}

fn build_task_id() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("task-{millis}")
}

fn timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn resolve_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Failed to resolve app config directory: {error}"))?;

    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("Failed to create app config directory: {error}"))?;

    Ok(config_dir.join(SETTINGS_FILE_NAME))
}

fn load_settings(app: &AppHandle) -> AppSettings {
    let path = match resolve_settings_path(app) {
        Ok(path) => path,
        Err(_) => return AppSettings::default(),
    };

    let raw = match fs::read_to_string(path) {
        Ok(raw) => raw,
        Err(_) => return AppSettings::default(),
    };

    let mut settings: AppSettings = serde_json::from_str(&raw).unwrap_or_default();
    if settings.mineru_api_url.trim().is_empty() {
        settings.mineru_api_url = DEFAULT_MINERU_API_URL.to_string();
    }
    settings
}

fn persist_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = resolve_settings_path(app)?;
    let serialized = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("Failed to serialize settings: {error}"))?;

    fs::write(path, serialized).map_err(|error| format!("Failed to save settings: {error}"))
}

fn task_snapshot_from_event(event: &TranslationEvent, previous: Option<&TaskSnapshot>) -> TaskSnapshot {
    let is_same_task = previous
        .and_then(|task| task.task_id.as_ref())
        .zip(Some(&event.task_id))
        .map(|(left, right)| left == right)
        .unwrap_or(false);
    let is_running = is_task_running(event);
    let can_retry = is_terminal_stage(&event.stage);
    let started_at = if is_same_task {
        previous
            .and_then(|task| task.started_at)
            .or(event.started_at)
            .or_else(|| Some(timestamp_millis()))
    } else {
        event.started_at.or_else(|| Some(timestamp_millis()))
    };
    let previous_output_dir = previous.and_then(|task| task.output_dir.clone());
    let previous_raw_md = previous.and_then(|task| task.raw_md.clone());
    let previous_translated_md = previous.and_then(|task| task.translated_md.clone());
    let previous_translated_pdf = previous.and_then(|task| task.translated_pdf.clone());
    let previous_report_path = previous.and_then(|task| task.report_path.clone());
    let previous_retried_segments = previous.and_then(|task| task.retried_segments);

    TaskSnapshot {
        task_id: Some(event.task_id.clone()),
        r#type: event.r#type.clone(),
        stage: event.stage.clone(),
        progress: event.progress,
        message: event.message.clone(),
        is_running,
        output_dir: event.output_dir.clone().or(previous_output_dir),
        raw_md: event.raw_md.clone().or(previous_raw_md),
        translated_md: event.translated_md.clone().or(previous_translated_md),
        translated_pdf: event.translated_pdf.clone().or(previous_translated_pdf),
        report_path: event.report_path.clone().or(previous_report_path),
        retried_segments: event.retried_segments.or(previous_retried_segments),
        started_at,
        can_retry,
        updated_at: timestamp_millis(),
    }
}

fn sync_task_snapshot(state: &AppState, event: &TranslationEvent) {
    if let Ok(mut task) = state.task_snapshot.lock() {
        let previous = task.clone();
        *task = task_snapshot_from_event(event, Some(&previous));
    }
}

fn emit_translation_event(app: &AppHandle, payload: &TranslationEvent) {
    if let Some(state) = app.try_state::<AppState>() {
        sync_task_snapshot(&state, payload);
    }

    let _ = app.emit("translation-event", payload);
}

fn ensure_window(window: WebviewWindow, title: &str) -> Result<(), String> {
    window
        .set_title(title)
        .map_err(|error| format!("Failed to set window title: {error}"))?;
    window
        .show()
        .map_err(|error| format!("Failed to show window: {error}"))?;
    window
        .set_focus()
        .map_err(|error| format!("Failed to focus window: {error}"))?;
    Ok(())
}

fn create_aux_window(
    app: &AppHandle,
    label: &str,
    title: &str,
    width: f64,
    height: f64,
    _use_native_titlebar: bool,
) -> Result<WebviewWindow, String> {
    if let Some(existing) = app.get_webview_window(label) {
        ensure_window(existing.clone(), title)?;
        return Ok(existing);
    }

    let builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title(title)
        .inner_size(width, height)
        .min_inner_size(560.0, 460.0)
        .resizable(true)
        .center();

    #[cfg(target_os = "macos")]
    let builder = if _use_native_titlebar {
        builder
    } else {
        builder
            .hidden_title(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
    };

    #[cfg(not(target_os = "macos"))]
    let builder = builder;

    #[cfg(target_os = "macos")]
    let builder = {
        let main_window = app.get_webview_window("main");
        if let Some(main) = main_window {
            builder.parent(&main).map_err(|error| format!("Failed to set window parent: {error}"))?
        } else {
            builder
        }
    };

    #[cfg(not(target_os = "macos"))]
    let builder = builder;

    let window = builder
        .build()
        .map_err(|error| format!("Failed to build window: {error}"))?;

    ensure_window(window.clone(), title)?;
    Ok(window)
}

fn open_settings_window_internal(app: &AppHandle) -> Result<(), String> {
    create_aux_window(app, SETTINGS_WINDOW_LABEL, "设置", 720.0, 760.0, true).map(|_| ())
}

fn open_progress_window_internal(app: &AppHandle) -> Result<(), String> {
    create_aux_window(app, PROGRESS_WINDOW_LABEL, "任务详情", 760.0, 820.0, true).map(|_| ())
}

fn open_tutorial_window_internal(app: &AppHandle) -> Result<(), String> {
    create_aux_window(app, TUTORIAL_WINDOW_LABEL, "使用教程", 860.0, 860.0, false).map(|_| ())
}

fn open_history_window_internal(app: &AppHandle) -> Result<(), String> {
    create_aux_window(app, HISTORY_WINDOW_LABEL, "翻译历史", 860.0, 860.0, true).map(|_| ())
}

fn schedule_aux_window<F>(app: AppHandle, open_fn: F)
where
    F: Fn(&AppHandle) -> Result<(), String> + Send + 'static,
{
    tauri::async_runtime::spawn(async move {
        let _ = open_fn(&app);
    });
}

fn resolve_history_root(app: &AppHandle) -> Result<PathBuf, String> {
    let document_dir = app
        .path()
        .document_dir()
        .map_err(|error| format!("Failed to resolve Documents directory: {error}"))?;
    let history_root = document_dir.join("pdf2zh");
    fs::create_dir_all(&history_root)
        .map_err(|error| format!("Failed to create history directory: {error}"))?;
    Ok(history_root)
}

fn resolve_readme_path() -> Result<PathBuf, String> {
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join(README_FILE_NAME);

    if dev_path.exists() {
        return Ok(dev_path);
    }

    for root in collect_resource_roots_from_exe() {
        let candidates = [root.join(README_FILE_NAME), root.join("backend").join(README_FILE_NAME)];

        for bundled_path in candidates {
            if bundled_path.exists() {
                return Ok(bundled_path);
            }
        }
    }

    Err("Could not locate README.md".to_string())
}

fn push_existing_path(paths: &mut Vec<PathBuf>, candidate: PathBuf) {
    if candidate.exists() && !paths.iter().any(|path| path == &candidate) {
        paths.push(candidate);
    }
}

fn collect_resource_roots_from_exe() -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let exe_dir = exe_dir.to_path_buf();
            push_existing_path(&mut roots, exe_dir.clone());
            push_existing_path(&mut roots, exe_dir.join("resources"));
            push_existing_path(&mut roots, exe_dir.join("resources").join("_up_"));
        }
    }

    roots
}

fn collect_resource_roots(app: &AppHandle) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        push_existing_path(&mut roots, resource_dir.clone());
        push_existing_path(&mut roots, resource_dir.join("_up_"));
    }

    for root in collect_resource_roots_from_exe() {
        push_existing_path(&mut roots, root);
    }

    roots
}

fn find_path_by_name(root: &Path, target_name: &str, max_depth: usize) -> Option<PathBuf> {
    if !root.exists() {
        return None;
    }

    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.file_name().and_then(|name| name.to_str()) == Some(target_name) {
            return Some(path);
        }

        if max_depth > 0 && path.is_dir() {
            if let Some(found) = find_path_by_name(&path, target_name, max_depth - 1) {
                return Some(found);
            }
        }
    }

    None
}

fn find_runtime_dir(root: &Path, max_depth: usize) -> Option<PathBuf> {
    if !root.exists() {
        return None;
    }

    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let is_runtime_dir = path.file_name().and_then(|name| name.to_str()) == Some("runtime");
            let looks_like_runtime =
                path.join("python").exists() || path.join("bin").exists() || path.join("README.md").exists();

            if is_runtime_dir && looks_like_runtime {
                return Some(path);
            }

            if max_depth > 0 {
                if let Some(found) = find_runtime_dir(&path, max_depth - 1) {
                    return Some(found);
                }
            }
        }
    }

    None
}

fn build_app_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let about = PredefinedMenuItem::about(app, None, None)?;
    let services = PredefinedMenuItem::services(app, None)?;
    let hide = PredefinedMenuItem::hide(app, None)?;
    let hide_others = PredefinedMenuItem::hide_others(app, None)?;
    let quit = PredefinedMenuItem::quit(app, None)?;
    let settings = MenuItem::with_id(app, SETTINGS_MENU_ID, "设置…", true, Some("CmdOrCtrl+,"))?;
    let tutorial = MenuItem::with_id(app, TUTORIAL_MENU_ID, "使用教程", true, Some("CmdOrCtrl+/"))?;
    let history = MenuItem::with_id(app, HISTORY_MENU_ID, "翻译历史", true, Some("CmdOrCtrl+Shift+H"))?;

    let app_submenu = Submenu::with_items(
        app,
        app.package_info().name.clone(),
        true,
        &[
            &about,
            &PredefinedMenuItem::separator(app)?,
            &settings,
            &history,
            &tutorial,
            &PredefinedMenuItem::separator(app)?,
            &services,
            &PredefinedMenuItem::separator(app)?,
            &hide,
            &hide_others,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    let file_submenu = Submenu::with_items(
        app,
        "File",
        true,
        &[&PredefinedMenuItem::close_window(app, None)?],
    )?;

    let edit_submenu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let view_submenu = Submenu::with_items(
        app,
        "View",
        true,
        &[&PredefinedMenuItem::fullscreen(app, None)?],
    )?;

    let window_submenu = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    Menu::with_items(
        app,
        &[&app_submenu, &file_submenu, &edit_submenu, &view_submenu, &window_submenu],
    )
}

fn resolve_backend_script(app: &AppHandle) -> Result<PathBuf, String> {
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("backend")
        .join("translator_pipeline.py");

    if cfg!(debug_assertions) && dev_path.exists() {
        return Ok(dev_path);
    }

    for root in collect_resource_roots(app) {
        let direct_candidates = [
            root.join("backend").join("translator_pipeline.py"),
            root.join("translator_pipeline.py"),
        ];

        for candidate in direct_candidates {
            if candidate.exists() {
                return Ok(candidate);
            }
        }

        if let Some(found) = find_path_by_name(&root, "translator_pipeline.py", 4) {
            return Ok(found);
        }
    }

    if dev_path.exists() {
        Ok(dev_path)
    } else {
        Err("Could not locate backend translator_pipeline.py".to_string())
    }
}

fn binary_name(base: &str) -> String {
    #[cfg(target_os = "windows")]
    {
        format!("{base}.exe")
    }

    #[cfg(not(target_os = "windows"))]
    {
        base.to_string()
    }
}

fn resolve_runtime_root(app: &AppHandle) -> Option<PathBuf> {
    if let Ok(path) = std::env::var("PDF2ZH_RUNTIME_ROOT") {
        let candidate = PathBuf::from(path);
        if candidate.exists() {
            return Some(candidate);
        }
    }

    let dev_candidate = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("backend")
        .join("runtime");

    if cfg!(debug_assertions) && dev_candidate.exists() {
        return Some(dev_candidate);
    }

    for root in collect_resource_roots(app) {
        let direct_candidates = [root.join("backend").join("runtime"), root.join("runtime")];

        for candidate in direct_candidates {
            if candidate.exists() {
                return Some(candidate);
            }
        }

        if let Some(script_path) = find_path_by_name(&root, "translator_pipeline.py", 4) {
            if let Some(script_dir) = script_path.parent() {
                let sibling_runtime = script_dir.join("runtime");
                if sibling_runtime.exists() {
                    return Some(sibling_runtime);
                }
            }
        }

        if let Some(runtime_dir) = find_runtime_dir(&root, 4) {
            return Some(runtime_dir);
        }
    }

    if dev_candidate.exists() {
        return Some(dev_candidate);
    }

    None
}

fn resolve_python_binary(runtime_root: Option<&Path>) -> String {
    if let Ok(path) = std::env::var("PDF2ZH_PYTHON") {
        return path;
    }

    if let Some(root) = runtime_root {
        let candidates = [
            root.join("python").join("bin").join(binary_name("python3")),
            root.join("python").join("bin").join(binary_name("python")),
            root.join("python").join(binary_name("python3")),
            root.join("python").join(binary_name("python")),
            root.join("bin").join(binary_name("python3")),
            root.join("bin").join(binary_name("python")),
        ];

        for candidate in candidates {
            if candidate.exists() {
                return candidate.to_string_lossy().to_string();
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        "python".to_string()
    }

    #[cfg(not(target_os = "windows"))]
    {
        "python3".to_string()
    }
}

fn is_bundled_python_binary(python_bin: &str, runtime_root: &Path) -> bool {
    let bundled_root = runtime_root.join("python");
    let resolved_python = fs::canonicalize(python_bin).unwrap_or_else(|_| PathBuf::from(python_bin));
    let resolved_bundled_root = fs::canonicalize(&bundled_root).unwrap_or(bundled_root);

    resolved_python.starts_with(resolved_bundled_root)
}

fn open_path_with_system(path: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(path);
        command
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("explorer");
        command.arg(path);
        command
    };

    #[cfg(target_os = "linux")]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(path);
        command
    };

    command
        .spawn()
        .map_err(|error| format!("Failed to open path: {error}"))?;

    Ok(())
}

fn expand_tilde_path(path: &str) -> PathBuf {
    if path == "~" {
        if let Some(home) = std::env::var_os("HOME") {
            return PathBuf::from(home);
        }
    }

    if let Some(stripped) = path.strip_prefix("~/") {
        if let Some(home) = std::env::var_os("HOME") {
            return PathBuf::from(home).join(stripped);
        }
    }

    PathBuf::from(path)
}

fn normalize_output_dir(path: &str) -> String {
    let expanded = expand_tilde_path(path);

    std::fs::canonicalize(&expanded)
        .unwrap_or(expanded)
        .to_string_lossy()
        .to_string()
}

fn run_python_service_test(
    app: &AppHandle,
    request: &ServiceTestRequest,
    test_kind: &str,
) -> Result<ServiceTestResult, String> {
    let script_path = resolve_backend_script(app)?;
    let runtime_root = resolve_runtime_root(app);
    let python_bin = resolve_python_binary(runtime_root.as_deref());

    let mut command = Command::new(&python_bin);
    command.arg(&script_path);

    if let Some(root) = runtime_root.as_ref() {
        command
            .env("PDF2ZH_RUNTIME_ROOT", root)
            .env("PDF2ZH_PANDOC", root.join("bin").join(binary_name("pandoc")))
            .env("PDF2ZH_TECTONIC", root.join("bin").join(binary_name("tectonic")))
            .env("PDF2ZH_RUNTIME_SITE_PACKAGES", root.join("site-packages"))
            .env("PYTHONPATH", root.join("site-packages"));

        let bundled_python_home = root.join("python");
        if bundled_python_home.exists() && is_bundled_python_binary(&python_bin, root) {
            command.env("PYTHONHOME", bundled_python_home);
        }
    }

    let mut child = command
        .env("PDF2ZH_SERVICE_TEST", test_kind)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start Python service test: {error}"))?;

    let payload_json = serde_json::json!({
        "provider": request.provider,
        "model": request.model,
        "apiKey": request.api_key,
        "mineruApiUrl": request.mineru_api_url,
        "mineruApiKey": request.mineru_api_key,
    });

    {
        let mut stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Failed to access Python stdin".to_string())?;

        stdin
            .write_all(payload_json.to_string().as_bytes())
            .and_then(|_| stdin.flush())
            .map_err(|error| format!("Failed to send service test payload: {error}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("Failed to wait for Python service test: {error}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        if stdout.is_empty() {
            return Ok(ServiceTestResult {
                success: true,
                message: "连接测试成功。".to_string(),
            });
        }

        return Ok(ServiceTestResult {
            success: true,
            message: stdout,
        });
    }

    let message = if !stdout.is_empty() {
        stdout
    } else if !stderr.is_empty() {
        stderr
    } else {
        format!("Service test exited with status {}", output.status)
    };

    Err(message)
}

#[tauri::command]
fn get_app_bootstrap(state: State<'_, AppState>) -> Result<AppBootstrap, String> {
    let settings = state
        .settings
        .lock()
        .map_err(|_| "Failed to read settings state".to_string())?
        .clone();
    let task = state
        .task_snapshot
        .lock()
        .map_err(|_| "Failed to read task state".to_string())?
        .clone();

    Ok(AppBootstrap { settings, task })
}

#[tauri::command]
fn save_app_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    persist_settings(&app, &settings)?;

    {
        let mut stored = state
            .settings
            .lock()
            .map_err(|_| "Failed to write settings state".to_string())?;
        *stored = settings.clone();
    }

    app.emit("settings-updated", settings.clone())
        .map_err(|error| format!("Failed to emit settings update: {error}"))?;

    Ok(settings)
}

#[tauri::command]
fn test_llm_connection(app: AppHandle, request: ServiceTestRequest) -> Result<ServiceTestResult, String> {
    run_python_service_test(&app, &request, "llm")
}

#[tauri::command]
fn test_mineru_connection(app: AppHandle, request: ServiceTestRequest) -> Result<ServiceTestResult, String> {
    run_python_service_test(&app, &request, "mineru")
}

#[tauri::command]
fn inspect_glossary_runtime(app: AppHandle) -> Result<GlossaryRuntimeStatus, String> {
    let runtime_root = resolve_runtime_root(&app);
    let python_bin = resolve_python_binary(runtime_root.as_deref());
    let script = r#"
import importlib.util
import json
import os
import sys
from pathlib import Path

runtime_site_packages = os.environ.get("PDF2ZH_RUNTIME_SITE_PACKAGES", "").strip()
if runtime_site_packages and Path(runtime_site_packages).exists():
    sys.path.insert(0, runtime_site_packages)

def has_module(name: str) -> bool:
    try:
        return importlib.util.find_spec(name) is not None
    except Exception:
        return False

spacy_available = has_module("spacy")
pyate_available = has_module("pyate.term_extraction")
keybert_available = has_module("keybert")
sentence_transformers_available = has_module("sentence_transformers")
recommended_ready = keybert_available and sentence_transformers_available and spacy_available and pyate_available

if recommended_ready:
    message = "已检测到 pyate、spaCy、KeyBERT 和 sentence-transformers，可以启用术语增强。"
elif keybert_available or pyate_available or spacy_available or sentence_transformers_available:
    message = "检测到部分术语增强依赖，但还不完整。普通用户继续使用默认 LLM 术语预处理即可。"
else:
    message = "当前未检测到 pyate / KeyBERT 术语增强环境。普通用户直接使用默认 LLM 术语预处理即可。"

print(json.dumps({
    "pyateAvailable": pyate_available,
    "spacyAvailable": spacy_available,
    "keybertAvailable": keybert_available,
    "sentenceTransformersAvailable": sentence_transformers_available,
    "recommendedReady": recommended_ready,
    "message": message,
}, ensure_ascii=False))
"#;

    let mut command = Command::new(&python_bin);
    command.arg("-c").arg(script);

    if let Some(root) = runtime_root.as_ref() {
        command
            .env("PDF2ZH_RUNTIME_ROOT", root)
            .env("PDF2ZH_RUNTIME_SITE_PACKAGES", root.join("site-packages"))
            .env("PYTHONPATH", root.join("site-packages"));

        let bundled_python_home = root.join("python");
        if bundled_python_home.exists() && is_bundled_python_binary(&python_bin, root) {
            command.env("PYTHONHOME", bundled_python_home);
        }
    }

    let output = command
        .output()
        .map_err(|error| format!("Failed to inspect glossary runtime: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("Glossary runtime check exited with status {}", output.status)
        } else {
            stderr
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    serde_json::from_str(&stdout).map_err(|error| format!("Failed to parse glossary runtime status: {error}"))
}

#[tauri::command]
fn open_settings_window(app: AppHandle) -> Result<(), String> {
    schedule_aux_window(app, open_settings_window_internal);
    Ok(())
}

#[tauri::command]
fn open_progress_window(app: AppHandle) -> Result<(), String> {
    schedule_aux_window(app, open_progress_window_internal);
    Ok(())
}

#[tauri::command]
fn open_tutorial_window(app: AppHandle) -> Result<(), String> {
    schedule_aux_window(app, open_tutorial_window_internal);
    Ok(())
}

#[tauri::command]
fn open_history_window(app: AppHandle) -> Result<(), String> {
    schedule_aux_window(app, open_history_window_internal);
    Ok(())
}

#[tauri::command]
fn get_tutorial_content() -> Result<TutorialContent, String> {
    let path = resolve_readme_path()?;
    let markdown = fs::read_to_string(path).map_err(|error| format!("Failed to read README: {error}"))?;

    Ok(TutorialContent {
        markdown,
        source_label: "README".to_string(),
    })
}

#[tauri::command]
fn open_tutorial_source() -> Result<(), String> {
    let path = resolve_readme_path()?;
    open_path_with_system(path.to_string_lossy().as_ref())
}

#[tauri::command]
fn open_output_dir(path: String) -> Result<(), String> {
    open_path_with_system(&path)
}

#[tauri::command]
fn get_translation_history(app: AppHandle) -> Result<Vec<HistoryEntry>, String> {
    let history_root = resolve_history_root(&app)?;
    let mut entries = Vec::new();

    let read_dir = fs::read_dir(&history_root).map_err(|error| format!("Failed to read history directory: {error}"))?;
    for item in read_dir {
        let item = item.map_err(|error| format!("Failed to read history entry: {error}"))?;
        let path = item.path();
        if !path.is_dir() {
            continue;
        }

        let report_path = path.join("translation_report.json");
        let raw_md = path.join("raw.md");
        let translated_md = path.join("translated.md");
        let translated_pdf = path.join("translated.pdf");
        let glossary_path = path.join("glossary.tsv");
        let mineru_log_path = path.join("mineru_debug.log");

        let report_json = if report_path.exists() {
            fs::read_to_string(&report_path)
                .ok()
                .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
        } else {
            None
        };

        let title = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("未命名任务")
            .to_string();
        let updated_at = fs::metadata(&path)
            .and_then(|meta| meta.modified())
            .ok()
            .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis())
            .unwrap_or(0);
        let input_file = report_json
            .as_ref()
            .and_then(|report| report.get("input_file"))
            .and_then(Value::as_str)
            .map(str::to_string);
        let started_at = report_json
            .as_ref()
            .and_then(|report| report.get("started_at"))
            .and_then(Value::as_str)
            .map(str::to_string);
        let provider = report_json
            .as_ref()
            .and_then(|report| report.get("provider"))
            .and_then(Value::as_str)
            .map(str::to_string);
        let model = report_json
            .as_ref()
            .and_then(|report| report.get("model"))
            .and_then(Value::as_str)
            .map(str::to_string);
        let pdf_generated = report_json
            .as_ref()
            .and_then(|report| report.get("pdf_generated"))
            .and_then(Value::as_bool)
            .unwrap_or(translated_pdf.exists());

        let status_label = if translated_pdf.exists() {
            "已完成".to_string()
        } else if translated_md.exists() {
            "已翻译，待导出 PDF".to_string()
        } else if raw_md.exists() {
            "已提取 raw.md".to_string()
        } else {
            "处理中或不完整".to_string()
        };

        entries.push(HistoryEntry {
            id: path.to_string_lossy().to_string(),
            title,
            output_dir: path.to_string_lossy().to_string(),
            input_file,
            raw_md: raw_md.exists().then(|| raw_md.to_string_lossy().to_string()),
            translated_md: translated_md.exists().then(|| translated_md.to_string_lossy().to_string()),
            translated_pdf: translated_pdf.exists().then(|| translated_pdf.to_string_lossy().to_string()),
            report_path: report_path.exists().then(|| report_path.to_string_lossy().to_string()),
            mineru_log_path: mineru_log_path.exists().then(|| mineru_log_path.to_string_lossy().to_string()),
            glossary_path: glossary_path.exists().then(|| glossary_path.to_string_lossy().to_string()),
            updated_at,
            started_at,
            provider,
            model,
            pdf_generated,
            status_label,
        });
    }

    entries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(entries)
}

#[tauri::command]
fn start_translation(
    app: AppHandle,
    state: State<'_, AppState>,
    request: TranslationRequest,
) -> Result<String, String> {
    let mut running = state
        .running_task
        .lock()
        .map_err(|_| "Failed to acquire task lock".to_string())?;

    if *running {
        return Err("A translation task is already running.".to_string());
    }

    *running = true;
    drop(running);

    let task_id = build_task_id();
    let started_at = timestamp_millis();
    let initial_event = TranslationEvent {
        task_id: task_id.clone(),
        r#type: "status".to_string(),
        stage: "queued".to_string(),
        progress: 2,
        message: "任务已提交，正在准备翻译流程。".to_string(),
        output_dir: Some(normalize_output_dir(&request.output_dir)),
        raw_md: None,
        translated_md: None,
        translated_pdf: None,
        report_path: None,
        retried_segments: None,
        started_at: Some(started_at),
    };
    emit_translation_event(&app, &initial_event);

    let payload_json = serde_json::json!({
        "taskId": task_id,
        "inputPdf": request.input_pdf,
        "provider": request.provider,
        "model": request.model,
        "apiKey": request.api_key,
        "glossaryModel": request.glossary_model,
        "glossaryStrategy": request.glossary_strategy,
        "mineruApiUrl": request.mineru_api_url,
        "mineruApiKey": request.mineru_api_key,
        "outputDir": request.output_dir,
        "glossaryPath": request.glossary_path,
        "enableTranslation": request.enable_translation.unwrap_or(true),
        "parallelTranslation": request.parallel_translation.unwrap_or(false),
        "translationConcurrency": request.translation_concurrency.unwrap_or(3),
    });

    let script_path = resolve_backend_script(&app)?;
    let runtime_root = resolve_runtime_root(&app);
    let python_bin = resolve_python_binary(runtime_root.as_deref());
    let task_id_for_thread = task_id.clone();
    let app_handle = app.clone();
    let state_handle = app.state::<AppState>();
    let running_task_arc = Arc::clone(&state_handle.inner().running_task);
    let task_process_arc = Arc::clone(&state_handle.inner().task_process);

    std::thread::spawn(move || {
        let result = run_translation_process(
            app_handle.clone(),
            running_task_arc.clone(),
            task_process_arc.clone(),
            &task_id_for_thread,
            &python_bin,
            &script_path,
            runtime_root.clone(),
            payload_json,
        );

        if let Err(message) = result {
            emit_translation_event(
                &app_handle,
                &TranslationEvent {
                    task_id: task_id_for_thread.clone(),
                    r#type: "error".to_string(),
                    stage: "failed".to_string(),
                    progress: 0,
                    message,
                    output_dir: None,
                    raw_md: None,
                    translated_md: None,
                    translated_pdf: None,
                    report_path: None,
                    retried_segments: None,
                    started_at: Some(started_at),
                },
            );

            if let Ok(mut running) = running_task_arc.lock() {
                *running = false;
            }
        }
    });

    Ok(task_id)
}

#[tauri::command]
fn rerender_pdf(
    app: AppHandle,
    state: State<'_, AppState>,
    request: PdfRerenderRequest,
) -> Result<String, String> {
    let mut running = state
        .running_task
        .lock()
        .map_err(|_| "Failed to acquire task lock".to_string())?;

    if *running {
        return Err("A task is already running.".to_string());
    }

    *running = true;
    drop(running);

    let task_id = build_task_id();
    let normalized_output_dir = normalize_output_dir(&request.output_dir);
    let started_at = timestamp_millis();
    let initial_event = TranslationEvent {
        task_id: task_id.clone(),
        r#type: "status".to_string(),
        stage: "rendering_pdf".to_string(),
        progress: 88,
        message: "正在准备重新生成 PDF。".to_string(),
        output_dir: Some(normalized_output_dir.clone()),
        raw_md: None,
        translated_md: Some(format!("{normalized_output_dir}/translated.md")),
        translated_pdf: None,
        report_path: None,
        retried_segments: None,
        started_at: Some(started_at),
    };
    emit_translation_event(&app, &initial_event);

    let payload_json = serde_json::json!({
        "taskId": task_id,
        "mode": "rerender_pdf",
        "outputDir": request.output_dir,
    });

    let script_path = resolve_backend_script(&app)?;
    let runtime_root = resolve_runtime_root(&app);
    let python_bin = resolve_python_binary(runtime_root.as_deref());
    let task_id_for_thread = task_id.clone();
    let app_handle = app.clone();
    let state_handle = app.state::<AppState>();
    let running_task_arc = Arc::clone(&state_handle.inner().running_task);
    let task_process_arc = Arc::clone(&state_handle.inner().task_process);

    std::thread::spawn(move || {
        let result = run_translation_process(
            app_handle.clone(),
            running_task_arc.clone(),
            task_process_arc.clone(),
            &task_id_for_thread,
            &python_bin,
            &script_path,
            runtime_root.clone(),
            payload_json,
        );

        if let Err(message) = result {
            emit_translation_event(
                &app_handle,
                &TranslationEvent {
                    task_id: task_id_for_thread.clone(),
                    r#type: "error".to_string(),
                    stage: "failed".to_string(),
                    progress: 0,
                    message,
                    output_dir: Some(normalized_output_dir),
                    raw_md: None,
                    translated_md: None,
                    translated_pdf: None,
                    report_path: None,
                    retried_segments: None,
                    started_at: Some(started_at),
                },
            );

            if let Ok(mut running) = running_task_arc.lock() {
                *running = false;
            }
        }
    });

    Ok(task_id)
}

#[tauri::command]
fn cancel_translation(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let snapshot = state
        .task_snapshot
        .lock()
        .map_err(|_| "Failed to read task snapshot".to_string())?
        .clone();

    if !snapshot.is_running {
        return Err("当前没有正在运行的任务。".to_string());
    }

    let pid = state
        .task_process
        .lock()
        .map_err(|_| "Failed to read task process".to_string())?
        .ok_or_else(|| "当前任务进程不存在，无法取消。".to_string())?;

    #[cfg(target_family = "unix")]
    let status = Command::new("kill")
        .arg("-TERM")
        .arg(pid.to_string())
        .status()
        .map_err(|error| format!("Failed to stop Python pipeline: {error}"))?;

    #[cfg(target_family = "windows")]
    let status = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status()
        .map_err(|error| format!("Failed to stop Python pipeline: {error}"))?;

    if !status.success() {
        return Err("取消任务失败，系统没有成功终止后台进程。".to_string());
    }

    if let Ok(mut running) = state.running_task.lock() {
        *running = false;
    }

    if let Ok(mut process) = state.task_process.lock() {
        *process = None;
    }

    emit_translation_event(
        &app,
        &TranslationEvent {
            task_id: snapshot.task_id.unwrap_or_else(build_task_id),
            r#type: "error".to_string(),
            stage: "cancelled".to_string(),
            progress: snapshot.progress,
            message: "任务已取消。你可以调整设置后重试，或稍后重新开始。".to_string(),
            output_dir: snapshot.output_dir,
            raw_md: snapshot.raw_md,
            translated_md: snapshot.translated_md,
            translated_pdf: snapshot.translated_pdf,
            report_path: snapshot.report_path,
            retried_segments: snapshot.retried_segments,
            started_at: snapshot.started_at,
        },
    );

    Ok(())
}

fn run_translation_process(
    app: AppHandle,
    running_task: Arc<Mutex<bool>>,
    task_process: Arc<Mutex<Option<u32>>>,
    task_id: &str,
    python_bin: &str,
    script_path: &Path,
    runtime_root: Option<PathBuf>,
    payload_json: Value,
) -> Result<(), String> {
    let mut command = Command::new(python_bin);
    command.arg(script_path);

    if let Some(root) = runtime_root.as_ref() {
        command
            .env("PDF2ZH_RUNTIME_ROOT", root)
            .env("PDF2ZH_PANDOC", root.join("bin").join(binary_name("pandoc")))
            .env("PDF2ZH_TECTONIC", root.join("bin").join(binary_name("tectonic")))
            .env("PDF2ZH_RUNTIME_SITE_PACKAGES", root.join("site-packages"))
            .env("PYTHONPATH", root.join("site-packages"));

        let bundled_python_home = root.join("python");
        if bundled_python_home.exists() && is_bundled_python_binary(python_bin, root) {
            command.env("PYTHONHOME", bundled_python_home);
        }
    }

    let mut child = command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start Python pipeline: {error}"))?;

    if let Ok(mut process) = task_process.lock() {
        *process = Some(child.id());
    }

    {
        let mut stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Failed to access Python stdin".to_string())?;

        stdin
            .write_all(payload_json.to_string().as_bytes())
            .and_then(|_| stdin.flush())
            .map_err(|error| format!("Failed to send task payload to Python pipeline: {error}"))?;
    }

    let stderr_buffer = Arc::new(Mutex::new(String::new()));
    let stderr_clone = stderr_buffer.clone();
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture Python stderr".to_string())?;

    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            if let Ok(mut buffer) = stderr_clone.lock() {
                buffer.push_str(&line);
                buffer.push('\n');
            }
        }
    });

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture Python stdout".to_string())?;
    let reader = BufReader::new(stdout);
    let mut saw_terminal_event = false;

    for line in reader.lines() {
        let line = line.map_err(|error| format!("Failed to read pipeline output: {error}"))?;
        if line.trim().is_empty() {
            continue;
        }

        let mut json: Value =
            serde_json::from_str(&line).map_err(|error| format!("Invalid pipeline JSON event: {error}"))?;

        if json.get("taskId").is_none() {
            json["taskId"] = Value::String(task_id.to_string());
        }

        if let Some(event_type) = json.get("type").and_then(Value::as_str) {
            if event_type == "result" || event_type == "error" {
                saw_terminal_event = true;
            }
        }

        if let Some(output_dir) = json.get("outputDir").and_then(Value::as_str) {
            json["outputDir"] = Value::String(normalize_output_dir(output_dir));
        }

        let event: TranslationEvent = serde_json::from_value(json)
            .map_err(|error| format!("Invalid pipeline event shape: {error}"))?;
        emit_translation_event(&app, &event);
    }

    let status = child
        .wait()
        .map_err(|error| format!("Failed to wait for Python pipeline: {error}"))?;

    if let Ok(mut process) = task_process.lock() {
        *process = None;
    }

    if let Ok(mut running) = running_task.lock() {
        *running = false;
    }

    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(mut task) = state.task_snapshot.lock() {
            task.is_running = false;
        }
    }

    if !status.success() && !saw_terminal_event {
        let stderr_message = stderr_buffer
            .lock()
            .map(|buffer| buffer.clone())
            .unwrap_or_else(|_| String::new());

        return Err(if stderr_message.trim().is_empty() {
            format!("Python pipeline exited with status {status}")
        } else {
            stderr_message
        });
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .menu(|app| build_app_menu(app))
        .on_menu_event(|app, event| {
            if event.id().0 == SETTINGS_MENU_ID {
                schedule_aux_window(app.clone(), open_settings_window_internal);
            }
            if event.id().0 == HISTORY_MENU_ID {
                schedule_aux_window(app.clone(), open_history_window_internal);
            }
            if event.id().0 == TUTORIAL_MENU_ID {
                schedule_aux_window(app.clone(), open_tutorial_window_internal);
            }
        })
        .setup(|app| {
            let settings = load_settings(&app.handle());
            app.manage(AppState {
                running_task: Arc::new(Mutex::new(false)),
                task_process: Arc::new(Mutex::new(None)),
                settings: Arc::new(Mutex::new(settings)),
                task_snapshot: Arc::new(Mutex::new(TaskSnapshot::default())),
            });

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_app_bootstrap,
            save_app_settings,
            test_llm_connection,
            test_mineru_connection,
            inspect_glossary_runtime,
            open_settings_window,
            open_progress_window,
            open_tutorial_window,
            open_history_window,
            get_tutorial_content,
            open_tutorial_source,
            open_output_dir,
            get_translation_history,
            start_translation,
            cancel_translation,
            rerender_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
