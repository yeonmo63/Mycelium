-- Add tax fields to products and sales
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT '면세'; -- '과세', '면세'

ALTER TABLE sales ADD COLUMN IF NOT EXISTS supply_value INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS vat_amount INTEGER DEFAULT 0;

-- 기존 데이터 보정 (농산물 위주이므로 일단 전액 공급가액으로 간주)
UPDATE sales SET supply_value = total_amount WHERE supply_value = 0;
