use crate::db::{DbPool, FarmingLog, HarvestRecord, ProductionBatch, ProductionSpace};
use crate::error::{MyceliumError, MyceliumResult};
use ::image as image_crate;
use chrono::NaiveDate;
use printpdf::path::{PaintMode, WindingOrder};
use printpdf::*;
use sqlx::{query, query_as};
use std::fs::File;
use std::io::BufWriter;
use std::iter::FromIterator;
use std::path::PathBuf;
use tauri::command;
use tauri::Manager;
use tauri::State;

#[command]
pub async fn get_production_spaces(
    state: State<'_, DbPool>,
) -> MyceliumResult<Vec<ProductionSpace>> {
    let pool = state.inner();
    let spaces =
        query_as::<_, ProductionSpace>("SELECT * FROM production_spaces ORDER BY space_id ASC")
            .fetch_all(pool)
            .await?;
    Ok(spaces)
}

#[command]
pub async fn save_production_space(
    state: State<'_, DbPool>,
    space: ProductionSpace,
) -> MyceliumResult<()> {
    let pool = state.inner();
    if space.space_id > 0 {
        query(
            "UPDATE production_spaces SET space_name = $1, space_type = $2, location_info = $3, area_size = $4, area_unit = $5, is_active = $6, memo = $7, updated_at = CURRENT_TIMESTAMP WHERE space_id = $8"
        )
        .bind(&space.space_name)
        .bind(&space.space_type)
        .bind(&space.location_info)
        .bind(&space.area_size)
        .bind(&space.area_unit)
        .bind(space.is_active)
        .bind(&space.memo)
        .bind(space.space_id)
        .execute(pool)
        .await?;
    } else {
        query(
            "INSERT INTO production_spaces (space_name, space_type, location_info, area_size, area_unit, is_active, memo) VALUES ($1, $2, $3, $4, $5, $6, $7)"
        )
        .bind(&space.space_name)
        .bind(&space.space_type)
        .bind(&space.location_info)
        .bind(&space.area_size)
        .bind(&space.area_unit)
        .bind(space.is_active)
        .bind(&space.memo)
        .execute(pool)
        .await?;
    }
    Ok(())
}

#[command]
pub async fn delete_production_space(
    state: State<'_, DbPool>,
    space_id: i32,
) -> MyceliumResult<()> {
    let pool = state.inner();
    query("DELETE FROM production_spaces WHERE space_id = $1")
        .bind(space_id)
        .execute(pool)
        .await?;
    Ok(())
}

#[command]
pub async fn get_production_batches(
    state: State<'_, DbPool>,
) -> MyceliumResult<Vec<ProductionBatch>> {
    let pool = state.inner();
    let batches =
        query_as::<_, ProductionBatch>("SELECT * FROM production_batches ORDER BY start_date DESC")
            .fetch_all(pool)
            .await?;
    Ok(batches)
}

#[command]
pub async fn save_production_batch(
    state: State<'_, DbPool>,
    batch: ProductionBatch,
) -> MyceliumResult<()> {
    let pool = state.inner();
    if batch.batch_id > 0 {
        query(
            "UPDATE production_batches SET batch_code = $1, product_id = $2, space_id = $3, start_date = $4, end_date = $5, expected_harvest_date = $6, status = $7, initial_quantity = $8, unit = $9, updated_at = CURRENT_TIMESTAMP WHERE batch_id = $10"
        )
        .bind(&batch.batch_code)
        .bind(batch.product_id)
        .bind(batch.space_id)
        .bind(batch.start_date)
        .bind(batch.end_date)
        .bind(batch.expected_harvest_date)
        .bind(&batch.status)
        .bind(&batch.initial_quantity)
        .bind(&batch.unit)
        .bind(batch.batch_id)
        .execute(pool)
        .await?;
    } else {
        query(
            "INSERT INTO production_batches (batch_code, product_id, space_id, start_date, end_date, expected_harvest_date, status, initial_quantity, unit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
        )
        .bind(&batch.batch_code)
        .bind(batch.product_id)
        .bind(batch.space_id)
        .bind(batch.start_date)
        .bind(batch.end_date)
        .bind(batch.expected_harvest_date)
        .bind(&batch.status)
        .bind(&batch.initial_quantity)
        .bind(&batch.unit)
        .execute(pool)
        .await?;
    }
    Ok(())
}

#[command]
pub async fn delete_production_batch(
    state: State<'_, DbPool>,
    batch_id: i32,
) -> MyceliumResult<()> {
    let pool = state.inner();
    query("DELETE FROM production_batches WHERE batch_id = $1")
        .bind(batch_id)
        .execute(pool)
        .await?;
    Ok(())
}

#[command]
pub async fn get_farming_logs(
    state: State<'_, DbPool>,
    batch_id: Option<i32>,
    space_id: Option<i32>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> MyceliumResult<Vec<FarmingLog>> {
    let pool = state.inner();

    let logs = query_as::<_, FarmingLog>(
        "SELECT * FROM farming_logs 
         WHERE ($1::INT IS NULL OR batch_id = $1)
           AND ($2::INT IS NULL OR space_id = $2)
           AND ($3::TEXT IS NULL OR log_date >= $3::DATE)
           AND ($4::TEXT IS NULL OR log_date <= $4::DATE)
         ORDER BY log_date DESC, log_id DESC",
    )
    .bind(batch_id)
    .bind(space_id)
    .bind(start_date)
    .bind(end_date)
    .fetch_all(pool)
    .await?;

    Ok(logs)
}

#[command]
pub async fn save_farming_log(state: State<'_, DbPool>, log: FarmingLog) -> MyceliumResult<()> {
    let pool = state.inner();
    if log.log_id > 0 {
        query(
            "UPDATE farming_logs SET batch_id = $1, space_id = $2, log_date = $3, worker_name = $4, work_type = $5, work_content = $6, input_materials = $7, env_data = $8, photos = $9, updated_at = CURRENT_TIMESTAMP WHERE log_id = $10"
        )
        .bind(log.batch_id)
        .bind(log.space_id)
        .bind(log.log_date)
        .bind(&log.worker_name)
        .bind(&log.work_type)
        .bind(&log.work_content)
        .bind(&log.input_materials)
        .bind(&log.env_data)
        .bind(&log.photos)
        .bind(log.log_id)
        .execute(pool)
        .await?;
    } else {
        query(
            "INSERT INTO farming_logs (batch_id, space_id, log_date, worker_name, work_type, work_content, input_materials, env_data, photos) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
        )
        .bind(log.batch_id)
        .bind(log.space_id)
        .bind(log.log_date)
        .bind(&log.worker_name)
        .bind(&log.work_type)
        .bind(&log.work_content)
        .bind(&log.input_materials)
        .bind(&log.env_data)
        .bind(&log.photos)
        .execute(pool)
        .await?;
    }
    Ok(())
}

#[command]
pub async fn delete_farming_log(state: State<'_, DbPool>, log_id: i32) -> MyceliumResult<()> {
    let pool = state.inner();
    query("DELETE FROM farming_logs WHERE log_id = $1")
        .bind(log_id)
        .execute(pool)
        .await?;
    Ok(())
}

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
) -> MyceliumResult<()> {
    let pool = state.inner();
    if record.harvest_id > 0 {
        query(
            "UPDATE harvest_records SET batch_id = $1, harvest_date = $2, quantity = $3, unit = $4, grade = $5, traceability_code = $6, memo = $7, updated_at = CURRENT_TIMESTAMP WHERE harvest_id = $8"
        )
        .bind(record.batch_id)
        .bind(record.harvest_date)
        .bind(&record.quantity)
        .bind(&record.unit)
        .bind(&record.grade)
        .bind(&record.traceability_code)
        .bind(&record.memo)
        .bind(record.harvest_id)
        .execute(pool)
        .await?;
    } else {
        query(
            "INSERT INTO harvest_records (batch_id, harvest_date, quantity, unit, grade, traceability_code, memo) VALUES ($1, $2, $3, $4, $5, $6, $7)"
        )
        .bind(record.batch_id)
        .bind(record.harvest_date)
        .bind(&record.quantity)
        .bind(&record.unit)
        .bind(&record.grade)
        .bind(&record.traceability_code)
        .bind(&record.memo)
        .execute(pool)
        .await?;
    }
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

#[command]
pub async fn upload_farming_photo(
    app: tauri::AppHandle,
    file_path: String,
) -> MyceliumResult<String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| MyceliumError::Internal(format!("App dir error: {}", e)))?;
    let media_dir = app_dir.join("media");
    if !media_dir.exists() {
        std::fs::create_dir_all(&media_dir)?;
    }

    let path = std::path::Path::new(&file_path);
    let extension = path.extension().and_then(|e| e.to_str()).unwrap_or("png");
    let file_name = format!(
        "farm_{}_{}.{}",
        chrono::Utc::now().timestamp(),
        uuid::Uuid::new_v4().to_string().split_at(8).0,
        extension
    );
    let target_path = media_dir.join(&file_name);

    std::fs::copy(path, &target_path)?;
    Ok(file_name)
}

#[command]
pub async fn get_media_base64(app: tauri::AppHandle, file_name: String) -> MyceliumResult<String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| MyceliumError::Internal(format!("App dir error: {}", e)))?;
    let media_path = app_dir.join("media").join(&file_name);

    if !media_path.exists() {
        return Err(MyceliumError::Internal(format!(
            "File not found: {}",
            file_name
        )));
    }

    let bytes = std::fs::read(&media_path)?;
    let extension = media_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    let mime_type = match extension.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        _ => "image/png",
    };

    use base64::{engine::general_purpose, Engine as _};
    let base64_str = general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime_type, base64_str))
}

#[command]
pub async fn generate_production_pdf(
    state: State<'_, DbPool>,
    app: tauri::AppHandle,
    save_path: String,
    start_date: String,
    end_date: String,
    include_attachments: bool,
    include_approval: bool,
) -> MyceliumResult<()> {
    let pool = state.inner().clone();

    // 1. Fetch Data
    let company_info = sqlx::query_as::<_, crate::db::CompanyInfo>(
        "SELECT id, company_name, representative_name, address, business_type, item, 
             phone_number, mobile_number, business_reg_number, registration_date, memo, 
             created_at, updated_at 
             FROM company_info LIMIT 1",
    )
    .fetch_optional(&pool)
    .await?
    .unwrap_or_default();

    let start_naive = NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
        .map_err(|e| MyceliumError::Internal(format!("Invalid start date: {}", e)))?;
    let end_naive = NaiveDate::parse_from_str(&end_date, "%Y-%m-%d")
        .map_err(|e| MyceliumError::Internal(format!("Invalid end date: {}", e)))?;

    let raw_logs = sqlx::query_as::<_, FarmingLog>(
        "SELECT * FROM farming_logs WHERE log_date BETWEEN $1 AND $2 ORDER BY log_date ASC",
    )
    .bind(start_naive)
    .bind(end_naive)
    .fetch_all(&pool)
    .await?;

    let media_dir: std::path::PathBuf = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("media"))
        .join("media");

    let work_types = std::collections::HashMap::from([
        ("plant", "식재/종균접종"),
        ("water", "관수/영양제"),
        ("fertilize", "비료/시비"),
        ("pesticide", "방제/약제"),
        ("harvest", "수확/채취"),
        ("process", "가공/포장"),
        ("clean", "청소/소독"),
        ("inspect", "점검/예찰"),
        ("education", "교육/훈련"),
    ]);

    tokio::task::spawn_blocking(move || {
        // --- CONSTANTS (A4 mm) ---
        let page_w = Mm(210.0);
        let page_h = Mm(297.0);
        let margin_x: f32 = 10.0;
        let content_w: f32 = 190.0;

        let (doc, page1, layer1) = PdfDocument::new("GAP Log", page_w, page_h, "Layer 1");

        let font_path = std::path::Path::new("C:\\Windows\\Fonts\\malgun.ttf");
        let font = doc
            .add_external_font(
                File::open(font_path)
                    .map_err(|e| MyceliumError::Internal(format!("Font error: {}", e)))?,
            )
            .map_err(|e| MyceliumError::Internal(format!("Font load error: {}", e)))?;

        // Helper for left-aligned text
        let draw_text = |layer: &PdfLayerReference, x: f32, y: f32, size: f32, txt: &str| {
            layer.begin_text_section();
            layer.set_font(&font, size);
            layer.set_text_cursor(Mm(x), Mm(y));
            layer.write_text(txt, &font);
            layer.end_text_section();
        };

        // Helper for centered text in a column (Corrected Pt to Mm math)
        let draw_text_centered = |layer: &PdfLayerReference,
                                  col_start: f32,
                                  col_width: f32,
                                  y: f32,
                                  size: f32,
                                  txt: &str| {
            // 1pt = 0.352778mm. Korean chars are roughly em-square.
            let mut total_width_mm: f32 = 0.0;
            for c in txt.chars() {
                if c.is_ascii() {
                    total_width_mm += size * 0.5 * 0.3527; // ASCII roughly 0.5 width
                } else {
                    total_width_mm += size * 1.0 * 0.3527; // CJK roughly 1.0 width
                }
            }
            let x = col_start + (col_width - total_width_mm) / 2.0;
            layer.begin_text_section();
            layer.set_font(&font, size);
            layer.set_text_cursor(Mm(x.max(col_start)), Mm(y));
            layer.write_text(txt, &font);
            layer.end_text_section();
        };

        // Helper to draw rectangle using Polygon (printpdf 0.7 API)
        let draw_rect = |layer: &PdfLayerReference, x: f32, y: f32, w: f32, h: f32| {
            let pts = vec![
                (Point::new(Mm(x), Mm(y)), false),
                (Point::new(Mm(x + w), Mm(y)), false),
                (Point::new(Mm(x + w), Mm(y + h)), false),
                (Point::new(Mm(x), Mm(y + h)), false),
            ];
            let polygon = Polygon {
                rings: vec![pts],
                mode: PaintMode::Stroke,
                winding_order: WindingOrder::NonZero,
            };
            layer.add_polygon(polygon);
        };

        // Helper to draw a simple line
        let draw_line = |layer: &PdfLayerReference, x1: f32, y1: f32, x2: f32, y2: f32| {
            let line = Line::from_iter(vec![
                (Point::new(Mm(x1), Mm(y1)), false),
                (Point::new(Mm(x2), Mm(y2)), false),
            ]);
            layer.add_line(line);
        };

        // Pre-calculate photo mapping for sequential numbering
        let mut photo_map = std::collections::HashMap::new();
        let mut current_idx = 1;
        for log in &raw_logs {
            if let Some(arr) = log.photos.as_ref().and_then(|v| v.as_array()) {
                for p in arr {
                    if let Some(path) = p.get("path").and_then(|v| v.as_str()) {
                        if !photo_map.contains_key(path) {
                            photo_map.insert(path.to_string(), current_idx);
                            current_idx += 1;
                        }
                    }
                }
            }
        }

        let mut current_layer = doc.get_page(page1).get_layer(layer1);
        let mut current_y: f32 = 262.0; // Increased TOP MARGIN (297 - 262 = 35mm) for binding

        // 1. HEADER AREA (Title + Period)
        // Title and period without box and English
        // Title (Bold effect)
        draw_text(
            &current_layer,
            margin_x,
            current_y,
            20.0,
            "영농 및 작업 기록장",
        );
        draw_text(
            &current_layer,
            margin_x + 0.2,
            current_y,
            20.0,
            "영농 및 작업 기록장",
        );
        // 기록 기간 (Bold effect)
        let period_txt = format!("기록 기간: {} ~ {}", start_date, end_date);
        draw_text(
            &current_layer,
            margin_x,
            current_y - 10.0,
            10.0,
            &period_txt,
        );
        draw_text(
            &current_layer,
            margin_x + 0.1,
            current_y - 10.0,
            10.0,
            &period_txt,
        );

        // Approval block on the right
        if include_approval {
            let app_w: f32 = 68.0;
            let app_h: f32 = 24.0;
            let app_x = margin_x + content_w - app_w;
            let app_y = current_y - 14.0;

            current_layer.set_outline_thickness(2.0); // Outer border remains thick
            draw_rect(&current_layer, app_x, app_y, app_w, app_h);

            // Refine inner lines to be thinner (0.5)
            current_layer.set_outline_thickness(0.5);

            // Vertical dividers for approval
            let v1 = app_x + 8.0;
            let v2 = v1 + 20.0;
            let v3 = v2 + 20.0;
            draw_line(&current_layer, v1, app_y, v1, app_y + app_h);
            draw_line(&current_layer, v2, app_y, v2, app_y + app_h);
            draw_line(&current_layer, v3, app_y, v3, app_y + app_h);

            // Horizontal divider for labels
            let h_label = app_y + app_h - 6.0;
            draw_line(&current_layer, v1, h_label, app_x + app_w, h_label);

            // Approval Labels - Slightly adjusted for centering
            draw_text_centered(&current_layer, app_x, 8.0, app_y + 9.0, 8.0, "결재");
            draw_text_centered(&current_layer, v1, 20.0, h_label + 2.0, 8.0, "담당");
            draw_text_centered(&current_layer, v2, 20.0, h_label + 2.0, 8.0, "검토");
            draw_text_centered(&current_layer, v3, 20.0, h_label + 2.0, 8.0, "승인");

            current_y = app_y - 10.0;
        } else {
            current_y -= 14.0;
        }

        // 2. COMPANY INFO BOX
        let box_h: f32 = 28.0;
        let box_top = current_y;
        let box_bot = box_top - box_h;

        // Outer Box (Thicker border)
        current_layer.set_outline_thickness(2.0);
        current_layer.set_outline_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
        draw_rect(&current_layer, margin_x, box_bot, content_w, box_h);

        // Inner Lines
        current_layer.set_outline_thickness(0.5);
        current_layer.set_outline_color(Color::Rgb(Rgb::new(0.6, 0.6, 0.6, None)));

        let mid_y = box_top - (box_h / 2.0);
        draw_line(&current_layer, margin_x, mid_y, margin_x + content_w, mid_y);

        let x1 = margin_x + (content_w * 0.15);
        let x2 = margin_x + (content_w * 0.50);
        let x3 = margin_x + (content_w * 0.65);

        for x in [x1, x2, x3] {
            draw_line(&current_layer, x, box_bot, x, box_top);
        }

        let c_name = if company_info.company_name.trim().is_empty() {
            "-"
        } else {
            &company_info.company_name
        };
        let r_name = company_info.representative_name.as_deref().unwrap_or("-");
        let gap_num = company_info
            .certification_info
            .as_ref()
            .and_then(|c| c.get("gap"))
            .and_then(|v| v.as_str())
            .unwrap_or("-");
        let haccp_num = company_info
            .certification_info
            .as_ref()
            .and_then(|c| c.get("haccp"))
            .and_then(|v| v.as_str())
            .unwrap_or("-");

        current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
        let ty1 = mid_y + 5.0; // Adjusted for centering in 14mm cell
        let ty2 = box_bot + 5.0;
        let ts: f32 = 10.0;

        // Labels centered in their columns
        let col1_w = content_w * 0.15;
        let col3_w = content_w * 0.15;

        draw_text_centered(&current_layer, margin_x, col1_w, ty1, ts, "농 장 명");
        draw_text(&current_layer, x1 + 3.0, ty1, ts, c_name);
        draw_text_centered(&current_layer, x2, col3_w, ty1, ts, "대 표 자");
        draw_text(&current_layer, x3 + 3.0, ty1, ts, r_name);

        draw_text_centered(&current_layer, margin_x, col1_w, ty2, ts, "GAP 번호");
        draw_text(&current_layer, x1 + 3.0, ty2, ts, gap_num);
        draw_text_centered(&current_layer, x2, col3_w, ty2, ts, "HACCP");
        draw_text(&current_layer, x3 + 3.0, ty2, ts, haccp_num);

        current_y = box_bot - 10.0;

        // 3. LOG HEADER (Matching border thickness)
        let header_h: f32 = 12.0;
        let h_top = current_y;
        let h_bot = h_top - header_h;

        current_layer.set_outline_thickness(2.0); // Balanced with company info box
        current_layer.set_outline_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
        draw_rect(&current_layer, margin_x, h_bot, content_w, header_h);

        let cols: Vec<f32> = vec![0.12, 0.12, 0.35, 0.18, 0.12, 0.11];
        let mut col_x = Vec::new();
        let mut cx = margin_x;
        for r in &cols {
            col_x.push(cx);
            cx += content_w * r;
        }

        let headers = vec![
            "일자",
            "구분",
            "주요 작업 내용",
            "투입 자재",
            "환경",
            "작업자",
        ];
        let hty = h_bot + 4.5; // Adjusted for centering in 12mm header

        // Headers text centered in each column
        for (i, txt) in headers.iter().enumerate() {
            if i > 0 {
                current_layer.set_outline_thickness(0.5); // Refined inner lines
                draw_line(&current_layer, col_x[i], h_bot, col_x[i], h_top);
            }
            let col_w = if i < cols.len() - 1 {
                col_x[i + 1] - col_x[i]
            } else {
                margin_x + content_w - col_x[i]
            };
            draw_text_centered(&current_layer, col_x[i], col_w, hty, 9.0, txt);
        }

        current_y = h_bot;

        // 4. LOG ROWS
        let row_h: f32 = 22.0; // Increased height for better multi-line handling

        for log in raw_logs {
            if current_y < 35.0 {
                let (page, layer) = doc.add_page(page_w, page_h, "Report Continued");
                current_layer = doc.get_page(page).get_layer(layer);
                current_y = 262.0; // Consistent 35mm margin on new pages

                // Redraw table headers on new page
                current_layer.set_outline_thickness(2.0); // Match outer thickness
                draw_rect(
                    &current_layer,
                    margin_x,
                    current_y - header_h,
                    content_w,
                    header_h,
                );
                for (i, txt) in headers.iter().enumerate() {
                    let col_w = if i < cols.len() - 1 {
                        col_x[i + 1] - col_x[i]
                    } else {
                        margin_x + content_w - col_x[i]
                    };
                    draw_text_centered(
                        &current_layer,
                        col_x[i],
                        col_w,
                        current_y - header_h + 4.5,
                        9.0,
                        txt,
                    );
                    if i > 0 {
                        current_layer.set_outline_thickness(0.5); // Refined inner lines
                        draw_line(
                            &current_layer,
                            col_x[i],
                            current_y - header_h,
                            col_x[i],
                            current_y,
                        );
                    }
                }
                current_y -= header_h;
            }

            let top = current_y;
            let bot = top - row_h;

            // Draw outer vertical edges with 2.0 thickness to match company info box
            current_layer.set_outline_thickness(2.0);
            current_layer.set_outline_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
            draw_line(&current_layer, margin_x, bot, margin_x, top);
            draw_line(
                &current_layer,
                margin_x + content_w,
                bot,
                margin_x + content_w,
                top,
            );

            // Inner dividers and bottom line with 0.5 thickness
            current_layer.set_outline_thickness(0.5);
            draw_line(&current_layer, margin_x, bot, margin_x + content_w, bot);

            let d_s = log.log_date.format("%m-%d").to_string();
            let wt = work_types
                .get(log.work_type.as_str())
                .cloned()
                .unwrap_or(&log.work_type)
                .to_string();

            // Work content with photo references
            let mut content = log.work_content.clone();
            let mut photo_refs = Vec::new();
            if let Some(arr) = log.photos.as_ref().and_then(|v| v.as_array()) {
                for p in arr {
                    if let Some(path) = p.get("path").and_then(|v| v.as_str()) {
                        if let Some(idx) = photo_map.get(path) {
                            photo_refs.push(idx.to_string());
                        }
                    }
                }
            }
            if !photo_refs.is_empty() {
                content.push_str(&format!(" (증 {})", photo_refs.join(", ")));
            }

            let mut mats_lines = Vec::new();
            if let Some(arr) = log.input_materials.as_ref().and_then(|v| v.as_array()) {
                for m in arr {
                    let name = m.get("name").and_then(|v| v.as_str()).unwrap_or("-");
                    let qty = m.get("quantity").and_then(|v| v.as_str()).unwrap_or("");
                    let unit = m.get("unit").and_then(|v| v.as_str()).unwrap_or("");
                    mats_lines.push(format!("{} {}{}", name, qty, unit));
                }
            }
            let mats = if mats_lines.is_empty() {
                "-".to_string()
            } else {
                mats_lines.join(", ")
            };

            let mut env_lines = Vec::new();
            if let Some(ed) = log.env_data.as_ref() {
                if let Some(t) = ed.get("temp").and_then(|v| v.as_f64()) {
                    env_lines.push(format!("{:.1}C", t));
                }
                if let Some(h) = ed.get("humidity").and_then(|v| v.as_f64()) {
                    env_lines.push(format!("{:.0}%", h));
                }
                if let Some(c) = ed.get("co2").and_then(|v| v.as_f64()) {
                    env_lines.push(format!("{:.0}ppm", c));
                }
            }
            let env = if env_lines.is_empty() {
                "-".to_string()
            } else {
                env_lines.join("/")
            };

            let worker = if log.worker_name.as_deref().unwrap_or("-").trim() == "시스템자동" {
                r_name.to_string()
            } else {
                log.worker_name.as_deref().unwrap_or("-").to_string()
            };

            let items = vec![d_s, wt, content, mats, env, worker];
            let rty = bot + 9.5; // Adjusted for centering in 22mm row

            for (i, txt) in items.iter().enumerate() {
                if i > 0 {
                    draw_line(&current_layer, col_x[i], bot, col_x[i], top);
                }
                let col_w = if i < cols.len() - 1 {
                    col_x[i + 1] - col_x[i]
                } else {
                    margin_x + content_w - col_x[i]
                };

                if i == 0 || i == 1 || i == 5 {
                    draw_text_centered(&current_layer, col_x[i], col_w, rty, 8.5, txt);
                } else if i == 2 {
                    // Display full content with automatic wrapping
                    let max_chars_per_line = 24;
                    let chars: Vec<char> = txt.chars().collect();
                    let mut lines = Vec::new();
                    for chunk in chars.chunks(max_chars_per_line) {
                        lines.push(chunk.iter().collect::<String>());
                    }

                    // Calculate starting Y to keep it somewhat centered if 1-2 lines, or top-aligned if more
                    let total_lines = lines.len();
                    let line_height = 4.5;
                    let mut current_line_y = if total_lines <= 1 {
                        rty
                    } else {
                        top - 6.0 // Start near top
                    };

                    for line in lines.iter().take(4) {
                        // Max 4 lines to stay within 22mm
                        draw_text(&current_layer, col_x[i] + 2.0, current_line_y, 8.0, line);
                        current_line_y -= line_height;
                    }
                } else {
                    draw_text(&current_layer, col_x[i] + 2.0, rty, 7.5, txt);
                }
            }

            current_y = bot;
        }

        // 5. ATTACHMENTS (Using pre-calculated mapping)
        if include_attachments && !photo_map.is_empty() {
            let (page, layer) = doc.add_page(page_w, page_h, "Photos Continued");
            let mut photo_layer = doc.get_page(page).get_layer(layer);
            let mut py: f32 = 272.0; // 25mm TOP MARGIN (297 - 272 = 25mm)

            // Title (Drawn twice for faux-bold effect and slightly larger)
            draw_text_centered(
                &photo_layer,
                margin_x,
                content_w,
                py,
                18.0,
                "작업 증빙 자료",
            );
            draw_text_centered(
                &photo_layer,
                margin_x + 0.2,
                content_w,
                py,
                18.0,
                "작업 증빙 자료",
            );
            py -= 15.0;

            let cell_w: f32 = 90.0;
            let cell_h: f32 = 85.0;
            let gap: f32 = 10.0;

            // Sort photos by global index to ensure sequential appearance
            let mut sorted_photos: Vec<_> = photo_map.iter().collect();
            sorted_photos.sort_by_key(|&(_, idx)| idx);

            for (_i, chunk) in sorted_photos.chunks(2).enumerate() {
                if py < cell_h + 20.0 {
                    let (npage, nlayer) = doc.add_page(page_w, page_h, "Photos Continued");
                    photo_layer = doc.get_page(npage).get_layer(nlayer);
                    py = 272.0;
                }

                let row_bot = py - cell_h;

                for (sub_idx, (path, &global_idx)) in chunk.iter().enumerate() {
                    let gx = margin_x + (sub_idx as f32 * (cell_w + gap));

                    photo_layer.set_outline_thickness(0.5);
                    draw_rect(&photo_layer, gx, row_bot, cell_w, cell_h);

                    let label = format!("증 {} [현장 기록]", global_idx);
                    draw_text(&photo_layer, gx + 2.0, row_bot + 2.0, 9.0, &label);

                    let img_path = media_dir.join(path);
                    if img_path.exists() {
                        match image_crate::open(&img_path) {
                            Ok(img) => {
                                let (w, h) = (img.width(), img.height());
                                let scaled = if w > 1024 || h > 768 {
                                    img.resize(
                                        1024,
                                        768,
                                        image_crate::imageops::FilterType::Triangle,
                                    )
                                } else {
                                    img
                                };
                                let pdf_img = Image::from_dynamic_image(&scaled);

                                // Calculate scale to fit in ~86mm x 72mm area (300 DPI assumption of printpdf)
                                // printpdf defaults to 300 DPI for dynamic images.
                                // 1.0 scale = (width_px / 300) * 25.4 mm
                                let px_w = scaled.width() as f32;
                                let px_h = scaled.height() as f32;

                                let mm_w = (px_w / 300.0) * 25.4;
                                let mm_h = (px_h / 300.0) * 25.4;

                                let scale_x = 86.0 / mm_w;
                                let scale_y = 70.0 / mm_h;
                                let scale = scale_x.min(scale_y); // Maintain aspect ratio

                                let transform = ImageTransform {
                                    translate_x: Some(Mm(gx + 2.0)),
                                    translate_y: Some(Mm(row_bot + 12.0)),
                                    scale_x: Some(scale),
                                    scale_y: Some(scale),
                                    ..Default::default()
                                };
                                pdf_img.add_to_layer(photo_layer.clone(), transform);
                            }
                            Err(e) => {
                                println!("[PDF] Image error: {}", e);
                            }
                        }
                    }
                }
                py = row_bot - 8.0;
            }
        }

        let file = File::create(save_path)
            .map_err(|e| MyceliumError::Internal(format!("File create error: {}", e)))?;
        doc.save(&mut BufWriter::new(file))
            .map_err(|e| MyceliumError::Internal(format!("PDF Save error: {}", e)))?;
        Ok::<(), MyceliumError>(())
    })
    .await
    .map_err(|e| MyceliumError::Internal(format!("Blocking task error: {}", e)))??;

    Ok(())
}
