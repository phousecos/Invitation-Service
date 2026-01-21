-- Velorum Invitation Service - Initial Schema
-- Version 2.0

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE entity_type AS ENUM ('individual', 'organization');
CREATE TYPE approval_mode AS ENUM ('manual', 'auto', 'sales');
CREATE TYPE invitation_code_type AS ENUM ('standard', 'referral', 'sales');
CREATE TYPE invitation_code_status AS ENUM ('active', 'redeemed', 'revoked');
CREATE TYPE invitation_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE member_status AS ENUM ('trial', 'active', 'churned', 'suspended');
CREATE TYPE qualification_status AS ENUM ('pending', 'qualified', 'failed');
CREATE TYPE reward_status AS ENUM ('pending', 'credited', 'forfeited', 'capped');
CREATE TYPE audit_action AS ENUM (
  'request_approved',
  'request_rejected',
  'code_generated',
  'code_revoked',
  'member_suspended',
  'member_reactivated',
  'product_updated',
  'settings_changed'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  entity_type entity_type NOT NULL,
  approval_mode approval_mode NOT NULL DEFAULT 'manual',
  trial_days INTEGER NOT NULL DEFAULT 30,
  referral_reward_months INTEGER NOT NULL DEFAULT 1,
  referral_cap_per_year INTEGER NOT NULL DEFAULT 10,
  referral_qualification_days INTEGER NOT NULL DEFAULT 30,
  referral_chargeback_buffer_days INTEGER NOT NULL DEFAULT 7,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invitation requests table
CREATE TABLE invitation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  form_data JSONB DEFAULT '{}',
  referred_by_code TEXT,
  status invitation_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invitation codes table
CREATE TABLE invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  code_type invitation_code_type NOT NULL DEFAULT 'standard',
  status invitation_code_status NOT NULL DEFAULT 'active',
  request_id UUID REFERENCES invitation_requests(id) ON DELETE SET NULL,
  issued_to_email TEXT,
  created_by UUID,
  redeemed_by_member_id UUID,
  redeemed_at TIMESTAMPTZ,
  generated_by_member_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  invitation_code_id UUID REFERENCES invitation_codes(id) ON DELETE SET NULL,
  referred_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE,
  stripe_customer_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  first_paid_at TIMESTAMPTZ,
  status member_status NOT NULL DEFAULT 'trial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, email)
);

-- Add FK for redeemed_by_member_id after members table exists
ALTER TABLE invitation_codes
  ADD CONSTRAINT invitation_codes_redeemed_by_member_id_fkey
  FOREIGN KEY (redeemed_by_member_id) REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE invitation_codes
  ADD CONSTRAINT invitation_codes_generated_by_member_id_fkey
  FOREIGN KEY (generated_by_member_id) REFERENCES members(id) ON DELETE SET NULL;

-- Referrals table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  referrer_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  referred_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  qualification_status qualification_status NOT NULL DEFAULT 'pending',
  qualified_at TIMESTAMPTZ,
  reward_status reward_status NOT NULL DEFAULT 'pending',
  reward_credited_at TIMESTAMPTZ,
  reward_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_member_id, referred_member_id)
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action_type audit_action NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API keys table for product authentication
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Products
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Invitation requests
CREATE INDEX idx_invitation_requests_product_id ON invitation_requests(product_id);
CREATE INDEX idx_invitation_requests_status ON invitation_requests(status);
CREATE INDEX idx_invitation_requests_email ON invitation_requests(email);
CREATE INDEX idx_invitation_requests_created_at ON invitation_requests(created_at DESC);

-- Invitation codes
CREATE INDEX idx_invitation_codes_product_id ON invitation_codes(product_id);
CREATE INDEX idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX idx_invitation_codes_status ON invitation_codes(status);
CREATE INDEX idx_invitation_codes_issued_to_email ON invitation_codes(issued_to_email);

-- Members
CREATE INDEX idx_members_product_id ON members(product_id);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_referral_code ON members(referral_code);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_stripe_customer_id ON members(stripe_customer_id);

-- Referrals
CREATE INDEX idx_referrals_product_id ON referrals(product_id);
CREATE INDEX idx_referrals_referrer_member_id ON referrals(referrer_member_id);
CREATE INDEX idx_referrals_referred_member_id ON referrals(referred_member_id);
CREATE INDEX idx_referrals_qualification_status ON referrals(qualification_status);
CREATE INDEX idx_referrals_reward_status ON referrals(reward_status);
CREATE INDEX idx_referrals_reward_year ON referrals(reward_year);

-- Audit logs
CREATE INDEX idx_audit_logs_admin_user_id ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target_table ON audit_logs(target_table);

-- API keys
CREATE INDEX idx_api_keys_product_id ON api_keys(product_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Generate unique invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code(product_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Get prefix from product slug (first 3 chars uppercase)
  prefix := UPPER(LEFT(product_slug, 3));

  LOOP
    -- Generate code like LUM-XXXX-XXXX
    new_code := prefix || '-' ||
                UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
                UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM invitation_codes WHERE code = new_code) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Generate unique referral code for a member
CREATE OR REPLACE FUNCTION generate_referral_code(member_name TEXT, product_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  new_code TEXT;
  counter INTEGER := 0;
  code_exists BOOLEAN;
BEGIN
  -- Create base from first part of name + product
  base_code := UPPER(
    REGEXP_REPLACE(
      SPLIT_PART(COALESCE(member_name, 'USER'), ' ', 1),
      '[^A-Za-z0-9]', '', 'g'
    )
  );
  base_code := LEFT(base_code, 8) || '-' || UPPER(LEFT(product_slug, 3));

  new_code := base_code;

  LOOP
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM members WHERE referral_code = new_code) INTO code_exists;

    EXIT WHEN NOT code_exists;

    counter := counter + 1;
    new_code := base_code || '-' || counter::TEXT;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Count qualified referrals for a member in a given year
CREATE OR REPLACE FUNCTION count_member_referrals_for_year(p_member_id UUID, p_year INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM referrals
    WHERE referrer_member_id = p_member_id
      AND reward_year = p_year
      AND reward_status = 'credited'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitation_requests_updated_at
  BEFORE UPDATE ON invitation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitation_codes_updated_at
  BEFORE UPDATE ON invitation_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Admin policies (authenticated users can access everything)
-- In production, you'd want more granular role-based policies

CREATE POLICY "Admins can view all products" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage products" ON products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view all requests" ON invitation_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage requests" ON invitation_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view all codes" ON invitation_codes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage codes" ON invitation_codes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view all members" ON members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage members" ON members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view all referrals" ON referrals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage referrals" ON referrals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can view api keys" ON api_keys
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage api keys" ON api_keys
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role policies for API access (bypasses RLS by default)

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert initial products
INSERT INTO products (slug, name, entity_type, approval_mode, trial_days, referral_reward_months, referral_cap_per_year, referral_qualification_days, referral_chargeback_buffer_days, config) VALUES
  ('lumynr', 'Lumynr', 'individual', 'manual', 30, 1, 10, 30, 7, '{"monthly_price": 25}'),
  ('agentpmo', 'AgentPMO', 'organization', 'auto', 14, 1, 10, 30, 7, '{"monthly_price": 49}'),
  ('prept', 'Prept', 'organization', 'sales', 14, 1, 10, 30, 7, '{"monthly_price": 99}');
