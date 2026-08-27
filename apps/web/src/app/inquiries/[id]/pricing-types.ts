import type {
  CatalogSelection,
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
  readonly selections:
    readonly CatalogSelection[] | null;
}

export const initialPricingActionState:
  PricingActionState = {
    status: "idle",
    message: "",
    pricing: null,
    selections: null,
  };
