-- Fix ownership/permissions of imports table
-- This ensures the beanledger user can access the imports table
-- regardless of who created it

-- Grant all privileges (this works even if we're not the owner)
GRANT ALL PRIVILEGES ON TABLE imports TO beanledger;
