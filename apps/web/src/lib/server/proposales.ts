import "server-only";

import type { ResolvedInquiry } from "@proposal-agent/domain";

const PROPOSALES_API_BASE_URL = "https://api.proposales.com/v3";
const DEFAULT_LANGUAGE = "en";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_SELECTION_QUANTITY = 10_000;

export type ProposalesApiErrorCode =
  | "CONFIGURATION_ERROR"
  | "INVALID_RESPONSE"
  | "INVALID_SELECTION"
  | "NETWORK_ERROR"
  | "UPSTREAM_ERROR";

export type ProposalesQuantityMode = "room_night" | "person_night" | "day" | "room_once" | "unit";

export class ProposalesApiError extends Error {
  public constructor(
    public readonly code: ProposalesApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProposalesApiError";
  }
}

export interface ProposalesCatalogProduct {
  readonly productId: number;
  readonly variationId: number;
  readonly title: string;
  readonly description: string;
  readonly quantityMode: ProposalesQuantityMode;
}

export interface ProposalesCatalog {
  readonly companyId: number;
  readonly companyName: string;
  readonly currency: string;
  readonly language: string;
  readonly products: readonly ProposalesCatalogProduct[];
}

export interface ProposalesProductSelection {
  readonly variationId: number;
  readonly amount: number;
}

export interface CreatedProposalesProposal {
  readonly uuid: string;
  readonly url: string;
  readonly currency: string;
  readonly valueWithTaxMinor: number | null;
  readonly valueWithoutTaxMinor: number | null;
}

interface ProposalesConfig {
  readonly apiKey: string;
  readonly companyId: number | null;
  readonly language: string;
}

interface ProposalesCompany {
  readonly id: number;
  readonly name: string;
  readonly currency: string;
}

interface CreatedDraftReference {
  readonly uuid: string;
  readonly url: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readConfig(): ProposalesConfig {
  const apiKey = process.env.PROPOSALES_API_KEY?.trim();

  if (!apiKey) {
    throw new ProposalesApiError(
      "CONFIGURATION_ERROR",
      "The Proposales integration is not configured.",
    );
  }

  const rawCompanyId = process.env.PROPOSALES_COMPANY_ID?.trim();
  let companyId: number | null = null;

  if (rawCompanyId) {
    const parsedCompanyId = Number(rawCompanyId);

    if (!Number.isSafeInteger(parsedCompanyId) || parsedCompanyId <= 0) {
      throw new ProposalesApiError(
        "CONFIGURATION_ERROR",
        "PROPOSALES_COMPANY_ID must be a positive integer.",
      );
    }

    companyId = parsedCompanyId;
  }

  const language = (process.env.PROPOSALES_LANGUAGE?.trim() || DEFAULT_LANGUAGE).toLowerCase();

  if (!/^[a-z]{2}$/.test(language)) {
    throw new ProposalesApiError(
      "CONFIGURATION_ERROR",
      "PROPOSALES_LANGUAGE must contain a two-letter language code.",
    );
  }

  return {
    apiKey,
    companyId,
    language,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readUpstreamErrorMessage(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.error)) {
    return null;
  }

  const message = value.error.message;

  return typeof message === "string" && message.trim().length > 0 ? message.trim() : null;
}

async function requestProposales(
  config: ProposalesConfig,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(`${PROPOSALES_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ProposalesApiError("NETWORK_ERROR", "The Proposales API could not be reached.");
  }

  const body = await readJson(response);

  if (!response.ok) {
    throw new ProposalesApiError(
      "UPSTREAM_ERROR",
      readUpstreamErrorMessage(body) ?? `Proposales returned HTTP ${response.status}.`,
    );
  }

  return body;
}

function parseCompanies(value: unknown): readonly ProposalesCompany[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new ProposalesApiError(
      "INVALID_RESPONSE",
      "Proposales returned an invalid companies response.",
    );
  }

  return value.data.map((company) => {
    if (!isRecord(company)) {
      throw new ProposalesApiError(
        "INVALID_RESPONSE",
        "Proposales returned an invalid company entry.",
      );
    }

    const { id, name, currency } = company;

    if (
      typeof id !== "number" ||
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      typeof name !== "string" ||
      name.trim().length === 0 ||
      typeof currency !== "string" ||
      currency.trim().length === 0
    ) {
      throw new ProposalesApiError(
        "INVALID_RESPONSE",
        "Proposales returned incomplete company information.",
      );
    }

    return {
      id,
      name: name.trim(),
      currency: currency.trim().toUpperCase(),
    };
  });
}

async function resolveCompany(config: ProposalesConfig): Promise<ProposalesCompany> {
  const body = await requestProposales(config, "/companies");
  const companies = parseCompanies(body);

  if (companies.length === 0) {
    throw new ProposalesApiError(
      "CONFIGURATION_ERROR",
      "No Proposales company is available for this API token.",
    );
  }

  if (config.companyId !== null) {
    const company = companies.find((candidate) => candidate.id === config.companyId);

    if (!company) {
      throw new ProposalesApiError(
        "CONFIGURATION_ERROR",
        "PROPOSALES_COMPANY_ID is not available to this API token.",
      );
    }

    return company;
  }

  if (companies.length > 1) {
    throw new ProposalesApiError(
      "CONFIGURATION_ERROR",
      "The API token can access multiple companies. Configure PROPOSALES_COMPANY_ID explicitly.",
    );
  }

  const company = companies[0];

  if (!company) {
    throw new ProposalesApiError("INVALID_RESPONSE", "Proposales did not return a company.");
  }

  return company;
}

function localizedText(value: unknown, language: string): string {
  if (!isRecord(value)) {
    return "";
  }

  const preferred = value[language];

  if (typeof preferred === "string") {
    return preferred.replace(/\u200e/g, "").trim();
  }

  for (const candidate of Object.values(value)) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.replace(/\u200e/g, "").trim();
    }
  }

  return "";
}

function inferQuantityMode(title: string): ProposalesQuantityMode {
  const normalized = title.toLowerCase();

  if (
    normalized.includes("breakfast") ||
    normalized.includes("lunch") ||
    normalized.includes("dinner")
  ) {
    return "person_night";
  }

  if (normalized.includes("late checkout")) {
    return "room_once";
  }

  if (normalized.includes("meeting room")) {
    return "day";
  }

  if (normalized.includes("room") || normalized.includes("suite")) {
    return "room_night";
  }

  return "unit";
}

function parseProducts(value: unknown, language: string): readonly ProposalesCatalogProduct[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new ProposalesApiError(
      "INVALID_RESPONSE",
      "Proposales returned an invalid content response.",
    );
  }

  const products = value.data.map((entry) => {
    if (!isRecord(entry)) {
      throw new ProposalesApiError(
        "INVALID_RESPONSE",
        "Proposales returned an invalid content entry.",
      );
    }

    const productId = entry.product_id;
    const variationId = entry.variation_id;
    const title = localizedText(entry.title, language);
    const description = localizedText(entry.description, language);

    if (
      typeof productId !== "number" ||
      !Number.isSafeInteger(productId) ||
      productId <= 0 ||
      typeof variationId !== "number" ||
      !Number.isSafeInteger(variationId) ||
      variationId <= 0 ||
      title.length === 0
    ) {
      throw new ProposalesApiError(
        "INVALID_RESPONSE",
        "Proposales returned incomplete product information.",
      );
    }

    return {
      productId,
      variationId,
      title,
      description,
      quantityMode: inferQuantityMode(title),
    };
  });

  return products.toSorted((left, right) => left.title.localeCompare(right.title));
}

async function loadCatalog(config: ProposalesConfig): Promise<ProposalesCatalog> {
  const company = await resolveCompany(config);

  const body = await requestProposales(
    config,
    `/content?company_id=${encodeURIComponent(String(company.id))}`,
  );

  return {
    companyId: company.id,
    companyName: company.name,
    currency: company.currency,
    language: config.language,
    products: parseProducts(body, config.language),
  };
}

export async function getProposalesCatalog(): Promise<ProposalesCatalog> {
  return loadCatalog(readConfig());
}

export interface ProposalesCatalogMatch {
  readonly products: readonly ProposalesCatalogProduct[];
  readonly unmatchedRequirements: readonly string[];
}

function normalizeCatalogMatchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (
        word.length > 3 &&
        word.endsWith("s") &&
        !word.endsWith("ss") &&
        !word.endsWith("us") &&
        !word.endsWith("is")
      ) {
        return word.slice(0, -1);
      }

      return word;
    })
    .join(" ");
}

function isNegativeRequirement(requirement: string): boolean {
  return /\b(?:do not|don't|does not|doesn't|no need|not need|not required|not require|without|exclude|excluding)\b/i.test(
    requirement,
  );
}

/**
 * Matches reviewed customer requirements against live Proposales titles.
 *
 * Matching is intentionally conservative: a normalized Proposales product
 * title must occur in the normalized positive requirement. Ambiguous
 * requirements remain unmatched instead of guessing a commercial product.
 */
export function matchProposalesCatalog(
  catalog: ProposalesCatalog,
  requirements: readonly string[],
): ProposalesCatalogMatch {
  const matchedVariationIds = new Set<number>();
  const unmatchedRequirements: string[] = [];

  for (const requirement of requirements) {
    if (isNegativeRequirement(requirement)) {
      continue;
    }

    const normalizedRequirement = normalizeCatalogMatchText(requirement);

    if (!normalizedRequirement) {
      continue;
    }

    const matches = catalog.products.filter((product) => {
      const normalizedTitle = normalizeCatalogMatchText(product.title);

      return normalizedTitle.length > 0 && normalizedRequirement.includes(normalizedTitle);
    });

    if (matches.length === 0) {
      unmatchedRequirements.push(requirement);
      continue;
    }

    for (const product of matches) {
      matchedVariationIds.add(product.variationId);
    }
  }

  return {
    products: catalog.products.filter((product) => matchedVariationIds.has(product.variationId)),
    unmatchedRequirements,
  };
}

function calculateNightCount(inquiry: ResolvedInquiry): number {
  if (!inquiry.startDate || !inquiry.endDate) {
    throw new ProposalesApiError(
      "INVALID_SELECTION",
      "Stay dates are required for room or meal quantities.",
    );
  }

  const start = Date.parse(`${inquiry.startDate}T00:00:00Z`);
  const end = Date.parse(`${inquiry.endDate}T00:00:00Z`);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new ProposalesApiError(
      "INVALID_SELECTION",
      "The reviewed inquiry has an invalid stay date range.",
    );
  }

  const nights = (end - start) / (24 * 60 * 60 * 1000);

  if (!Number.isSafeInteger(nights) || nights <= 0) {
    throw new ProposalesApiError(
      "INVALID_SELECTION",
      "The reviewed inquiry has an invalid stay duration.",
    );
  }

  return nights;
}

function validateAmount(amount: number): number {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_SELECTION_QUANTITY) {
    throw new ProposalesApiError(
      "INVALID_SELECTION",
      `Each selected product amount must be a whole number between 1 and ${MAX_SELECTION_QUANTITY}.`,
    );
  }

  return amount;
}

function calculateQuantity(
  product: ProposalesCatalogProduct,
  amount: number,
  inquiry: ResolvedInquiry,
): number {
  const validAmount = validateAmount(amount);

  switch (product.quantityMode) {
    case "room_night":
    case "person_night":
      return validAmount * calculateNightCount(inquiry);

    case "day":
    case "room_once":
    case "unit":
      return validAmount;
  }
}

function buildProposalTitle(inquiry: ResolvedInquiry): string {
  if (inquiry.startDate && inquiry.endDate) {
    return `Event proposal - ${inquiry.startDate} to ${inquiry.endDate}`;
  }

  if (inquiry.startDate) {
    return `Event proposal - ${inquiry.startDate}`;
  }

  return "Event proposal";
}

function displayNullableNumber(value: number | null): string {
  return value === null ? "Not provided" : String(value);
}

function displayNullableText(value: string | null): string {
  return value ?? "Not provided";
}

function buildProposalDescription(inquiry: ResolvedInquiry): string {
  const eventDetails = [
    "# Event details",
    `<Guests: ${displayNullableNumber(inquiry.guests)}`,
    `<Rooms: ${displayNullableNumber(inquiry.rooms)}`,
    `<Start date: ${displayNullableText(inquiry.startDate)}`,
    `<End date: ${displayNullableText(inquiry.endDate)}`,
  ];

  const requirements =
    inquiry.requirements.length === 0
      ? []
      : ["# Requirements", ...inquiry.requirements.map((requirement) => `<${requirement}`)];

  return [...eventDetails, ...requirements].join("\n\n");
}

function parseCreatedDraft(value: unknown): CreatedDraftReference {
  if (!isRecord(value) || !isRecord(value.proposal)) {
    throw new ProposalesApiError(
      "INVALID_RESPONSE",
      "Proposales returned an invalid proposal creation response.",
    );
  }

  const uuid = value.proposal.uuid;
  const url = value.proposal.url;

  if (
    typeof uuid !== "string" ||
    uuid.trim().length === 0 ||
    typeof url !== "string" ||
    url.trim().length === 0
  ) {
    throw new ProposalesApiError(
      "INVALID_RESPONSE",
      "Proposales returned an incomplete proposal creation response.",
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new ProposalesApiError(
      "INVALID_RESPONSE",
      "Proposales returned an invalid proposal URL.",
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new ProposalesApiError(
      "INVALID_RESPONSE",
      "Proposales returned an unexpected proposal URL.",
    );
  }

  return {
    uuid: uuid.trim(),
    url: parsedUrl.toString(),
  };
}

function parseNullableMoneyValue(value: unknown, field: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ProposalesApiError("INVALID_RESPONSE", `Proposales returned an invalid ${field}.`);
  }

  return value;
}

function parseCreatedProposal(
  value: unknown,
  reference: CreatedDraftReference,
): CreatedProposalesProposal {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new ProposalesApiError(
      "INVALID_RESPONSE",
      "Proposales returned an invalid proposal response.",
    );
  }

  const currency = value.data.currency;

  if (typeof currency !== "string" || currency.trim().length === 0) {
    throw new ProposalesApiError(
      "INVALID_RESPONSE",
      "Proposales returned a proposal without a currency.",
    );
  }

  return {
    uuid: reference.uuid,
    url: reference.url,
    currency: currency.trim().toUpperCase(),
    valueWithTaxMinor: parseNullableMoneyValue(
      value.data.value_with_tax,
      "proposal total with tax",
    ),
    valueWithoutTaxMinor: parseNullableMoneyValue(
      value.data.value_without_tax,
      "proposal total without tax",
    ),
  };
}

export async function createProposalesProposal(
  inquiryId: string,
  inquiry: ResolvedInquiry,
  catalog: ProposalesCatalog,
  selections: readonly ProposalesProductSelection[],
  allowedVariationIds: readonly number[],
): Promise<CreatedProposalesProposal> {
  if (selections.length === 0) {
    throw new ProposalesApiError("INVALID_SELECTION", "Select at least one Proposales product.");
  }

  const config = readConfig();
  const requestedVariationIds = new Set<number>(allowedVariationIds);

  const selectedVariationIds = new Set<number>();
  const blocks: Array<{
    content_id: number;
    type: "product-block";
    quantity: number;
  }> = [];

  const proposalSelectionData: Array<{
    variation_id: number;
    quantity: number;
  }> = [];

  for (const selection of selections) {
    if (selectedVariationIds.has(selection.variationId)) {
      throw new ProposalesApiError(
        "INVALID_SELECTION",
        "Each Proposales product may only be selected once.",
      );
    }

    selectedVariationIds.add(selection.variationId);

    const product = catalog.products.find(
      (candidate) => candidate.variationId === selection.variationId,
    );

    if (!product) {
      throw new ProposalesApiError(
        "INVALID_SELECTION",
        "One or more selected Proposales products are no longer available.",
      );
    }

    if (!requestedVariationIds.has(product.variationId)) {
      throw new ProposalesApiError(
        "INVALID_SELECTION",
        "One or more selected Proposales products were not requested in the reviewed inquiry.",
      );
    }

    const quantity = calculateQuantity(product, selection.amount, inquiry);

    blocks.push({
      content_id: product.variationId,
      type: "product-block",
      quantity,
    });

    proposalSelectionData.push({
      variation_id: product.variationId,
      quantity,
    });
  }

  const createdBody = await requestProposales(config, "/proposals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company_id: catalog.companyId,
      language: catalog.language,
      title_md: buildProposalTitle(inquiry),
      description_md: buildProposalDescription(inquiry),
      data: {
        source: "proposal-agent",
        inquiry_id: inquiryId,
        guests: inquiry.guests,
        rooms: inquiry.rooms,
        start_date: inquiry.startDate,
        end_date: inquiry.endDate,
        requirements: inquiry.requirements,
        selected_products: proposalSelectionData,
      },
      blocks,
    }),
  });

  const reference = parseCreatedDraft(createdBody);

  const proposalBody = await requestProposales(
    config,
    `/proposals/${encodeURIComponent(reference.uuid)}`,
  );

  return parseCreatedProposal(proposalBody, reference);
}
