use crate::error::{MyceliumError, MyceliumResult};
use std::fs;
use tauri::{command, AppHandle, Manager};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MallOrderItem {
    pub order_id: String,
    pub customer_name: String,
    pub receiver_name: String,
    pub mobile: String,
    pub zip: String,
    pub address: String,
    pub mall_product_name: String,
    pub qty: i32,
    pub unit_price: i32,
}

#[command]
pub async fn fetch_external_mall_orders(
    app: AppHandle,
    mall_type: String,
) -> MyceliumResult<Vec<MallOrderItem>> {
    // 1. Get Keys
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| MyceliumError::Internal(e.to_string()))?;
    let config_path = config_dir.join("config.json");

    if !config_path.exists() {
        return Err(MyceliumError::Internal("설정 파일이 없습니다.".to_string()));
    }

    let content =
        fs::read_to_string(&config_path).map_err(|e| MyceliumError::Internal(e.to_string()))?;
    let json: serde_json::Value = serde_json::from_str(&content).unwrap_or(serde_json::json!({}));

    // Placeholder for actual API implementation
    let _id = json
        .get(match mall_type.as_str() {
            "naver" => "naver_commerce_id",
            "coupang" => "coupang_access_key",
            _ => "",
        })
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if _id.is_empty() {
        return Err(MyceliumError::Internal(format!(
            "{} 연동 키가 설정되지 않았습니다.",
            mall_type
        )));
    }

    // Actual HTTP fetching would go here...
    Ok(vec![])
}
