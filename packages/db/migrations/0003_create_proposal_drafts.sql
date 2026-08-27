CREATE TABLE proposal_drafts (
    id uuid PRIMARY KEY,
    inquiry_id uuid NOT NULL
        REFERENCES inquiries(id),
    status text NOT NULL
        CHECK (status = 'draft'),
    catalog_version text NOT NULL
        CHECK (
            char_length(
                btrim(catalog_version)
            ) > 0
        ),
    resolved_inquiry jsonb NOT NULL
        CHECK (
            jsonb_typeof(
                resolved_inquiry
            ) = 'object'
        ),
    selections jsonb NOT NULL
        CHECK (
            jsonb_typeof(
                selections
            ) = 'array'
            AND jsonb_array_length(
                selections
            ) > 0
        ),
    pricing jsonb NOT NULL
        CHECK (
            jsonb_typeof(
                pricing
            ) = 'object'
        ),
    created_at timestamptz NOT NULL
);

CREATE INDEX proposal_drafts_inquiry_id_idx
    ON proposal_drafts(inquiry_id);
