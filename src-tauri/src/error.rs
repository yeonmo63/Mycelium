use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum MyceliumError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Authentication failed: {0}")]
    Auth(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Migration error: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),

    #[error("Bcrypt error: {0}")]
    Bcrypt(#[from] bcrypt::BcryptError),

    #[error("Analysis error: {0}")]
    Polars(#[from] polars::prelude::PolarsError),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Base64 error: {0}")]
    Base64(#[from] base64::DecodeError),
}

// Custom Serialize implementation to make MyceliumError compatible with Tauri commands
impl Serialize for MyceliumError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type MyceliumResult<T> = Result<T, MyceliumError>;
