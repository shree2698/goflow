-- 000006_fix_foreign_key_cascades.up.sql

-- 1. Tasks creator_id: make nullable and cascade on delete set null
ALTER TABLE tasks ALTER COLUMN creator_id DROP NOT NULL;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_creator_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_creator_id_fkey 
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL;

-- 2. Workflows creator_id: make nullable and cascade on delete set null
ALTER TABLE workflows ALTER COLUMN creator_id DROP NOT NULL;
ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_creator_id_fkey;
ALTER TABLE workflows ADD CONSTRAINT workflows_creator_id_fkey 
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL;
