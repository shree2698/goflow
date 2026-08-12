-- 000005_add_search_index.up.sql

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE tasks 
SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''));

CREATE INDEX IF NOT EXISTS idx_tasks_search_vector ON tasks USING gin(search_vector);

CREATE OR REPLACE FUNCTION tasks_search_vector_trigger() RETURNS trigger AS $$
begin
  new.search_vector := to_tsvector('english', coalesce(new.title, '') || ' ' || coalesce(new.description, ''));
  return new;
end
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_search_vector ON tasks;
CREATE TRIGGER trg_tasks_search_vector
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION tasks_search_vector_trigger();
