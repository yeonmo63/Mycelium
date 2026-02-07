-- Ensure all tax related fields are present in products and sales
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT '면세';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_exempt_value INTEGER DEFAULT 0;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT '면세';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_exempt_value INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS supply_value INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS vat_amount INTEGER DEFAULT 0;

ALTER TABLE harvest_records ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);

-- Existing data correction for sales
UPDATE sales SET supply_value = total_amount WHERE supply_value = 0 AND (tax_type = '면세' OR tax_type IS NULL);
