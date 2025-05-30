-- Add tenants table and tenant_id columns to accounts and posts

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  settings jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Insert default tenant for existing data migration
INSERT INTO tenants (name)
SELECT 'default'
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE name = 'default');

-- Get default tenant id
DO $$
DECLARE default_tenant uuid;
BEGIN
  SELECT id INTO default_tenant FROM tenants WHERE name = 'default';

  -- 3. Add tenant_id to accounts with default and backfill existing rows
  ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT default_tenant;
  UPDATE accounts SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE accounts ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE accounts ALTER COLUMN tenant_id DROP DEFAULT;

  -- 4. Add tenant_id to posts with default and backfill existing rows
  ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT default_tenant;
  UPDATE posts SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE posts ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE posts ALTER COLUMN tenant_id DROP DEFAULT;

  -- 5. Add foreign key constraints
  ALTER TABLE accounts
    ADD CONSTRAINT accounts_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants (id) ON DELETE CASCADE;
  ALTER TABLE posts
    ADD CONSTRAINT posts_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants (id) ON DELETE CASCADE;

  -- 6. Update RLS policies to enforce tenant isolation
  -- Replace existing policies by dropping and recreating
  DROP POLICY IF EXISTS "Users can manage their own accounts" ON accounts;
  CREATE POLICY "Users can manage their own accounts" ON accounts
    FOR ALL TO authenticated
    USING (
      auth.uid() = user_id AND
      tenant_id = current_setting('request.jwt.claims.tenant_id')::uuid
    )
    WITH CHECK (
      auth.uid() = user_id AND
      tenant_id = current_setting('request.jwt.claims.tenant_id')::uuid
    );

  DROP POLICY IF EXISTS "Users can manage their own posts" ON posts;
  CREATE POLICY "Users can manage their own posts" ON posts
    FOR ALL TO authenticated
    USING (
      auth.uid() = user_id AND
      tenant_id = current_setting('request.jwt.claims.tenant_id')::uuid
    )
    WITH CHECK (
      auth.uid() = user_id AND
      tenant_id = current_setting('request.jwt.claims.tenant_id')::uuid
    );
END
$$;