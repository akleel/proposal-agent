import {
  calculatePricing,
  type CatalogSelection,
  type PricingResult,
} from "@proposal-agent/domain";

import type { CatalogProvider } from "./catalog-provider";
import { getResolvedInquiry } from "./get-resolved-inquiry";
import type { InquiryReviewRepository } from "./inquiry-review-repository";

export interface CalculateInquiryPricingInput {
  readonly inquiryId: string;
  readonly selections: readonly CatalogSelection[];
}

export type CalculateInquiryPricingResult =
  | {
      readonly status: "not_extracted";
    }
  | {
      readonly status: "review_required";
    }
  | {
      readonly status: "ready";
      readonly pricing: PricingResult;
    };

export interface CalculateInquiryPricingDependencies {
  readonly reviewRepository: InquiryReviewRepository;
  readonly catalogProvider: CatalogProvider;
}

export async function calculateInquiryPricing(
  dependencies: CalculateInquiryPricingDependencies,
  input: CalculateInquiryPricingInput,
): Promise<CalculateInquiryPricingResult> {
  const resolved = await getResolvedInquiry(
    {
      reviewRepository: dependencies.reviewRepository,
    },
    input.inquiryId,
  );

  if (resolved.status === "not_extracted") {
    return {
      status: "not_extracted",
    };
  }

  if (resolved.status === "review_required") {
    return {
      status: "review_required",
    };
  }

  const catalog = await dependencies.catalogProvider.getCurrentCatalog();

  const pricing = calculatePricing({
    inquiry: resolved.inquiry,
    catalogVersion: catalog.version,
    catalog: catalog.items,
    selections: input.selections,
  });

  return {
    status: "ready",
    pricing,
  };
}
