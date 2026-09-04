DELETE FROM inquiry_review_decisions
WHERE field = 'budgetCents';

UPDATE inquiry_extractions
SET extraction = extraction - 'budgetCents'
WHERE extraction ? 'budgetCents';

DROP TABLE IF EXISTS proposal_drafts;