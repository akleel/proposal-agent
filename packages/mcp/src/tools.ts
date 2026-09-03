import {
  calculateInquiryPricing,
  createProposalDraft,
  searchCatalogProducts,
  validateProposalDraft,
  type CatalogProvider,
  type InquiryReviewRepository,
  type ProposalDraftRepository,
} from "@proposal-agent/application";
import {
  mcpCalculatePricingInputSchema,
  mcpCreateDraftInputSchema,
  mcpSearchProductsInputSchema,
  mcpValidateProposalInputSchema,
} from "@proposal-agent/contracts";

export interface ProposalMcpToolDependencies {
  readonly reviewRepository: InquiryReviewRepository;
  readonly catalogProvider: CatalogProvider;
  readonly proposalDraftRepository: ProposalDraftRepository;
  readonly generateId: () => string;
  readonly now: () => Date;
}

export async function searchProductsTool(
  dependencies: Pick<ProposalMcpToolDependencies, "catalogProvider">,
  input: unknown,
) {
  const parsed = mcpSearchProductsInputSchema.parse(input);

  const result = await searchCatalogProducts(
    {
      catalogProvider: dependencies.catalogProvider,
    },
    {
      ...(parsed.query === undefined
        ? {}
        : {
            query: parsed.query,
          }),
      ...(parsed.limit === undefined
        ? {}
        : {
            limit: parsed.limit,
          }),
    },
  );

  return {
    catalogVersion: result.catalogVersion,
    products: result.products.map((product) => ({
      id: product.id,
      name: product.name,
      currency: product.currency,
      unitPriceMinor: product.unitPriceMinor,
      pricingBasis: product.pricingBasis,
    })),
  };
}

export async function calculatePricingTool(
  dependencies: Pick<ProposalMcpToolDependencies, "reviewRepository" | "catalogProvider">,
  input: unknown,
) {
  const parsed = mcpCalculatePricingInputSchema.parse(input);

  return calculateInquiryPricing(
    {
      reviewRepository: dependencies.reviewRepository,
      catalogProvider: dependencies.catalogProvider,
    },
    parsed,
  );
}

export async function validateProposalTool(
  dependencies: Pick<ProposalMcpToolDependencies, "proposalDraftRepository">,
  input: unknown,
) {
  const parsed = mcpValidateProposalInputSchema.parse(input);

  const result = await validateProposalDraft(
    {
      proposalDraftRepository: dependencies.proposalDraftRepository,
    },
    parsed.proposalDraftId,
  );

  if (result.status === "not_found") {
    return result;
  }

  return {
    status: "valid_snapshot" as const,
    proposalDraftId: result.draft.id,
    proposalStatus: result.draft.status,
    inquiryId: result.draft.inquiryId,
    catalogVersion: result.draft.catalogVersion,
    currency: result.draft.pricing.currency,
    totalMinor: result.draft.pricing.totalMinor,
    createdAt: result.draft.createdAt.toISOString(),
  };
}

export async function createDraftTool(dependencies: ProposalMcpToolDependencies, input: unknown) {
  const parsed = mcpCreateDraftInputSchema.parse(input);

  const result = await createProposalDraft(
    {
      reviewRepository: dependencies.reviewRepository,
      catalogProvider: dependencies.catalogProvider,
      proposalDraftRepository: dependencies.proposalDraftRepository,
      generateId: dependencies.generateId,
      now: dependencies.now,
    },
    parsed,
  );

  if (result.status !== "ready") {
    return result;
  }

  return {
    status: "created" as const,
    proposalDraft: {
      id: result.draft.id,
      status: result.draft.status,
      inquiryId: result.draft.inquiryId,
      catalogVersion: result.draft.catalogVersion,
      currency: result.draft.pricing.currency,
      totalMinor: result.draft.pricing.totalMinor,
      createdAt: result.draft.createdAt.toISOString(),
    },
  };
}
