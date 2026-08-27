CREATE TABLE demo_rate_limits (
    scope text NOT NULL
        CHECK (char_length(btrim(scope)) > 0),
    key_hash text NOT NULL
        CHECK (key_hash ~ '^[a-f0-9]{64}$'),
    window_start timestamptz NOT NULL,
    request_count integer NOT NULL
        CHECK (request_count > 0),
    PRIMARY KEY (
        scope,
        key_hash,
        window_start
    )
);

CREATE INDEX demo_rate_limits_window_start_idx
    ON demo_rate_limits(window_start);
