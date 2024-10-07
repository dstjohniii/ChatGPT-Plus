CREATE TABLE IF NOT EXISTS prompt (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    response TEXT NOT NULL
);
