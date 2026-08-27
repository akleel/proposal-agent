import {
  McpServer,
  type CallToolResult,
} from "@modelcontextprotocol/server";
import {
  mcpCalculatePricingInputSchema,
  mcpCreateDraftInputSchema,
  mcpSearchProductsInputSchema,
  mcpValidateProposalInputSchema,
} from "@proposal-agent/contracts";

import {
  calculatePricingTool,
  createDraftTool,
  searchProductsTool,
  validateProposalTool,
  type ProposalMcpToolDependencies,
} from "./tools";

function jsonToolResult(
  value: unknown,
): CallToolResult {
  const text =
    JSON.stringify(
      value,
    );

  if (text === undefined) {
    throw new Error(
      "MCP tool returned a non-serializable result.",
    );
  }

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

function failedToolResult():
  CallToolResult {
  return {
    content: [
      {
        type: "text",
        text:
          "Tool execution failed.",
      },
    ],
    isError: true,
  };
}

async function executeTool<T>(
  toolName: string,
  operation:
    () => Promise<T>,
): Promise<CallToolResult> {
  try {
    return jsonToolResult(
      await operation(),
    );
  } catch (error) {
    const errorName =
      error instanceof Error
        ? error.name
        : "UnknownError";

    console.error(
      `[proposal-agent-mcp] ${toolName} failed: ${errorName}`,
    );

    return failedToolResult();
  }
}

export function createProposalMcpServer(
  dependencies:
    ProposalMcpToolDependencies,
): McpServer {
  const server =
    new McpServer({
      name:
        "proposal-agent",
      version:
        "0.1.0",
    });

  server.registerTool(
    "search_products",
    {
      title:
        "Search authoritative products",
      description:
        "Search active products in the authoritative Proposal Agent catalog. " +
        "Returns configured catalog prices but never invents or changes prices.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
      inputSchema:
        mcpSearchProductsInputSchema,
    },
    async (input) =>
      executeTool(
        "search_products",
        () =>
          searchProductsTool(
            dependencies,
            input,
          ),
      ),
  );

  server.registerTool(
    "calculate_pricing",
    {
      title:
        "Calculate authoritative pricing",
      description:
        "Calculate deterministic pricing for a human-reviewed inquiry. " +
        "Input contains catalog selections only; authoritative prices, quantities, totals, and budget comparison remain application/domain authority.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
      inputSchema:
        mcpCalculatePricingInputSchema,
    },
    async (input) =>
      executeTool(
        "calculate_pricing",
        () =>
          calculatePricingTool(
            dependencies,
            input,
          ),
      ),
  );

  server.registerTool(
    "validate_proposal",
    {
      title:
        "Validate persisted proposal draft",
      description:
        "Validate the persisted proposal snapshot against deterministic domain invariants. " +
        "A valid result means the snapshot is internally valid; it does not mean approved or sent.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
      inputSchema:
        mcpValidateProposalInputSchema,
    },
    async (input) =>
      executeTool(
        "validate_proposal",
        () =>
          validateProposalTool(
            dependencies,
            input,
          ),
      ),
  );

  server.registerTool(
    "create_draft",
    {
      title:
        "Create review-ready proposal draft",
      description:
        "Create and persist a proposal draft from a human-reviewed inquiry and catalog selections. " +
        "Pricing is recalculated from the authoritative catalog. " +
        "This tool creates draft state only and never approves or sends a proposal.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
      inputSchema:
        mcpCreateDraftInputSchema,
    },
    async (input) =>
      executeTool(
        "create_draft",
        () =>
          createDraftTool(
            dependencies,
            input,
          ),
      ),
  );

  return server;
}
