// packages/ai/scripts/fixtures/booking-eval-cases.ts

export const BOOKING_EVAL_CONTEXT = {
  referenceDate: "2026-09-05",
  timezone: "Europe/Berlin",
} as const;

export type CatalogProductTitle =
  | "Standard Single Room"
  | "Standard Double Room"
  | "Superior Room with View"
  | "Suite"
  | "Meeting Room"
  | "Breakfast"
  | "Dinner"
  | "Late Checkout";

export type BookingEvalTag =
  | "baseline"
  | "semantic-room"
  | "semantic-addon"
  | "multi-product"
  | "quantity"
  | "absolute-date"
  | "numeric-date"
  | "duration"
  | "relative-date"
  | "negation"
  | "unsupported"
  | "ambiguous"
  | "typo";

export interface ExpectedProduct {
  readonly title: CatalogProductTitle;
  readonly quantity: number | null;
}

export interface BookingEvalExpectation {
  readonly guests: number | null;
  readonly rooms: number | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly products: readonly ExpectedProduct[];
  readonly excludedProducts: readonly CatalogProductTitle[];
  readonly unsupportedConcepts: readonly string[];
  readonly unresolvedConcepts: readonly string[];
}

export interface BookingEvalCase {
  readonly id: string;
  readonly inquiry: string;
  readonly tags: readonly BookingEvalTag[];
  readonly expected: BookingEvalExpectation;
}

/**
 * Eval-only booking cases.
 *
 * Relative dates are interpreted against BOOKING_EVAL_CONTEXT.referenceDate.
 * Catalog titles are expected outcomes only. Production must continue to use
 * the live Proposales catalog rather than dictionaries of customer phrases.
 */
export const BOOKING_EVAL_CASES = [
  {
    id: "booking-001",
    inquiry:
      "We are 2 guests and need 1 Standard Double Room from 14 October to 16 October 2026. Please include breakfast.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-14",
      endDate: "2026-10-16",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-002",
    inquiry: "One guest, one Standard Single Room please, from October 20 until October 23, 2026.",
    tags: ["baseline", "absolute-date", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-20",
      endDate: "2026-10-23",
      products: [{ title: "Standard Single Room", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-003",
    inquiry:
      "Two of us would like a Superior Room with View from November 1st to November 4th. Add dinner each evening.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-11-01",
      endDate: "2026-11-04",
      products: [
        { title: "Superior Room with View", quantity: 3 },
        { title: "Dinner", quantity: 6 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-004",
    inquiry:
      "My partner and I need one suite from December 5 to December 7, with breakfast and dinner both days.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-05",
      endDate: "2026-12-07",
      products: [
        { title: "Suite", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
        { title: "Dinner", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-005",
    inquiry:
      "Four colleagues are arriving November 20 and leaving November 23. We need two Standard Double Rooms and a meeting room for one day on the 21st.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      products: [
        { title: "Standard Double Room", quantity: 6 },
        { title: "Meeting Room", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-006",
    inquiry:
      "Three guests need three Standard Single Rooms from October 3rd until October 5th and breakfast every morning.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 3,
      rooms: 3,
      startDate: "2026-10-03",
      endDate: "2026-10-05",
      products: [
        { title: "Standard Single Room", quantity: 6 },
        { title: "Breakfast", quantity: 6 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-007",
    inquiry:
      "One double room for two guests from October 10 to October 12. We'd also like late checkout.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-10",
      endDate: "2026-10-12",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Late Checkout", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-008",
    inquiry:
      "I want one suite for myself for one night, checking in October 7 and leaving October 8.",
    tags: ["baseline", "absolute-date", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-07",
      endDate: "2026-10-08",
      products: [{ title: "Suite", quantity: 1 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-009",
    inquiry:
      "Four guests, two Superior Rooms with View, October 12 through October 15. Breakfast for everyone.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2026-10-12",
      endDate: "2026-10-15",
      products: [
        { title: "Superior Room with View", quantity: 6 },
        { title: "Breakfast", quantity: 12 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-010",
    inquiry:
      "Two people need a Standard Double Room from September 30 until October 2, plus dinner each night.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-09-30",
      endDate: "2026-10-02",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Dinner", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-011",
    inquiry: "1 guest, single room, 18/10/2026 until 20/10/2026, breakfast included please.",
    tags: ["baseline", "numeric-date", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-18",
      endDate: "2026-10-20",
      products: [
        { title: "Standard Single Room", quantity: 2 },
        { title: "Breakfast", quantity: 2 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-012",
    inquiry: "We are two guests. One standard double from Oct 22-25, 2026 is all we need.",
    tags: ["baseline", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-22",
      endDate: "2026-10-25",
      products: [{ title: "Standard Double Room", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-013",
    inquiry:
      "Two guests arrive 1 Nov and depart 3 Nov. Please reserve one suite and let us check out late.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-11-01",
      endDate: "2026-11-03",
      products: [
        { title: "Suite", quantity: 2 },
        { title: "Late Checkout", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-014",
    inquiry:
      "I'm travelling alone. Standard single room for two nights starting November 10, with breakfast.",
    tags: ["baseline", "duration", "multi-product", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-11-10",
      endDate: "2026-11-12",
      products: [
        { title: "Standard Single Room", quantity: 2 },
        { title: "Breakfast", quantity: 2 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-015",
    inquiry:
      "Two guests want a Superior Room with View from December 1 for three nights. Breakfast too.",
    tags: ["baseline", "duration", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-01",
      endDate: "2026-12-04",
      products: [
        { title: "Superior Room with View", quantity: 3 },
        { title: "Breakfast", quantity: 6 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-016",
    inquiry:
      "Four of us need two double rooms from 2026-12-20 through 2026-12-24. Dinner for all four each evening.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2026-12-20",
      endDate: "2026-12-24",
      products: [
        { title: "Standard Double Room", quantity: 8 },
        { title: "Dinner", quantity: 16 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-017",
    inquiry:
      "One double room for two. Check in October 31, check out November 2, and add breakfast.",
    tags: ["baseline", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-31",
      endDate: "2026-11-02",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-018",
    inquiry: "My partner and I just need a double room for one night on September 25.",
    tags: ["baseline", "duration", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-09-25",
      endDate: "2026-09-26",
      products: [{ title: "Standard Double Room", quantity: 1 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-019",
    inquiry:
      "Solo traveller arriving November 6 and leaving after four nights. Single room and dinner please.",
    tags: ["baseline", "duration", "multi-product", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-11-06",
      endDate: "2026-11-10",
      products: [
        { title: "Standard Single Room", quantity: 4 },
        { title: "Dinner", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-020",
    inquiry:
      "Four guests need two standard doubles for three nights starting October 27. Breakfast for everybody.",
    tags: ["baseline", "duration", "multi-product", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2026-10-27",
      endDate: "2026-10-30",
      products: [
        { title: "Standard Double Room", quantity: 6 },
        { title: "Breakfast", quantity: 12 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },

  {
    id: "booking-021",
    inquiry:
      "Me and my girlfriend are coming October 5 to 7. Nothing fancy, just a normal room for two.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-05",
      endDate: "2026-10-07",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-022",
    inquiry: "We just need a regular double for the two of us from October 8 until the 10th.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-08",
      endDate: "2026-10-10",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-023",
    inquiry: "Two people, basic double please, October 11 through October 14.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-11",
      endDate: "2026-10-14",
      products: [{ title: "Standard Double Room", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-024",
    inquiry:
      "I need one room for me and my partner from October 15 to October 17. A standard one is fine.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-15",
      endDate: "2026-10-17",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-025",
    inquiry: "Looking for a normal two-person room for three nights, October 18 to 21.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-18",
      endDate: "2026-10-21",
      products: [{ title: "Standard Double Room", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-026",
    inquiry:
      "I'm travelling alone from October 6 to 9 and just need a room for myself, nothing fancy.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-06",
      endDate: "2026-10-09",
      products: [{ title: "Standard Single Room", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-027",
    inquiry: "One person staying October 10-12. Your simplest single room will do.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-10",
      endDate: "2026-10-12",
      products: [{ title: "Standard Single Room", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-028",
    inquiry: "Just me, October 13 until the 15th. A basic room for one guest please.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-13",
      endDate: "2026-10-15",
      products: [{ title: "Standard Single Room", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-029",
    inquiry: "I need a one-person room from October 19 through October 22.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-19",
      endDate: "2026-10-22",
      products: [{ title: "Standard Single Room", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-030",
    inquiry: "Solo stay October 24 to 26. Just the regular room for one is enough.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-24",
      endDate: "2026-10-26",
      products: [{ title: "Standard Single Room", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-031",
    inquiry: "Two guests from November 4 to 6. We'd like something nicer with a view.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-11-04",
      endDate: "2026-11-06",
      products: [{ title: "Superior Room with View", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-032",
    inquiry:
      "Could we have an upgraded room with a view for November 7 to November 10? Two guests.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-11-07",
      endDate: "2026-11-10",
      products: [{ title: "Superior Room with View", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-033",
    inquiry: "Two of us want the superior option with a view from November 11 until November 13.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-11-11",
      endDate: "2026-11-13",
      products: [{ title: "Superior Room with View", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-034",
    inquiry:
      "We're staying November 15 to 18 and want something better than standard, specifically with a view.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-11-15",
      endDate: "2026-11-18",
      products: [{ title: "Superior Room with View", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-035",
    inquiry: "Please book a suite for two guests from December 8 until December 10.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-08",
      endDate: "2026-12-10",
      products: [{ title: "Suite", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-036",
    inquiry: "My partner and I want one of your spacious suites for December 11 through the 14th.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-11",
      endDate: "2026-12-14",
      products: [{ title: "Suite", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-037",
    inquiry: "Two guests, one premium suite, December 15 to 17 please.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-15",
      endDate: "2026-12-17",
      products: [{ title: "Suite", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-038",
    inquiry:
      "From December 18 to 20 we'd like a suite instead of a regular double room. Two guests.",
    tags: ["semantic-room", "negation", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-18",
      endDate: "2026-12-20",
      products: [{ title: "Suite", quantity: 2 }],
      excludedProducts: ["Standard Double Room"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-039",
    inquiry: "Four of us are coming January 5 to 7, 2027. We'd like two suites.",
    tags: ["semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2027-01-05",
      endDate: "2027-01-07",
      products: [{ title: "Suite", quantity: 4 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-040",
    inquiry: "One suite for me and my partner for three nights starting January 8, 2027.",
    tags: ["semantic-room", "duration", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2027-01-08",
      endDate: "2027-01-11",
      products: [{ title: "Suite", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },

  {
    id: "booking-041",
    inquiry: "Two guests, one double room from October 2 to 4. We'd like a morning meal each day.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-02",
      endDate: "2026-10-04",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-042",
    inquiry:
      "I'm staying alone October 5 to 8. Single room and something for breakfast every morning please.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-05",
      endDate: "2026-10-08",
      products: [
        { title: "Standard Single Room", quantity: 3 },
        { title: "Breakfast", quantity: 3 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-043",
    inquiry:
      "Two people need a double from October 9 to 11 and we'd like to eat in the morning at the hotel.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-09",
      endDate: "2026-10-11",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-044",
    inquiry:
      "Double room for two from October 12 to 14. Please include an evening meal for both of us.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-12",
      endDate: "2026-10-14",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Dinner", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-045",
    inquiry: "Just me in a single room October 15-17, and I'd like supper each night.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-15",
      endDate: "2026-10-17",
      products: [
        { title: "Standard Single Room", quantity: 2 },
        { title: "Dinner", quantity: 2 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-046",
    inquiry: "My wife and I need a double October 18-20 with both breakfast and dinner.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-18",
      endDate: "2026-10-20",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
        { title: "Dinner", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-047",
    inquiry:
      "Four colleagues need two doubles October 21-23 and somewhere private to hold a meeting on the 22nd.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2026-10-21",
      endDate: "2026-10-23",
      products: [
        { title: "Standard Double Room", quantity: 4 },
        { title: "Meeting Room", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-048",
    inquiry:
      "Six colleagues are staying November 3 to 5 in three double rooms. We also need a conference room on November 4.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 6,
      rooms: 3,
      startDate: "2026-11-03",
      endDate: "2026-11-05",
      products: [
        { title: "Standard Double Room", quantity: 6 },
        { title: "Meeting Room", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-049",
    inquiry: "We need a workshop room for November 10 and November 11. No accommodation required.",
    tags: ["semantic-addon", "absolute-date", "quantity"],
    expected: {
      guests: null,
      rooms: 0,
      startDate: "2026-11-10",
      endDate: "2026-11-12",
      products: [{ title: "Meeting Room", quantity: 2 }],
      excludedProducts: [
        "Standard Single Room",
        "Standard Double Room",
        "Superior Room with View",
        "Suite",
      ],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-050",
    inquiry:
      "Five colleagues need five single rooms November 15-17 and a private meeting space for one day on the 16th.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 5,
      rooms: 5,
      startDate: "2026-11-15",
      endDate: "2026-11-17",
      products: [
        { title: "Standard Single Room", quantity: 10 },
        { title: "Meeting Room", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-051",
    inquiry:
      "Two guests in a double November 20-22. Our flight is late, so can we keep the room into the afternoon?",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-11-20",
      endDate: "2026-11-22",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Late Checkout", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-052",
    inquiry:
      "I'm alone in a single room November 23-25. Could I check out at 2pm on departure day?",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-11-23",
      endDate: "2026-11-25",
      products: [
        { title: "Standard Single Room", quantity: 2 },
        { title: "Late Checkout", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-053",
    inquiry:
      "Four guests in two doubles November 27-29. We'd like to hold onto both rooms a little longer when we leave.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2026-11-27",
      endDate: "2026-11-29",
      products: [
        { title: "Standard Double Room", quantity: 4 },
        { title: "Late Checkout", quantity: 2 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-054",
    inquiry: "Two of us need a double December 1-3, breakfast both mornings, and a later checkout.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-01",
      endDate: "2026-12-03",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
        { title: "Late Checkout", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-055",
    inquiry:
      "Three colleagues need three singles December 4-6, breakfast, and meeting space on December 5.",
    tags: ["semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 3,
      rooms: 3,
      startDate: "2026-12-04",
      endDate: "2026-12-06",
      products: [
        { title: "Standard Single Room", quantity: 6 },
        { title: "Breakfast", quantity: 6 },
        { title: "Meeting Room", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },

  {
    id: "booking-056",
    inquiry: "Two guests need one standard double December 7-9. No breakfast please.",
    tags: ["negation", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-07",
      endDate: "2026-12-09",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: ["Breakfast"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-057",
    inquiry: "Double room for two December 10-12. Breakfast yes, but definitely no dinner.",
    tags: ["negation", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-10",
      endDate: "2026-12-12",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
      ],
      excludedProducts: ["Dinner"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-058",
    inquiry: "I'm alone December 13-15. Just a standard single room, no meals at all.",
    tags: ["negation", "absolute-date", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-12-13",
      endDate: "2026-12-15",
      products: [{ title: "Standard Single Room", quantity: 2 }],
      excludedProducts: ["Breakfast", "Dinner"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-059",
    inquiry: "We need a standard double December 16-18. A suite is unnecessary.",
    tags: ["negation", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-16",
      endDate: "2026-12-18",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: ["Suite"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-060",
    inquiry: "One guest December 19-21. I need a single room, not a double.",
    tags: ["negation", "absolute-date", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-12-19",
      endDate: "2026-12-21",
      products: [{ title: "Standard Single Room", quantity: 2 }],
      excludedProducts: ["Standard Double Room"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-061",
    inquiry: "Double room for two December 22-24. We won't need any meeting facilities.",
    tags: ["negation", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-22",
      endDate: "2026-12-24",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: ["Meeting Room"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-062",
    inquiry: "Two guests, one double December 26-28. Normal checkout time is fine.",
    tags: ["negation", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-26",
      endDate: "2026-12-28",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: ["Late Checkout"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-063",
    inquiry: "We need a normal double January 2-4, 2027. We don't care about having a view.",
    tags: ["negation", "semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2027-01-02",
      endDate: "2027-01-04",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: ["Superior Room with View"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-064",
    inquiry:
      "Two people January 5-7 in a standard double. Breakfast please, but no dinner and no meeting room.",
    tags: ["negation", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2027-01-05",
      endDate: "2027-01-07",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
      ],
      excludedProducts: ["Dinner", "Meeting Room"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-065",
    inquiry: "My partner and I want a suite January 8-10. We don't want breakfast or dinner.",
    tags: ["negation", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2027-01-08",
      endDate: "2027-01-10",
      products: [{ title: "Suite", quantity: 2 }],
      excludedProducts: ["Breakfast", "Dinner"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-066",
    inquiry: "Four guests in two standard doubles January 11-13. No late checkout needed.",
    tags: ["negation", "absolute-date", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2027-01-11",
      endDate: "2027-01-13",
      products: [{ title: "Standard Double Room", quantity: 4 }],
      excludedProducts: ["Late Checkout"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-067",
    inquiry: "Double room January 14-17 for two guests, breakfast every morning but not dinner.",
    tags: ["negation", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2027-01-14",
      endDate: "2027-01-17",
      products: [
        { title: "Standard Double Room", quantity: 3 },
        { title: "Breakfast", quantity: 6 },
      ],
      excludedProducts: ["Dinner"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-068",
    inquiry: "We considered a suite, but a standard double is enough. Two guests, January 18-20.",
    tags: ["negation", "semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2027-01-18",
      endDate: "2027-01-20",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: ["Suite"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-069",
    inquiry: "There are two of us, so not a single room. We need a normal double January 21-23.",
    tags: ["negation", "semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2027-01-21",
      endDate: "2027-01-23",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: ["Standard Single Room"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-070",
    inquiry:
      "Two guests January 24-26. Just one standard double, no extras: no meals, meeting room or late checkout.",
    tags: ["negation", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2027-01-24",
      endDate: "2027-01-26",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: ["Breakfast", "Dinner", "Meeting Room", "Late Checkout"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },

  {
    id: "booking-071",
    inquiry:
      "My partner and I need a normal double starting tomorrow for three nights, with breakfast.",
    tags: ["relative-date", "duration", "semantic-room", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-09-06",
      endDate: "2026-09-09",
      products: [
        { title: "Standard Double Room", quantity: 3 },
        { title: "Breakfast", quantity: 6 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-072",
    inquiry: "Two of us need a double next Friday until Sunday.",
    tags: ["relative-date", "semantic-room", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-09-11",
      endDate: "2026-09-13",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-073",
    inquiry:
      "I'm travelling alone. Single room from next Monday for two nights, breakfast included.",
    tags: ["relative-date", "duration", "multi-product", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-09-07",
      endDate: "2026-09-09",
      products: [
        { title: "Standard Single Room", quantity: 2 },
        { title: "Breakfast", quantity: 2 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-074",
    inquiry: "Two guests want a suite this coming Wednesday for one night.",
    tags: ["relative-date", "duration", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-09-09",
      endDate: "2026-09-10",
      products: [{ title: "Suite", quantity: 1 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-075",
    inquiry:
      "In one week, my partner and I want a room with a view for three nights plus breakfast.",
    tags: ["relative-date", "duration", "semantic-room", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-09-12",
      endDate: "2026-09-15",
      products: [
        { title: "Superior Room with View", quantity: 3 },
        { title: "Breakfast", quantity: 6 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-076",
    inquiry: "Ten days from now we need a double for two nights for two guests. Add dinner.",
    tags: ["relative-date", "duration", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-09-15",
      endDate: "2026-09-17",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Dinner", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-077",
    inquiry:
      "Four of us are coming this coming Friday for two nights. Two regular doubles and breakfast please.",
    tags: ["relative-date", "duration", "semantic-room", "multi-product", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2026-09-11",
      endDate: "2026-09-13",
      products: [
        { title: "Standard Double Room", quantity: 4 },
        { title: "Breakfast", quantity: 8 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-078",
    inquiry: "I'm alone and need a standard single from Monday until Thursday next week.",
    tags: ["relative-date", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-09-07",
      endDate: "2026-09-10",
      products: [{ title: "Standard Single Room", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-079",
    inquiry:
      "Next weekend, Friday to Sunday, we'd like a nicer room with a view for two and breakfast.",
    tags: ["relative-date", "semantic-room", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-09-11",
      endDate: "2026-09-13",
      products: [
        { title: "Superior Room with View", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-080",
    inquiry: "Two weeks from today my wife and I want a suite for three nights.",
    tags: ["relative-date", "duration", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-09-19",
      endDate: "2026-09-22",
      products: [{ title: "Suite", quantity: 3 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-081",
    inquiry:
      "Just me, tomorrow night only, standard single please. I'd also like a later checkout the next day.",
    tags: ["relative-date", "duration", "multi-product", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-09-06",
      endDate: "2026-09-07",
      products: [
        { title: "Standard Single Room", quantity: 1 },
        { title: "Late Checkout", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-082",
    inquiry:
      "My partner and I arrive next Tuesday and leave Thursday. One normal double and dinner each night.",
    tags: ["relative-date", "semantic-room", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-09-08",
      endDate: "2026-09-10",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Dinner", quantity: 4 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },

  {
    id: "booking-083",
    inquiry:
      "Sometime in October we'd like a normal double room for two people. We haven't picked the dates yet.",
    tags: ["ambiguous", "semantic-room"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: null,
      endDate: null,
      products: [{ title: "Standard Double Room", quantity: null }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: ["exact stay dates"],
    },
  },
  {
    id: "booking-084",
    inquiry:
      "Around the middle of October we'd like a superior room with a view and breakfast for two.",
    tags: ["ambiguous", "semantic-room", "semantic-addon", "multi-product"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: null,
      endDate: null,
      products: [
        { title: "Superior Room with View", quantity: null },
        { title: "Breakfast", quantity: null },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: ["exact stay dates"],
    },
  },
  {
    id: "booking-085",
    inquiry:
      "We need a double for two nights, but it might start October 10 or November 10. We haven't decided.",
    tags: ["ambiguous", "duration", "semantic-room"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: null,
      endDate: null,
      products: [{ title: "Standard Double Room", quantity: null }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: ["check-in date"],
    },
  },
  {
    id: "booking-086",
    inquiry: "I'm coming Friday for a few days and need a single room.",
    tags: ["ambiguous", "relative-date", "semantic-room"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-09-11",
      endDate: null,
      products: [{ title: "Standard Single Room", quantity: null }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: ["stay duration"],
    },
  },
  {
    id: "booking-087",
    inquiry: "Two of us want a suite sometime in October for maybe three or four nights.",
    tags: ["ambiguous", "duration", "semantic-room"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: null,
      endDate: null,
      products: [{ title: "Suite", quantity: null }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: ["check-in date", "stay duration"],
    },
  },
  {
    id: "booking-088",
    inquiry:
      "Two people need one room October 14-16, but we're not sure which type of room we want yet.",
    tags: ["ambiguous", "absolute-date"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-14",
      endDate: "2026-10-16",
      products: [],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: ["room type"],
    },
  },
  {
    id: "booking-089",
    inquiry: "One room for two people October 14-16. Something nice, surprise us.",
    tags: ["ambiguous", "absolute-date"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-14",
      endDate: "2026-10-16",
      products: [],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: ["room type"],
    },
  },
  {
    id: "booking-090",
    inquiry: "Two guests, one room October 14-16. Breakfast maybe, I'm not sure yet.",
    tags: ["ambiguous", "absolute-date"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-14",
      endDate: "2026-10-16",
      products: [],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: ["room type", "breakfast decision"],
    },
  },
  {
    id: "booking-091",
    inquiry:
      "Two guests need a standard double October 14-16. Can you also arrange an airport pickup?",
    tags: ["unsupported", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-14",
      endDate: "2026-10-16",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: ["airport pickup"],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-092",
    inquiry: "My wife and I want a suite October 18-20, plus parking and a spa treatment.",
    tags: ["unsupported", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-18",
      endDate: "2026-10-20",
      products: [{ title: "Suite", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: ["parking", "spa treatment"],
      unresolvedConcepts: [],
    },
  },

  {
    id: "booking-093",
    inquiry: "2 ppl need 1 stndrd dbl rm from oct 21 till oct 23.",
    tags: ["typo", "semantic-room", "absolute-date", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-21",
      endDate: "2026-10-23",
      products: [{ title: "Standard Double Room", quantity: 2 }],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-094",
    inquiry: "just me oct 24-26, single room + breakfst every morning pls",
    tags: ["typo", "semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 1,
      rooms: 1,
      startDate: "2026-10-24",
      endDate: "2026-10-26",
      products: [
        { title: "Standard Single Room", quantity: 2 },
        { title: "Breakfast", quantity: 2 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-095",
    inquiry: "2 guests 1 normal double oct 27-29 and late chekout if possible",
    tags: ["typo", "semantic-room", "semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-27",
      endDate: "2026-10-29",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Late Checkout", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-096",
    inquiry: "4 ppl, 2 doubles, nov 1-3. need a meetin room on the 2nd too.",
    tags: ["typo", "semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2026-11-01",
      endDate: "2026-11-03",
      products: [
        { title: "Standard Double Room", quantity: 4 },
        { title: "Meeting Room", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-097",
    inquiry:
      "hi were 2 ppl need 1 dbl from 14 oct till 16th, brekky both mornings, no dinner thanks",
    tags: [
      "typo",
      "semantic-room",
      "semantic-addon",
      "negation",
      "absolute-date",
      "multi-product",
      "quantity",
    ],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-14",
      endDate: "2026-10-16",
      products: [
        { title: "Standard Double Room", quantity: 2 },
        { title: "Breakfast", quantity: 4 },
      ],
      excludedProducts: ["Dinner"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-098",
    inquiry: "were 4, need 2 normal doubles 20-23 nov + brekfast for all and meeting room on 21st",
    tags: ["typo", "semantic-room", "semantic-addon", "absolute-date", "multi-product", "quantity"],
    expected: {
      guests: 4,
      rooms: 2,
      startDate: "2026-11-20",
      endDate: "2026-11-23",
      products: [
        { title: "Standard Double Room", quantity: 6 },
        { title: "Breakfast", quantity: 12 },
        { title: "Meeting Room", quantity: 1 },
      ],
      excludedProducts: [],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-099",
    inquiry:
      "my wife n me want a nicer room w view from 1st dec for 3 nites, dinner pls but no brekkie",
    tags: [
      "typo",
      "semantic-room",
      "semantic-addon",
      "negation",
      "duration",
      "multi-product",
      "quantity",
    ],
    expected: {
      guests: 2,
      rooms: 1,
      startDate: "2026-12-01",
      endDate: "2026-12-04",
      products: [
        { title: "Superior Room with View", quantity: 3 },
        { title: "Dinner", quantity: 6 },
      ],
      excludedProducts: ["Breakfast"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
  {
    id: "booking-100",
    inquiry:
      "Hi, six colleagues are visiting January 12-15, 2027. We need three regular double rooms, breakfast for everyone, a meeting room on both the 13th and 14th, and we'd like to keep all three rooms later on departure day. No dinner please.",
    tags: [
      "semantic-room",
      "semantic-addon",
      "negation",
      "absolute-date",
      "multi-product",
      "quantity",
    ],
    expected: {
      guests: 6,
      rooms: 3,
      startDate: "2027-01-12",
      endDate: "2027-01-15",
      products: [
        { title: "Standard Double Room", quantity: 9 },
        { title: "Breakfast", quantity: 18 },
        { title: "Meeting Room", quantity: 2 },
        { title: "Late Checkout", quantity: 3 },
      ],
      excludedProducts: ["Dinner"],
      unsupportedConcepts: [],
      unresolvedConcepts: [],
    },
  },
] as const satisfies readonly BookingEvalCase[];

// packages/ai/scripts/booking-eval-cases.ts

export function validateBookingEvalCases(): void {
  if (BOOKING_EVAL_CASES.length !== 100) {
    throw new Error(
      `Expected exactly 100 booking eval cases, received ${BOOKING_EVAL_CASES.length}.`,
    );
  }

  const ids = new Set<string>();

  for (const testCase of BOOKING_EVAL_CASES) {
    if (ids.has(testCase.id)) {
      throw new Error(`Duplicate booking eval id: ${testCase.id}.`);
    }

    ids.add(testCase.id);

    const { startDate, endDate } = testCase.expected;
    const excludedProducts: readonly CatalogProductTitle[] = testCase.expected.excludedProducts;

    if (startDate !== null && endDate !== null && startDate >= endDate) {
      throw new Error(`${testCase.id} has an invalid date range: ${startDate} -> ${endDate}.`);
    }

    for (const product of testCase.expected.products) {
      if (product.quantity !== null && product.quantity <= 0) {
        throw new Error(`${testCase.id} has an invalid quantity for ${product.title}.`);
      }

      if (excludedProducts.includes(product.title)) {
        throw new Error(`${testCase.id} both requests and excludes ${product.title}.`);
      }
    }
  }
}
