-- database/sql/V3__add_chat_model_and_update_prompt.sql

-- Create 'chat' table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- Add 'chat_id' column to 'prompt' table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='prompt' AND column_name='chat_id'
    ) THEN
        ALTER TABLE prompt
        ADD COLUMN chat_id INTEGER;
    END IF;
END;
$$;

-- Create foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name='fk_chat' AND table_name='prompt'
    ) THEN
        ALTER TABLE prompt
        ADD CONSTRAINT fk_chat
        FOREIGN KEY (chat_id) REFERENCES chat (id);
    END IF;
END;
$$;

-- Create a default chat for existing prompts if it doesn't exist
INSERT INTO chat (id, title, created_at)
SELECT 1, 'Default Chat', NOW()
WHERE NOT EXISTS (SELECT 1 FROM chat WHERE id = 1);

-- Update existing prompts to associate with the default chat
UPDATE prompt SET chat_id = 1 WHERE chat_id IS NULL;

-- Set 'chat_id' column to NOT NULL
ALTER TABLE prompt
ALTER COLUMN chat_id SET NOT NULL;
