"use server";

import { createInquiryInputSchema } from "@proposal-agent/contracts";
import { redirect } from "next/navigation";

import { createInquiryUseCase } from "@/lib/server/inquiries";

interface CreateInquiryActionState {
  readonly errors: {
    readonly rawText?: readonly string[];
  };
  readonly message: string;
}

export async function createInquiryAction(
  _previousState: CreateInquiryActionState,
  formData: FormData,
): Promise<CreateInquiryActionState> {
  const parsed = createInquiryInputSchema.safeParse({
    rawText: formData.get("rawText"),
  });

  if (!parsed.success) {
    const rawTextErrors = parsed.error.issues
      .filter((issue) => issue.path[0] === "rawText")
      .map((issue) => issue.message);

    return {
      errors: {
        rawText: rawTextErrors,
      },
      message: "Please correct the highlighted field.",
    };
  }

  let inquiryId: string;

  try {
    const inquiry = await createInquiryUseCase(
      parsed.data.rawText,
    );

    inquiryId = inquiry.id;
  } catch {
    return {
      errors: {},
      message:
        "The inquiry could not be saved. Please try again.",
    };
  }

  redirect(`/inquiries/${inquiryId}`);
}
