use crate::commands::backup::auto::{get_auto_backups, run_daily_custom_backup};
use crate::commands::backup::logic::restore_database;
use crate::commands::backup::maintenance::{cleanup_old_logs, run_db_maintenance};
use crate::commands::backup::models::AutoBackupItem;
use crate::commands::backup::status::get_backup_status as get_status_cmd;
use crate::commands::config::get_app_config_dir;
use crate::error::{MyceliumError, MyceliumResult};
use crate::middleware::auth::Claims;
use crate::state::AppState;
use axum::extract::{Json, State as AxumState};
use axum::Extension;
use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
pub struct RunBackupPayload {
    #[serde(default)]
    pub is_incremental: bool,
    #[serde(default)]
    pub use_compression: bool,
}

#[derive(Deserialize)]
pub struct RestorePayload {
    pub path: String,
}

#[derive(Deserialize)]
pub struct CleanupPayload {
    pub months: i32,
}

#[derive(Deserialize)]
pub struct SavePathPayload {
    pub path: String,
}

pub async fn get_auto_backups_axum(
    Extension(claims): Extension<Claims>,
) -> MyceliumResult<Json<Vec<AutoBackupItem>>> {
    if !claims.is_admin() {
        return Err(MyceliumError::Validation(
            "Admin access required".to_string(),
        ));
    }
    let config_dir = get_app_config_dir()?;
    let result = get_auto_backups(&config_dir).await?;
    Ok(Json(result))
}

pub async fn run_daily_custom_backup_axum(
    AxumState(state): AxumState<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<RunBackupPayload>,
) -> MyceliumResult<Json<String>> {
    if !claims.is_admin() {
        return Err(MyceliumError::Validation(
            "Admin access required".to_string(),
        ));
    }
    let config_dir = get_app_config_dir()?;
    let result = run_daily_custom_backup(
        &config_dir,
        &state.pool,
        payload.is_incremental,
        payload.use_compression,
    )
    .await?;
    Ok(Json(result))
}

pub async fn restore_database_axum(
    AxumState(state): AxumState<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<RestorePayload>,
) -> MyceliumResult<Json<String>> {
    if !claims.is_admin() {
        return Err(MyceliumError::Validation(
            "Admin access required".to_string(),
        ));
    }
    let result = restore_database(&state.pool, payload.path).await?;
    Ok(Json(result))
}

pub async fn run_db_maintenance_axum(
    AxumState(state): AxumState<AppState>,
    Extension(claims): Extension<Claims>,
) -> MyceliumResult<Json<String>> {
    if !claims.is_admin() {
        return Err(MyceliumError::Validation(
            "Admin access required".to_string(),
        ));
    }
    let result = run_db_maintenance(&state.pool).await?;
    Ok(Json(result))
}

pub async fn cleanup_old_logs_axum(
    AxumState(state): AxumState<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CleanupPayload>,
) -> MyceliumResult<Json<u64>> {
    if !claims.is_admin() {
        return Err(MyceliumError::Validation(
            "Admin access required".to_string(),
        ));
    }
    let result = cleanup_old_logs(&state.pool, payload.months).await?;
    Ok(Json(result))
}

pub async fn get_internal_backup_path_axum(
    Extension(claims): Extension<Claims>,
) -> MyceliumResult<Json<String>> {
    if !claims.is_admin() {
        return Err(MyceliumError::Validation(
            "Admin access required".to_string(),
        ));
    }
    let dir = get_app_config_dir()?.join("daily_backups");
    Ok(Json(dir.to_string_lossy().to_string()))
}

fn get_config_path() -> MyceliumResult<std::path::PathBuf> {
    get_app_config_dir().map(|d| d.join("config.json"))
}

pub async fn get_external_backup_path_axum(
    Extension(claims): Extension<Claims>,
) -> MyceliumResult<Json<String>> {
    if !claims.is_admin() {
        return Err(MyceliumError::Validation(
            "Admin access required".to_string(),
        ));
    }
    let path = get_config_path()?;
    if path.exists() {
        let content =
            std::fs::read_to_string(&path).map_err(|e| MyceliumError::Internal(e.to_string()))?;
        let json: Value = serde_json::from_str(&content).unwrap_or(serde_json::json!({}));
        let ext_path = json["external_backup_path"]
            .as_str()
            .unwrap_or("")
            .to_string();
        Ok(Json(ext_path))
    } else {
        Ok(Json("".to_string()))
    }
}

pub async fn save_external_backup_path_axum(
    Extension(claims): Extension<Claims>,
    Json(payload): Json<SavePathPayload>,
) -> MyceliumResult<Json<()>> {
    if !claims.is_admin() {
        return Err(MyceliumError::Validation(
            "Admin access required".to_string(),
        ));
    }
    let path = get_config_path()?;
    let mut json: Value = if path.exists() {
        let content =
            std::fs::read_to_string(&path).map_err(|e| MyceliumError::Internal(e.to_string()))?;
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    json["external_backup_path"] = serde_json::Value::String(payload.path);

    std::fs::write(
        &path,
        serde_json::to_string_pretty(&json).map_err(|e| MyceliumError::Internal(e.to_string()))?,
    )
    .map_err(|e| MyceliumError::Internal(e.to_string()))?;
    Ok(Json(()))
}

pub async fn get_backup_status_axum(
    Extension(claims): Extension<Claims>,
) -> MyceliumResult<Json<Value>> {
    if !claims.is_admin() {
        return Err(MyceliumError::Validation(
            "Admin access required".to_string(),
        ));
    }
    let config_dir = get_app_config_dir()?;
    let status = get_status_cmd(&config_dir).await?;
    Ok(Json(status))
}

pub async fn cancel_backup_restore_axum() -> MyceliumResult<Json<()>> {
    Ok(Json(()))
}

pub async fn get_live_progress_axum() -> MyceliumResult<Json<Value>> {
    if let Ok(progress) = crate::BACKUP_PROGRESS.lock() {
        if let Some(p) = progress.as_ref() {
            return Ok(Json(p.clone()));
        }
    }
    Ok(Json(
        serde_json::json!({ "processed": 0, "total": 0, "message": "대기 중...", "percentage": 0 }),
    ))
}
