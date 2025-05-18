-- Add account_type column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'basic';

-- Add a comment to explain the column
COMMENT ON COLUMN users.account_type IS 'Account type: basic, premium, or enterprise';

-- Create an index on account_type if you plan to query by it often
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
