-- Add defective_quantity and loss_quantity to harvest_records
ALTER TABLE harvest_records ADD COLUMN defective_quantity DECIMAL(12, 4) DEFAULT 0;
ALTER TABLE harvest_records ADD COLUMN loss_quantity DECIMAL(12, 4) DEFAULT 0;

-- Optional: Add a comment to explain
COMMENT ON COLUMN harvest_records.defective_quantity IS '비상품(파지) 수량';
COMMENT ON COLUMN harvest_records.loss_quantity IS '생산 중 폐기/손실 수량';
