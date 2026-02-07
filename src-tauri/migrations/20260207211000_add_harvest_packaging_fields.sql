-- Add packaging related fields to harvest_records
ALTER TABLE harvest_records ADD COLUMN IF NOT EXISTS package_count INTEGER;
ALTER TABLE harvest_records ADD COLUMN IF NOT EXISTS weight_per_package NUMERIC(10, 2);
ALTER TABLE harvest_records ADD COLUMN IF NOT EXISTS package_unit VARCHAR(50);
