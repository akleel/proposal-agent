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
