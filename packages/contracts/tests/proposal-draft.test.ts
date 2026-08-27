import {
  describe,
  expect,
  it,
} from "vitest";

import {
  proposalDraftIdSchema,
} from "../src/index";

describe(
  "proposalDraftIdSchema",
  () => {
    it(
      "accepts a UUID proposal draft identifier",
      () => {
        expect(
          proposalDraftIdSchema.safeParse(
            "77a37479-886a-4a0a-a933-6e065cc5787c",
          ).success,
        ).toBe(true);
      },
    );

    it(
      "rejects an invalid proposal draft identifier",
      () => {
        expect(
          proposalDraftIdSchema.safeParse(
            "not-a-proposal-id",
          ).success,
        ).toBe(false);
      },
    );
  },
);
