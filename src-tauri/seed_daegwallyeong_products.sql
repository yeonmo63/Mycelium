-- SQL for Daegwallyeong Songam Mushroom Products
-- Reset products table
TRUNCATE TABLE products RESTART IDENTITY CASCADE;

-- Insert Products
INSERT INTO products (product_name, specification, unit_price, stock_quantity) VALUES
('솔송고 생표고버섯 (소)', '1kg Box', 17000, 100),
('솔송고 생표고버섯 (중)', '1kg Box', 26000, 100),
('솔송고 생표고버섯 (대)', '1kg Box', 35000, 100),
('솔송고 건절편(건표고) (소)', '1kg', 25000, 50),
('솔송고 건절편(건표고) (중)', '1kg', 35000, 50),
('솔송고 건절편(건표고) (대)', '1kg', 45000, 50),
('솔송고 혼합 선물세트 (소)', 'Set', 35000, 30),
('솔송고 혼합 선물세트 (중)', 'Set', 45000, 30),
('솔송고 혼합 선물세트 (대)', 'Set', 55000, 30),
('솔송고 표고분말', '80g', 15000, 100),
('솔송고 표고소금', '330g', 10000, 100);
