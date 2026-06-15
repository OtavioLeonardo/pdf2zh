use std::{env, fs, path::PathBuf};

fn target_dir_from_out_dir() -> Option<PathBuf> {
    let out_dir = PathBuf::from(env::var_os("OUT_DIR")?);
    Some(out_dir.parent()?.parent()?.parent()?.to_path_buf())
}

fn remove_stale_bundled_resources() {
    let Some(target_dir) = target_dir_from_out_dir() else {
        return;
    };

    let resource_dir = target_dir.join("_up_");
    if resource_dir.exists() {
        let _ = fs::remove_dir_all(resource_dir);
    }
}

fn main() {
    // Tauri copies bundle resources into target/{profile}/_up_ during the build script.
    // Our bundled runtime binaries are executable-only, so a stale copy becomes read-only
    // and breaks incremental macOS builds when fs::copy tries to overwrite it.
    remove_stale_bundled_resources();
    tauri_build::build()
}
