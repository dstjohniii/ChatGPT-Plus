-- database/sql/V2__add_model_temperature_role_to_prompt.sql

ALTER TABLE prompt
ADD COLUMN model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini';

ALTER TABLE prompt
ADD COLUMN temperature FLOAT NOT NULL DEFAULT 0.7;

ALTER TABLE prompt
ADD COLUMN role TEXT NOT NULL DEFAULT 'You are a helpful assistant.';
