#!/usr/bin/env node
/**
 * Sinch MCP Server Entry Point
 *
 * This is the main entry point for the Sinch MCP server.
 * It sets up the server with all tools and handlers for Sinch communication APIs.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { server } from './sinch-server.js';
import { tools, handleToolCall } from './tools.js';
// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const result = await handleToolCall(request.params.name, request.params.arguments);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }]
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [{
                    type: "text",
                    text: `Error: ${errorMessage}`
                }],
            isError: true
        };
    }
});
async function main() {
    console.error("Starting Sinch MCP Server...");
    // Validate required environment variables
    if (!process.env.SINCH_SERVICE_PLAN_ID) {
        console.error("Error: SINCH_SERVICE_PLAN_ID environment variable is required");
        process.exit(1);
    }
    if (!process.env.SINCH_API_TOKEN) {
        console.error("Error: SINCH_API_TOKEN environment variable is required");
        process.exit(1);
    }
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Sinch MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
