use crate::commands::backup::logic::backup_database;
use crate::commands::backup::models::AutoBackupItem;
use crate::db::DbPool;
use crate::error::{MyceliumError, MyceliumResult};
use crate::{BACKUP_CANCELLED, DB_MODIFIED};
use std::sync::atomic::Ordering;

pub async fn cancel_backup_restore() {
    BACKUP_CANCELLED.store(true, Ordering::Relaxed);
    println!("[System] Cancellation requested by user.");
}

// Removed confirm_exit as it is Tauri-specific.
// Shutdown logic should be handled in main.rs.

pub async fn trigger_auto_backup(
    config_dir: &std::path::Path,
    pool: &DbPool,
) -> MyceliumResult<String> {
    if !DB_MODIFIED.load(Ordering::Relaxed) {
        return Ok("No changes".to_string());
    }

    let backup_dir = config_dir.join("backups");
    if !backup_dir.exists() {
        let _ = std::fs::create_dir_all(&backup_dir);
    }

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let backup_file_name = format!("auto_backup_{}.json.gz", timestamp);
    let backup_path = backup_dir.join(&backup_file_name);

    match backup_database(
        config_dir,
        pool,
        backup_path.to_string_lossy().to_string(),
        true, // is_incremental
        true, // use_compression (default)
    )
    .await
    {
        Ok(_) => {
            DB_MODIFIED.store(false, Ordering::Relaxed);

            // --- External Cloud Backup Branch ---
            let config_path = config_dir.join("config.json");
            if config_path.exists() {
                if let Ok(content) = std::fs::read_to_string(&config_path) {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(ext_path) =
                            json.get("external_backup_path").and_then(|v| v.as_str())
                        {
                            if !ext_path.trim().is_empty() {
                                let ext_dir = std::path::Path::new(ext_path);
                                if ext_dir.exists() {
                                    let ext_backup_path = ext_dir.join(backup_file_name);
                                    let _ = tokio::fs::copy(&backup_path, ext_backup_path).await;
                                }
                            }
                        }
                    }
                }
            }
            // ------------------------------------

            if let Ok(entries) = std::fs::read_dir(&backup_dir) {
                let mut backups: Vec<_> = entries
                    .filter_map(|e| e.ok())
                    .filter(|e| {
                        e.file_name().to_string_lossy().starts_with("auto_backup_")
                            && (e.file_name().to_string_lossy().ends_with(".sql")
                                || e.file_name().to_string_lossy().ends_with(".gz"))
                    })
                    .collect();
                backups.sort_by_key(|b| std::cmp::Reverse(b.file_name()));
                for backup in backups.iter().skip(30) {
                    let _ = std::fs::remove_file(backup.path());
                }
            }
            Ok(format!("Backup created: {:?}", backup_path))
        }
        Err(e) => Err(MyceliumError::Internal(format!("Backup failed: {}", e))),
    }
}

pub fn format_and_push(
    list: &mut Vec<AutoBackupItem>,
    path: std::path::PathBuf,
    datetime: chrono::DateTime<chrono::Local>,
    b_type: String,
    is_auto: bool,
    size: u64,
) {
    let now = chrono::Local::now();
    let diff = now.signed_duration_since(datetime);
    let ago = if diff.num_seconds() < 60 {
        format!("{}초 전", diff.num_seconds())
    } else if diff.num_minutes() < 60 {
        format!("{}분 전", diff.num_minutes())
    } else if diff.num_hours() < 24 {
        format!("{}시간 전", diff.num_hours())
    } else {
        format!("{}일 전", diff.num_days())
    };

    let formatted = format!("{} ({})", datetime.format("%Y-%m-%d %H:%M:%S"), ago);

    list.push(AutoBackupItem {
        filename: path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        path: path.to_string_lossy().to_string(),
        created_at: formatted,
        timestamp: datetime.timestamp(),
        backup_type: b_type,
        is_auto,
        size,
    });
}

pub async fn get_auto_backups(config_dir: &std::path::Path) -> MyceliumResult<Vec<AutoBackupItem>> {
    let mut list = Vec::new();

    // 1. Auto Backups
    let backup_dir = config_dir.join("backups");
    if backup_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&backup_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let fname = entry.file_name().to_string_lossy().to_string();
                if fname.starts_with("auto_backup_")
                    && (fname.ends_with(".sql") || fname.ends_with(".gz"))
                {
                    if let Ok(metadata) = entry.metadata() {
                        if let Ok(modified) = metadata.modified() {
                            let datetime: chrono::DateTime<chrono::Local> = modified.into();
                            let size = metadata.len();
                            format_and_push(
                                &mut list,
                                entry.path(),
                                datetime,
                                "자동".to_string(),
                                true,
                                size,
                            );
                        }
                    }
                }
            }
        }
    }

    // 2. Daily Backups
    let daily_dir = config_dir.join("daily_backups");
    if daily_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&daily_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let fname = entry.file_name().to_string_lossy().to_string();
                if fname.starts_with("daily_backup_")
                    && (fname.ends_with(".sql") || fname.ends_with(".gz"))
                {
                    if let Ok(metadata) = entry.metadata() {
                        if let Ok(modified) = metadata.modified() {
                            let datetime: chrono::DateTime<chrono::Local> = modified.into();
                            let size = metadata.len();
                            format_and_push(
                                &mut list,
                                entry.path(),
                                datetime,
                                "일일".to_string(),
                                false,
                                size,
                            );
                        }
                    }
                }
            }
        }
    }

    // Sort desc by timestamp
    list.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(list)
}

pub async fn run_daily_custom_backup(
    config_dir: &std::path::Path,
    pool: &DbPool,
    is_incremental: bool,
    use_compression: bool,
) -> MyceliumResult<String> {
    run_backup_logic(config_dir, pool, is_incremental, use_compression, true).await
}

pub async fn check_daily_backup(
    config_dir: &std::path::Path,
    pool: &DbPool,
) -> MyceliumResult<String> {
    run_backup_logic(config_dir, pool, true, true, false).await
}

async fn run_backup_logic(
    config_dir: &std::path::Path,
    pool: &DbPool,
    is_incremental: bool,
    use_compression: bool,
    force: bool,
) -> MyceliumResult<String> {
    let daily_dir = config_dir.join("daily_backups");
    if !daily_dir.exists() {
        let _ = std::fs::create_dir_all(&daily_dir);
    }

    let today = chrono::Local::now().format("%Y%m%d").to_string();
    let daily_extension = if use_compression { "json.gz" } else { "json" };
    let daily_filename = format!("daily_backup_{}.{}", today, daily_extension);
    let daily_path = daily_dir.join(&daily_filename);

    // Run if forced (manual button) OR if file doesn't exist (auto)
    if force || !daily_path.exists() {
        match backup_database(
            config_dir,
            pool,
            daily_path.to_string_lossy().to_string(),
            is_incremental,
            use_compression,
        )
        .await
        {
            Ok(msg) => {
                // --- External Cloud Backup Branch ---
                let config_path = config_dir.join("config.json");
                if let Ok(content) = std::fs::read_to_string(&config_path) {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(ext_path) =
                            json.get("external_backup_path").and_then(|v| v.as_str())
                        {
                            if !ext_path.trim().is_empty() {
                                let ext_dir = std::path::Path::new(ext_path);
                                if ext_dir.exists() {
                                    let ext_daily_dir = ext_dir.join("daily");
                                    let _ = tokio::fs::create_dir_all(&ext_daily_dir).await;
                                    let ext_backup_path = ext_daily_dir.join(&daily_filename);
                                    let _ = tokio::fs::copy(&daily_path, ext_backup_path).await;
                                }
                            }
                        }
                    }
                }

                // Cleanup old daily backups (Keep 90 days)
                if let Ok(entries) = std::fs::read_dir(&daily_dir) {
                    let mut backups: Vec<_> = entries
                        .filter_map(|e| e.ok())
                        .filter(|e| {
                            let fname_os = e.file_name();
                            let fname = fname_os.to_string_lossy();
                            fname.starts_with("daily_backup_")
                                && (fname.ends_with(".sql") || fname.ends_with(".gz"))
                        })
                        .collect();

                    backups.sort_by_key(|b| b.file_name());

                    if backups.len() > 90 {
                        let to_delete = backups.len() - 90;
                        for b in backups.iter().take(to_delete) {
                            let _ = std::fs::remove_file(b.path());
                        }
                    }
                }
                return Ok(msg);
            }
            Err(e) => return Err(e),
        }
    }
    Ok("Today's backup already exists".to_string())
}

pub async fn delete_backup(path: String) -> MyceliumResult<()> {
    std::fs::remove_file(path)
        .map_err(|e| MyceliumError::Internal(format!("Failed to delete backup file: {}", e)))?;
    Ok(())
}
