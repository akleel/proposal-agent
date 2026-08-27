import type {
  PricingResult,
} from "@proposal-agent/domain";

export interface PricingActionState {
  readonly status:
    | "idle"
    | "success"
    | "error";
  readonly message: string;
  readonly pricing:
    PricingResult | null;
}

export const initialPricingActionState:
  PricingActionState = {
    status: "idle",
    message: "",
    pricing: null,
  };
