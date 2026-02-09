use crate::db::{DbPool, Sales};
use crate::error::MyceliumResult;
use chrono::NaiveDate;
use tauri::{command, State};

#[command]
pub async fn get_daily_sales(
    state: State<'_, DbPool>,
    date: String,
    filter: String,
) -> MyceliumResult<Vec<Sales>> {
    let mut sql = "SELECT * FROM sales".to_string();
    let parsed_date = NaiveDate::parse_from_str(&date, "%Y-%m-%d").unwrap_or_default();

    match filter.as_str() {
        "order_date" => {
            sql.push_str(" WHERE order_date = $1 ORDER BY sales_id DESC");
        }
        _ => {
            // Default to order_date
            sql.push_str(" WHERE order_date = $1 ORDER BY sales_id DESC");
        }
    }

    Ok(sqlx::query_as::<_, Sales>(&sql)
        .bind(parsed_date)
        .fetch_all(&*state)
        .await?)
}

#[command]
pub async fn search_sales_by_any(
    state: State<'_, DbPool>,
    query: String,
) -> MyceliumResult<Vec<Sales>> {
    let search_pattern = format!("%{}%", query);
    // Search in product_name, customer_name, shipping_name, memo, tracking_number
    let sql = r#"
        SELECT s.*, c.customer_name, c.mobile_number as customer_mobile
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        WHERE s.product_name LIKE $1
           OR s.memo LIKE $1
           OR s.shipping_name LIKE $1
           OR s.tracking_number LIKE $1
           OR c.customer_name LIKE $1
           OR c.mobile_number LIKE $1
        ORDER BY s.order_date DESC
        LIMIT 100
    "#;

    Ok(sqlx::query_as::<_, Sales>(sql)
        .bind(search_pattern)
        .fetch_all(&*state)
        .await?)
}

#[command]
pub async fn get_sales_by_event_id_and_date_range(
    state: State<'_, DbPool>,
    event_id: String,
    start_date: String,
    end_date: String,
) -> MyceliumResult<Vec<Sales>> {
    let start = NaiveDate::parse_from_str(&start_date, "%Y-%m-%d").unwrap_or_default();
    let end = NaiveDate::parse_from_str(&end_date, "%Y-%m-%d").unwrap_or_default();

    let sql = r#"
        SELECT s.*, '' as customer_name
        FROM sales s
        WHERE s.customer_id = $1
          AND s.order_date BETWEEN $2 AND $3
        ORDER BY s.order_date DESC
    "#;

    Ok(sqlx::query_as::<_, Sales>(sql)
        .bind(event_id)
        .bind(start)
        .bind(end)
        .fetch_all(&*state)
        .await?)
}

#[command]
pub async fn get_daily_receipts(
    state: State<'_, DbPool>,
    date: String,
) -> MyceliumResult<Vec<Sales>> {
    // Receipts usually mean paid sales
    let parsed_date = NaiveDate::parse_from_str(&date, "%Y-%m-%d").unwrap_or_default();
    let sql = r#"
        SELECT 
            s.*, 
            COALESCE(c.customer_name, e.event_name, '비회원') as customer_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN event e ON s.customer_id = e.event_id
        WHERE s.order_date = $1
          AND s.status != '취소'
        ORDER BY s.sales_id DESC
    "#;
    Ok(sqlx::query_as::<_, Sales>(sql)
        .bind(parsed_date)
        .fetch_all(&*state)
        .await?)
}

#[command]
pub async fn get_sale_detail(
    state: State<'_, DbPool>,
    sales_id: String,
) -> MyceliumResult<Option<Sales>> {
    Ok(sqlx::query_as::<_, Sales>(
        r#"
        SELECT s.*, c.customer_name 
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        WHERE s.sales_id = $1
        "#,
    )
    .bind(sales_id)
    .fetch_optional(&*state)
    .await?)
}

#[command]
pub async fn get_customer_sales_on_date(
    state: State<'_, DbPool>,
    customer_id: String,
    date: String,
) -> MyceliumResult<Vec<Sales>> {
    // Parse date for validation, though we pass string to SQL
    let parsed_date = NaiveDate::parse_from_str(&date, "%Y-%m-%d").map_err(|e| {
        crate::error::MyceliumError::Internal(format!("Invalid date format: {}", e))
    })?;

    Ok(sqlx::query_as::<_, Sales>(
        "SELECT s.*, c.customer_name 
         FROM sales s
         LEFT JOIN customers c ON s.customer_id = c.customer_id
         WHERE s.customer_id = $1 
         AND s.order_date = $2 
         ORDER BY s.sales_id ASC",
    )
    .bind(customer_id)
    .bind(parsed_date)
    .fetch_all(&*state)
    .await?)
}

#[command]
pub async fn get_customer_sales_history(
    state: State<'_, DbPool>,
    customer_id: String,
) -> MyceliumResult<Vec<Sales>> {
    Ok(sqlx::query_as::<_, Sales>(
        "SELECT * FROM sales WHERE customer_id = $1 ORDER BY order_date DESC",
    )
    .bind(customer_id)
    .fetch_all(&*state)
    .await?)
}

#[command]
pub async fn get_tax_report(
    state: State<'_, DbPool>,
    start_date: String,
    end_date: String,
) -> MyceliumResult<Vec<Sales>> {
    let rows = sqlx::query_as::<_, Sales>(
        "SELECT s.*, COALESCE(p.tax_type, '면세') as tax_type
         FROM sales s 
         LEFT JOIN products p ON s.product_id = p.product_id
         WHERE s.order_date BETWEEN $1::DATE AND $2::DATE 
         ORDER BY s.order_date ASC",
    )
    .bind(start_date)
    .bind(end_date)
    .fetch_all(&*state)
    .await?;
    Ok(rows)
}
