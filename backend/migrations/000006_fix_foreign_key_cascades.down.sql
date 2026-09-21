-- 000006_fix_foreign_key_cascades.down.sql

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_creator_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_creator_id_fkey 
    FOREIGN KEY (creator_id) REFERENCES users(id);
ALTER TABLE tasks ALTER COLUMN creator_id SET NOT NULL;

ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_creator_id_fkey;
ALTER TABLE workflows ADD CONSTRAINT workflows_creator_id_fkey 
    FOREIGN KEY (creator_id) REFERENCES users(id);
ALTER TABLE workflows ALTER COLUMN creator_id SET NOT NULL;
