export { FakeInquiryExtractor } from "./fake-inquiry-extractor";

export {
  OpenAIInquiryExtractor,
  type OpenAIInquiryExtractorOptions,
} from "./openai/openai-inquiry-extractor";

export {
  modelInquiryExtractionSchema,
  type ModelInquiryExtraction,
} from "./openai/model-inquiry-extraction";

export { toInquiryExtraction } from "./openai/to-inquiry-extraction";
