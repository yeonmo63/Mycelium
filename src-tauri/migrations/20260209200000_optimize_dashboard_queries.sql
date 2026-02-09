-- Optimizing for dashboard and reports
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_lookup ON sales(product_name, specification);
CREATE INDEX IF NOT EXISTS idx_products_lookup ON products(product_name, specification);
CREATE INDEX IF NOT EXISTS idx_consultations_customer_id ON consultations(customer_id);
CREATE INDEX IF NOT EXISTS idx_experience_reservations_customer_id ON experience_reservations(customer_id);

-- View for daily dashboard summary to avoid repeated complex aggregations
CREATE OR REPLACE VIEW v_dashboard_daily_summary AS
SELECT 
    d::date as target_date,
    COALESCE(SUM(s.total_amount) FILTER (WHERE s.status != '취소'), 0) as daily_sales,
    COUNT(s.sales_id) FILTER (WHERE s.status != '취소') as daily_orders,
    (SELECT COUNT(*) FROM customers WHERE join_date = d::date) as new_customers
FROM generate_series(CURRENT_DATE - interval '30 days', CURRENT_DATE, '1 day') d
LEFT JOIN sales s ON s.order_date = d::date
GROUP BY d::date;
