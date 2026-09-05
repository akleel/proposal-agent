export { FakeInquiryExtractor } from "./fake-inquiry-extractor";

export {
  GeminiInquiryExtractor,
  type GeminiInquiryExtractorOptions,
} from "./google/gemini-inquiry-extractor";

export {
  modelInquiryExtractionSchema,
  type ModelInquiryExtraction,
} from "./extraction/model-inquiry-extraction";

export { toInquiryExtraction } from "./extraction/to-inquiry-extraction";
export {
  normalizeCatalogMatchResolutions,
  type CatalogMatchCandidate,
  type CatalogMatchContext,
  type CatalogMatchInput,
  type CatalogMatcher,
  type CatalogMatchResolution,
  type CatalogMatchResult,
} from "./catalog-match";

export {
  GeminiCatalogMatcher,
  type GeminiCatalogMatcherOptions,
} from "./google/gemini-catalog-matcher";
