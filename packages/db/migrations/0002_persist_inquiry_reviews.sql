CREATE TABLE inquiry_extractions (
    inquiry_id uuid PRIMARY KEY
        REFERENCES inquiries(id)
        ON DELETE CASCADE,
    extraction jsonb NOT NULL,
    extracted_at timestamptz NOT NULL
);

CREATE TABLE inquiry_review_decisions (
    inquiry_id uuid NOT NULL
        REFERENCES inquiry_extractions(inquiry_id)
        ON DELETE CASCADE,
    field text NOT NULL
        CHECK (char_length(btrim(field)) > 0),
    kind text NOT NULL
        CHECK (kind IN ('accepted', 'corrected')),
    resolved_value jsonb NOT NULL,
    reviewed_at timestamptz NOT NULL,
    PRIMARY KEY (inquiry_id, field)
);
