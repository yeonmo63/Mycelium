use crate::db::{DbPool, HarvestRecord};
use crate::error::MyceliumResult;
use sqlx::{query, query_as};
use tauri::{command, State};

#[command]
pub async fn get_harvest_records(
    state: State<'_, DbPool>,
    batch_id: Option<i32>,
) -> MyceliumResult<Vec<HarvestRecord>> {
    let pool = state.inner();
    let records = if let Some(bid) = batch_id {
        query_as::<_, HarvestRecord>(
            "SELECT * FROM harvest_records WHERE batch_id = $1 ORDER BY harvest_date DESC",
        )
        .bind(bid)
        .fetch_all(pool)
        .await?
    } else {
        query_as::<_, HarvestRecord>(
            "SELECT * FROM harvest_records ORDER BY harvest_date DESC LIMIT 50",
        )
        .fetch_all(pool)
        .await?
    };
    Ok(records)
}

#[command]
pub async fn save_harvest_record(
    state: State<'_, DbPool>,
    record: HarvestRecord,
    complete_batch: Option<bool>,
) -> MyceliumResult<()> {
    let pool = state.inner();
    let mut tx = pool.begin().await?;

    // 1. Get Product ID from Batch
    let batch_info: (i32, String) =
        sqlx::query_as("SELECT product_id, batch_code FROM production_batches WHERE batch_id = $1")
            .bind(record.batch_id)
            .fetch_one(&mut *tx)
            .await?;

    let product_id = batch_info.0;
    let b_code = batch_info.1;

    // 2. Save Harvest Record
    if record.harvest_id > 0 {
        sqlx::query(
            "UPDATE harvest_records SET 
                batch_id = $1, harvest_date = $2, quantity = $3, unit = $4, grade = $5, 
                traceability_code = $6, memo = $7, package_count = $8, weight_per_package = $9, 
                package_unit = $10, updated_at = CURRENT_TIMESTAMP WHERE harvest_id = $11",
        )
        .bind(record.batch_id)
        .bind(record.harvest_date)
        .bind(&record.quantity)
        .bind(&record.unit)
        .bind(&record.grade)
        .bind(&record.traceability_code)
        .bind(&record.memo)
        .bind(record.package_count)
        .bind(&record.weight_per_package)
        .bind(&record.package_unit)
        .bind(record.harvest_id)
        .execute(&mut *tx)
        .await?;
    } else {
        sqlx::query(
            "INSERT INTO harvest_records (
                batch_id, harvest_date, quantity, unit, grade, traceability_code, memo, 
                package_count, weight_per_package, package_unit
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        )
        .bind(record.batch_id)
        .bind(record.harvest_date)
        .bind(&record.quantity)
        .bind(&record.unit)
        .bind(&record.grade)
        .bind(&record.traceability_code)
        .bind(&record.memo)
        .bind(record.package_count)
        .bind(&record.weight_per_package)
        .bind(&record.package_unit)
        .execute(&mut *tx)
        .await?;
    }

    // 3. Update Product Stock
    if record.harvest_id == 0 {
        let qty_f64: f64 = record.quantity.to_string().parse().unwrap_or(0.0);

        sqlx::query(
            "UPDATE products SET stock_quantity = stock_quantity + $1 WHERE product_id = $2",
        )
        .bind(qty_f64 as i32)
        .bind(product_id)
        .execute(&mut *tx)
        .await?;

        // Add Inventory Log
        let p_name: String =
            sqlx::query_scalar("SELECT product_name FROM products WHERE product_id = $1")
                .bind(product_id)
                .fetch_one(&mut *tx)
                .await?;

        sqlx::query(
            "INSERT INTO inventory_logs (product_id, product_name, change_type, change_quantity, current_stock, memo, reference_id) 
             VALUES ($1, $2, '입고', $3, (SELECT stock_quantity FROM products WHERE product_id = $1), $4, $5)"
        )
        .bind(product_id)
        .bind(&p_name)
        .bind(qty_f64 as i32)
        .bind(format!("수확 입고 (배치: {})", b_code))
        .bind(format!("HARVEST_{}", b_code))
        .execute(&mut *tx).await?;
    }

    // 4. Handle Batch Completion
    if complete_batch.unwrap_or(false) {
        sqlx::query(
            "UPDATE production_batches SET status = 'completed', end_date = $1 WHERE batch_id = $2",
        )
        .bind(record.harvest_date)
        .bind(record.batch_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

#[command]
pub async fn save_harvest_batch(
    state: State<'_, DbPool>,
    records: Vec<HarvestRecord>,
) -> MyceliumResult<()> {
    let pool = state.inner();
    let mut tx = pool.begin().await?;

    for record in records {
        // 1. Get Product ID from Batch
        let batch_info: (i32, String) = sqlx::query_as(
            "SELECT product_id, batch_code FROM production_batches WHERE batch_id = $1",
        )
        .bind(record.batch_id)
        .fetch_one(&mut *tx)
        .await?;

        let product_id = batch_info.0;
        let b_code = batch_info.1;

        // 2. Insert Harvest Record
        sqlx::query(
            "INSERT INTO harvest_records (
                batch_id, harvest_date, quantity, unit, grade, traceability_code, memo, 
                package_count, weight_per_package, package_unit
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        )
        .bind(record.batch_id)
        .bind(record.harvest_date)
        .bind(&record.quantity)
        .bind(&record.unit)
        .bind(&record.grade)
        .bind(&record.traceability_code)
        .bind(&record.memo)
        .bind(record.package_count)
        .bind(&record.weight_per_package)
        .bind(&record.package_unit)
        .execute(&mut *tx)
        .await?;

        // 3. Update Product Stock
        let qty_f64: f64 = record.quantity.to_string().parse().unwrap_or(0.0);
        sqlx::query(
            "UPDATE products SET stock_quantity = stock_quantity + $1 WHERE product_id = $2",
        )
        .bind(qty_f64 as i32)
        .bind(product_id)
        .execute(&mut *tx)
        .await?;

        // 4. Add Inventory Log
        let p_name: String =
            sqlx::query_scalar("SELECT product_name FROM products WHERE product_id = $1")
                .bind(product_id)
                .fetch_one(&mut *tx)
                .await?;

        sqlx::query(
            "INSERT INTO inventory_logs (product_id, product_name, change_type, change_quantity, current_stock, memo, reference_id) 
             VALUES ($1, $2, '입고', $3, (SELECT stock_quantity FROM products WHERE product_id = $1), $4, $5)"
        )
        .bind(product_id)
        .bind(&p_name)
        .bind(qty_f64 as i32)
        .bind(format!("수확 입고(일괄): {}", b_code))
        .bind(format!("HARVEST_{}_{}", b_code, chrono::Utc::now().timestamp()))
        .execute(&mut *tx).await?;
    }

    tx.commit().await?;
    Ok(())
}

#[command]
pub async fn delete_harvest_record(
    state: State<'_, DbPool>,
    harvest_id: i32,
) -> MyceliumResult<()> {
    let pool = state.inner();
    query("DELETE FROM harvest_records WHERE harvest_id = $1")
        .bind(harvest_id)
        .execute(pool)
        .await?;
    Ok(())
}
