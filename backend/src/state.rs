use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub config_dir: std::path::PathBuf,
    pub setup_status: Arc<Mutex<SetupStatus>>,
    pub session: Arc<Mutex<SessionState>>, // Global session for single-user desktop-like usage
}

impl axum::extract::FromRef<AppState> for DbPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

impl axum::extract::FromRef<AppState> for std::path::PathBuf {
    fn from_ref(state: &AppState) -> Self {
        state.config_dir.clone()
    }
}

impl axum::extract::FromRef<AppState> for (DbPool, std::path::PathBuf) {
    fn from_ref(state: &AppState) -> Self {
        (state.pool.clone(), state.config_dir.clone())
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum SetupStatus {
    Initializing,
    Configured,
    NotConfigured,
}

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct SessionState {
    pub user_id: Option<i32>,
    pub username: Option<String>,
    pub role: Option<String>,
    pub ui_mode: Option<String>,
}
