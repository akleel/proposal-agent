CREATE TABLE inquiries (
    id uuid PRIMARY KEY,
    raw_text text NOT NULL
        CHECK (char_length(btrim(raw_text)) > 0),
    created_at timestamptz NOT NULL
);