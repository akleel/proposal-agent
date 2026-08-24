import {
  extractInquiry,
} from "@proposal-agent/application";
import {
  getReviewIssues,
} from "@proposal-agent/domain";

import {
  OpenAIInquiryExtractor,
} from "../src/index";

const inquiry =
  process.argv.slice(2).join(" ").trim() ||
  [
    "Hi, we're planning a company offsite for 65 people in Stockholm",
    "from 14-16 October. We need around 35 rooms, meeting space for",
    "everyone, breakfast both mornings, dinner on the first evening,",
    "and ideally late checkout on Friday. Our total budget is around",
    "SEK 180,000.",
  ].join(" ");

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is not set in this terminal.",
  );
}

const extractor = new OpenAIInquiryExtractor();

const extraction = await extractInquiry(
  {
    extractor,
  },
  {
    rawText: inquiry,
  },
);

console.log(
  JSON.stringify(
    {
      model:
        process.env.OPENAI_MODEL ??
        "gpt-5.4-mini",
      inquiry,
      extraction,
      reviewIssues: getReviewIssues(extraction),
    },
    null,
    2,
  ),
);
