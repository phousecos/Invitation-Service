-- Add email branding columns to products table
-- Each product gets its own email identity (sender name, color, logo, domain)

ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_color TEXT NOT NULL DEFAULT '#111111';
ALTER TABLE products ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS signup_domain TEXT;

-- Populate existing products with sensible defaults
UPDATE products SET
  brand_name = name,
  signup_domain = slug || '.velorumsoftware.com'
WHERE brand_name IS NULL;
