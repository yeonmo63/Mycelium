use serde_json;
use std::env;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

static CADDY_CHILD: Mutex<Option<Child>> = Mutex::new(Option::None);

/// Helper to get the current Tailscale domain name
fn get_tailscale_info() -> Option<String> {
    let output = Command::new("tailscale")
        .args(["status", "--json"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let v: serde_json::Value = serde_json::from_slice(&output.stdout).ok()?;
    v["Self"]["DNSName"]
        .as_str()
        .map(|s| s.trim_end_matches('.').to_string())
}

/// Starts the Caddy reverse proxy using the Tailscale domain.
pub fn start_caddy() {
    // 1. Detect Tailscale Domain
    let tailscale_domain = get_tailscale_info().unwrap_or_else(|| {
        tracing::warn!("⚠️  Could not detect Tailscale domain via CLI. Falling back to .env.");
        env::var("TAILSCALE_DOMAIN").unwrap_or_default()
    });

    if tailscale_domain.is_empty() {
        tracing::warn!("⚠️  Tailscale domain not found. Skipping Caddy HTTPS proxy.");
        return;
    }

    tracing::info!("🚀 Tailscale Domain Detected: {}", tailscale_domain);

    // 2. Locate Resources
    let exe_dir = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_default();
    let cwd = env::current_dir().unwrap_or_default();

    let mut resources_dir = PathBuf::new();
    let mut caddy_path = PathBuf::new();

    let search_paths = vec![
        exe_dir.join("resources"),
        cwd.join("resources"),
        exe_dir
            .parent()
            .and_then(|p| p.parent())
            .map(|p| p.join("resources"))
            .unwrap_or_default(),
    ];

    for path in search_paths {
        if path.join("bin").join("caddy.exe").exists() {
            resources_dir = path;
            caddy_path = resources_dir.join("bin").join("caddy.exe");
            break;
        }
    }

    if caddy_path.as_os_str().is_empty() {
        tracing::error!("❌ Caddy executable not found in resources/bin.");
        return;
    }

    // 3. Auto-provision Tailscale Certificates
    let cert_dir = resources_dir.join("certs");
    if !cert_dir.exists() {
        let _ = std::fs::create_dir_all(&cert_dir);
    }

    tracing::info!(
        "🔐 Provisioning Tailscale certificates for {}...",
        tailscale_domain
    );
    let cert_status = Command::new("tailscale")
        .args(["cert", &tailscale_domain])
        .current_dir(&cert_dir)
        .status();

    match cert_status {
        Ok(s) if s.success() => tracing::info!("✅ Certificates provisioned successfully."),
        _ => tracing::error!("❌ Failed to provision Tailscale certificates. Check if Tailscale is running and you have permissions."),
    }

    // 4. Start Caddy
    let caddyfile_path = resources_dir.join("Caddyfile");

    #[cfg(windows)]
    let mut command = Command::new(&caddy_path);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    #[cfg(not(windows))]
    let mut command = Command::new(&caddy_path);

    // Inject domain for Caddyfile to use
    command.env("TAILSCALE_DOMAIN", &tailscale_domain);
    command.current_dir(&resources_dir);

    let child = command
        .arg("run")
        .arg("--config")
        .arg("Caddyfile")
        .arg("--adapter")
        .arg("caddyfile")
        .spawn();

    match child {
        Ok(c) => {
            let mut guard = CADDY_CHILD.lock().unwrap();
            *guard = Some(c);
            tracing::info!("✨ Caddy is now running in the background.");
        }
        Err(e) => {
            tracing::error!("❌ Failed to spawn Caddy process: {}", e);
        }
    }
}

/// Stops the Caddy process if it is running.
pub fn stop_caddy() {
    let mut guard = CADDY_CHILD.lock().unwrap();
    if let Some(mut child) = guard.take() {
        println!("🛑 Stopping Caddy...");
        let _ = child.kill();
    }
}
