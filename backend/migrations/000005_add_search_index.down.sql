-- 000005_add_search_index.down.sql

DROP TRIGGER IF EXISTS trg_tasks_search_vector ON tasks;
DROP FUNCTION IF EXISTS tasks_search_vector_trigger();
DROP INDEX IF EXISTS idx_tasks_search_vector;
ALTER TABLE tasks DROP COLUMN IF EXISTS search_vector;
