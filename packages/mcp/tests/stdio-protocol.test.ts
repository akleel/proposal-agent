import { Client } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { describe, expect, it } from "vitest";

const inquiryId = "3ac7f2de-7430-47d6-b63f-9c899eafd248";

interface SearchProductsPayload {
  readonly catalogVersion: string;
  readonly products: readonly {
    readonly id: string;
    readonly unitPriceMinor: number;
  }[];
}

function requireTextContent(result: {
  readonly content?: readonly {
    readonly type: string;
    readonly text?: string;
  }[];
}): string {
  const textBlock = result.content?.find((block) => block.type === "text");

  if (!textBlock || typeof textBlock.text !== "string") {
    throw new Error("Expected MCP text content.");
  }

  return textBlock.text;
}

describe("Proposal Agent MCP stdio protocol", () => {
  it("negotiates 2026-07-28, exposes four tools, and rejects authority escalation", async () => {
    const client = new Client(
      {
        name: "proposal-agent-protocol-test",
        version: "1.0.0",
      },
      {
        versionNegotiation: {
          mode: "auto",
        },
      },
    );

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", "src/stdio.ts"],
      cwd: process.cwd(),
      env: {
        ...getDefaultEnvironment(),
        DATABASE_URL: "postgresql://mcp_smoke:mcp_smoke@127.0.0.1:1/mcp_smoke",
      },
    });

    try {
      await client.connect(transport);

      expect(client.getNegotiatedProtocolVersion()).toBe("2026-07-28");

      expect(client.getProtocolEra()).toBe("modern");

      const { tools } = await client.listTools();

      expect(tools.map((tool) => tool.name).sort()).toEqual([
        "calculate_pricing",
        "create_draft",
        "search_products",
        "validate_proposal",
      ]);

      const searchResult = await client.callTool({
        name: "search_products",
        arguments: {
          query: "room",
        },
      });

      expect(searchResult.isError).not.toBe(true);

      const payload = JSON.parse(requireTextContent(searchResult)) as SearchProductsPayload;

      expect(payload.catalogVersion).toBe("2026-08-demo-v1");

      expect(
        payload.products.map((product) => ({
          id: product.id,
          unitPriceMinor: product.unitPriceMinor,
        })),
      ).toEqual([
        {
          id: "hotel_room_night",
          unitPriceMinor: 150_000,
        },
        {
          id: "meeting_room_day",
          unitPriceMinor: 600_000,
        },
        {
          id: "late_checkout_room",
          unitPriceMinor: 30_000,
        },
      ]);

      const rejectedCreate = await client.callTool({
        name: "create_draft",
        arguments: {
          inquiryId,
          selections: [
            {
              catalogItemId: "hotel_room_night",
              occurrences: 1,
            },
          ],
          approved: true,
        },
      });

      expect(rejectedCreate.isError).toBe(true);

      expect(requireTextContent(rejectedCreate)).toContain("Input validation error");
    } finally {
      await client.close();
    }
  }, 20_000);
});
