CREATE TABLE inquiry_catalog_matches (
    inquiry_id uuid PRIMARY KEY
        REFERENCES inquiry_extractions(inquiry_id)
        ON DELETE CASCADE,
    input_hash text NOT NULL
        CHECK (input_hash ~ '^[a-f0-9]{64}$'),
    matched_variation_ids jsonb NOT NULL
        CHECK (jsonb_typeof(matched_variation_ids) = 'array'),
    unmatched_requirement_indexes jsonb NOT NULL
        CHECK (jsonb_typeof(unmatched_requirement_indexes) = 'array'),
    resolved_at timestamptz NOT NULL
);
