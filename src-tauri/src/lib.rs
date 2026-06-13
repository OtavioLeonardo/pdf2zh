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
const SETTINGS_WINDOW_LABEL: &str = "settings";
const PROGRESS_WINDOW_LABEL: &str = "task-progress";
const TUTORIAL_WINDOW_LABEL: &str = "tutorial";
const SETTINGS_FILE_NAME: &str = "settings.json";
const README_FILE_NAME: &str = "README.md";

struct AppState {
    running_task: Arc<Mutex<bool>>,
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
    translated_md: Option<String>,
    translated_pdf: Option<String>,
    report_path: Option<String>,
    retried_segments: Option<u32>,
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
    translated_md: Option<String>,
    translated_pdf: Option<String>,
    report_path: Option<String>,
    retried_segments: Option<u32>,
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

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            provider: "openai".to_string(),
            model: "gpt-5.4-mini".to_string(),
            api_key: String::new(),
            glossary_strategy: "hybrid".to_string(),
            glossary_model: "gpt-5.4-mini".to_string(),
            mineru_api_url: String::new(),
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
            translated_md: None,
            translated_pdf: None,
            report_path: None,
            retried_segments: None,
            updated_at: 0,
        }
    }
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

    serde_json::from_str(&raw).unwrap_or_default()
}

fn persist_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = resolve_settings_path(app)?;
    let serialized = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("Failed to serialize settings: {error}"))?;

    fs::write(path, serialized).map_err(|error| format!("Failed to save settings: {error}"))
}

fn task_snapshot_from_event(event: &TranslationEvent) -> TaskSnapshot {
    let is_running =
        event.r#type != "result" && event.r#type != "error" && event.stage != "completed" && event.stage != "failed";

    TaskSnapshot {
        task_id: Some(event.task_id.clone()),
        r#type: event.r#type.clone(),
        stage: event.stage.clone(),
        progress: event.progress,
        message: event.message.clone(),
        is_running,
        output_dir: event.output_dir.clone(),
        translated_md: event.translated_md.clone(),
        translated_pdf: event.translated_pdf.clone(),
        report_path: event.report_path.clone(),
        retried_segments: event.retried_segments,
        updated_at: timestamp_millis(),
    }
}

fn sync_task_snapshot(state: &AppState, event: &TranslationEvent) {
    if let Ok(mut task) = state.task_snapshot.lock() {
        *task = task_snapshot_from_event(event);
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
) -> Result<WebviewWindow, String> {
    if let Some(existing) = app.get_webview_window(label) {
        ensure_window(existing.clone(), title)?;
        return Ok(existing);
    }

    let builder = WebviewWindowBuilder::new(app, label, WebviewUrl::default())
        .title(title)
        .inner_size(width, height)
        .min_inner_size(560.0, 460.0)
        .resizable(true)
        .center()
        .hidden_title(true)
        .title_bar_style(tauri::TitleBarStyle::Overlay);

    let main_window = app.get_webview_window("main");
    let builder = if let Some(main) = main_window {
        builder.parent(&main).map_err(|error| format!("Failed to set window parent: {error}"))?
    } else {
        builder
    };

    let window = builder
        .build()
        .map_err(|error| format!("Failed to build window: {error}"))?;

    ensure_window(window.clone(), title)?;
    Ok(window)
}

fn open_settings_window_internal(app: &AppHandle) -> Result<(), String> {
    create_aux_window(app, SETTINGS_WINDOW_LABEL, "设置", 720.0, 760.0).map(|_| ())
}

fn open_progress_window_internal(app: &AppHandle) -> Result<(), String> {
    create_aux_window(app, PROGRESS_WINDOW_LABEL, "任务详情", 760.0, 820.0).map(|_| ())
}

fn open_tutorial_window_internal(app: &AppHandle) -> Result<(), String> {
    create_aux_window(app, TUTORIAL_WINDOW_LABEL, "使用教程", 860.0, 860.0).map(|_| ())
}

fn resolve_readme_path() -> Result<PathBuf, String> {
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join(README_FILE_NAME);

    if dev_path.exists() {
        return Ok(dev_path);
    }

    Err("Could not locate README.md".to_string())
}

fn build_app_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let about = PredefinedMenuItem::about(app, None, None)?;
    let services = PredefinedMenuItem::services(app, None)?;
    let hide = PredefinedMenuItem::hide(app, None)?;
    let hide_others = PredefinedMenuItem::hide_others(app, None)?;
    let quit = PredefinedMenuItem::quit(app, None)?;
    let settings = MenuItem::with_id(app, SETTINGS_MENU_ID, "设置…", true, Some("CmdOrCtrl+,"))?;
    let tutorial = MenuItem::with_id(app, TUTORIAL_MENU_ID, "使用教程", true, Some("CmdOrCtrl+/"))?;

    let app_submenu = Submenu::with_items(
        app,
        app.package_info().name.clone(),
        true,
        &[
            &about,
            &PredefinedMenuItem::separator(app)?,
            &settings,
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
    let resource_candidate = app
        .path()
        .resource_dir()
        .ok()
        .map(|path| path.join("backend").join("translator_pipeline.py"));

    if let Some(path) = resource_candidate {
        if path.exists() {
            return Ok(path);
        }
    }

    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("backend")
        .join("translator_pipeline.py");

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

    let resource_candidate = app
        .path()
        .resource_dir()
        .ok()
        .map(|path| path.join("backend").join("runtime"));

    if let Some(path) = resource_candidate {
        if path.exists() {
            return Some(path);
        }
    }

    let dev_candidate = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("backend")
        .join("runtime");

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
            root.join("bin").join(binary_name("python3")),
            root.join("bin").join(binary_name("python")),
        ];

        for candidate in candidates {
            if candidate.exists() {
                return candidate.to_string_lossy().to_string();
            }
        }
    }

    "python3".to_string()
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

fn normalize_output_dir(path: &str) -> String {
    std::fs::canonicalize(path)
        .unwrap_or_else(|_| PathBuf::from(path))
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
fn open_settings_window(app: AppHandle) -> Result<(), String> {
    open_settings_window_internal(&app)
}

#[tauri::command]
fn open_progress_window(app: AppHandle) -> Result<(), String> {
    open_progress_window_internal(&app)
}

#[tauri::command]
fn open_tutorial_window(app: AppHandle) -> Result<(), String> {
    open_tutorial_window_internal(&app)
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
    let initial_event = TranslationEvent {
        task_id: task_id.clone(),
        r#type: "status".to_string(),
        stage: "queued".to_string(),
        progress: 2,
        message: "任务已提交，正在准备翻译流程。".to_string(),
        output_dir: Some(normalize_output_dir(&request.output_dir)),
        translated_md: None,
        translated_pdf: None,
        report_path: None,
        retried_segments: None,
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
    });

    let script_path = resolve_backend_script(&app)?;
    let runtime_root = resolve_runtime_root(&app);
    let python_bin = resolve_python_binary(runtime_root.as_deref());
    let task_id_for_thread = task_id.clone();
    let app_handle = app.clone();
    let state_handle = app.state::<AppState>();
    let running_task_arc = Arc::clone(&state_handle.inner().running_task);

    std::thread::spawn(move || {
        let result = run_translation_process(
            app_handle.clone(),
            running_task_arc.clone(),
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
                    translated_md: None,
                    translated_pdf: None,
                    report_path: None,
                    retried_segments: None,
                },
            );

            if let Ok(mut running) = running_task_arc.lock() {
                *running = false;
            }
        }
    });

    Ok(task_id)
}

fn run_translation_process(
    app: AppHandle,
    running_task: Arc<Mutex<bool>>,
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
                let _ = open_settings_window_internal(app);
            }
            if event.id().0 == TUTORIAL_MENU_ID {
                let _ = open_tutorial_window_internal(app);
            }
        })
        .setup(|app| {
            let settings = load_settings(&app.handle());
            app.manage(AppState {
                running_task: Arc::new(Mutex::new(false)),
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
            open_settings_window,
            open_progress_window,
            open_tutorial_window,
            get_tutorial_content,
            open_tutorial_source,
            open_output_dir,
            start_translation
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
