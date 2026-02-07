-- Add Certification Numbers to Company Info
ALTER TABLE company_info ADD COLUMN IF NOT EXISTS certification_info JSONB;
-- This can store { "gap": "...", "haccp": "...", "organic": "..." }

-- Add more specific fields to harvest_records if needed for traceability
ALTER TABLE harvest_records ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);
