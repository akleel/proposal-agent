import { randomUUID } from "node:crypto";

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { StaticCatalogProvider } from "@proposal-agent/catalog";
import {
  createDatabasePool,
  PostgresInquiryReviewRepository,
  PostgresProposalDraftRepository,
} from "@proposal-agent/db";

import { createProposalMcpServer } from "./server";

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL for Proposal Agent MCP server.");
  }

  return databaseUrl;
}

function main(): void {
  const pool = createDatabasePool(requireDatabaseUrl());

  const dependencies = {
    reviewRepository: new PostgresInquiryReviewRepository(pool),
    catalogProvider: new StaticCatalogProvider(),
    proposalDraftRepository: new PostgresProposalDraftRepository(pool),
    generateId: randomUUID,
    now: () => new Date(),
  };

  const handle = serveStdio(() => createProposalMcpServer(dependencies));

  let shutdownStarted = false;

  async function shutdown(): Promise<void> {
    if (shutdownStarted) {
      return;
    }

    shutdownStarted = true;

    try {
      await handle.close();
    } finally {
      await pool.end();
    }
  }

  function requestShutdown(): void {
    void shutdown().catch(() => {
      console.error("[proposal-agent-mcp] graceful shutdown failed.");

      process.exitCode = 1;
    });
  }

  process.once("SIGINT", requestShutdown);

  process.once("SIGTERM", requestShutdown);

  process.stdin.once("end", requestShutdown);
}

try {
  main();
} catch {
  console.error("[proposal-agent-mcp] fatal startup error.");

  process.exitCode = 1;
}
