"use server";

import { inquiryIdSchema } from "@proposal-agent/contracts";

import {
  extractPersistedInquiryUseCase,
} from "@/lib/server/inquiries";

import type {
  ExtractInquiryActionState,
} from "./types";

export async function extractInquiryAction(
  _previousState: ExtractInquiryActionState,
  formData: FormData,
): Promise<ExtractInquiryActionState> {
  const parsedId = inquiryIdSchema.safeParse(
    formData.get("inquiryId"),
  );

  if (!parsedId.success) {
    return {
      status: "error",
      message: "The inquiry identifier is invalid.",
      result: null,
    };
  }

  try {
    const result = await extractPersistedInquiryUseCase(
      parsedId.data,
    );

    if (!result) {
      return {
        status: "error",
        message: "The inquiry could not be found.",
        result: null,
      };
    }

    return {
      status: "success",
      message:
        result.reviewIssues.length > 0
          ? "Extraction completed. Review the highlighted fields before downstream use."
          : "Extraction completed with no deterministic review flags.",
      result,
    };
  } catch {
    return {
      status: "error",
      message:
        "AI extraction could not be completed. Check the server configuration and try again.",
      result: null,
    };
  }
}
