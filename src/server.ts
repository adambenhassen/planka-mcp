#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { request as undiciRequest, FormData } from "undici";

// Import tool definitions
import { getEnabledTools, toolCounts, GroupedToolDefinition } from "./tools/index.js";
import { buildUploadForm } from "./upload.js";

// ----- Configuration -----
const PLANKA_BASE_URL = process.env.PLANKA_BASE_URL || "http://localhost:3000";
const PLANKA_USERNAME = process.env.PLANKA_USERNAME;
const PLANKA_PASSWORD = process.env.PLANKA_PASSWORD;
const PLANKA_API_KEY = process.env.PLANKA_API_KEY?.trim();
const MCP_PORT = parseInt(process.env.MCP_PORT || "3001", 10);
const MCP_TRANSPORT = process.env.MCP_TRANSPORT || "stdio"; // "stdio" or "sse"
const MAX_HTTP_RETRIES = parseInt(process.env.PLANKA_HTTP_MAX_RETRIES || "2", 10);
const RETRY_BASE_DELAY_MS = parseInt(process.env.PLANKA_HTTP_RETRY_BASE_DELAY_MS || "250", 10);

// Tool category configuration
const ENABLE_ALL_TOOLS = process.env.ENABLE_ALL_TOOLS === "true";
const ENABLE_ADMIN_TOOLS = process.env.ENABLE_ADMIN_TOOLS === "true";
const ENABLE_OPTIONAL_TOOLS = process.env.ENABLE_OPTIONAL_TOOLS === "true";

// ----- Token management -----
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return cachedToken;
  }

  if (!PLANKA_USERNAME || !PLANKA_PASSWORD) {
    throw new Error("Authentication is not configured. Set PLANKA_API_KEY or PLANKA_USERNAME and PLANKA_PASSWORD.");
  }

  const loginUrl = `${PLANKA_BASE_URL}/api/access-tokens`;
  
  const res = await undiciRequest(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      emailOrUsername: PLANKA_USERNAME,
      password: PLANKA_PASSWORD,
    }),
  });

  const text = await res.body.text();
  
  if (res.statusCode !== 200) {
    throw new Error(`Authentication failed: ${res.statusCode} - ${text}`);
  }

  const data = JSON.parse(text);
  cachedToken = data.item;
  // Set expiry to 24 hours from now (Planka tokens typically last longer, but this is safe)
  tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
  
  return cachedToken!;
}

// ----- Helper functions -----
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldRetryStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function formatAttempt(attempt: number): string {
  return `${attempt + 1}/${MAX_HTTP_RETRIES + 1}`;
}

// ----- Build MCP tools from grouped tool definitions -----
interface McpToolDefinition {
  tool: Tool;
  groupedDef: GroupedToolDefinition;
}

function buildTools(): McpToolDefinition[] {
  const enabledTools = getEnabledTools({
    enableAllTools: ENABLE_ALL_TOOLS,
    enableAdminTools: ENABLE_ADMIN_TOOLS,
    enableOptionalTools: ENABLE_OPTIONAL_TOOLS,
  });

  return enabledTools.map((def: GroupedToolDefinition) => ({
    tool: {
      name: def.name,
      description: def.description,
      inputSchema: def.inputSchema,
    },
    groupedDef: def,
  }));
}

// ----- Execute API call for grouped tools -----
async function executeGroupedApiCall(
  groupedDef: GroupedToolDefinition,
  input: any,
  overridePath?: string,
  allowCustomFieldDollarFallback = true,
  retryAttempt = 0,
  unauthorizedRetried = false,
  prebuiltBody?: string | FormData
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const action = input?.action;
    if (!action) {
      return { success: false, error: "Missing required 'action' parameter" };
    }

    const operation = groupedDef.operations[action];
    if (!operation) {
      const validActions = Object.keys(groupedDef.operations).join(", ");
      return { success: false, error: `Invalid action '${action}'. Valid actions: ${validActions}` };
    }

    // Construct URL with path parameters
    let actualPath = overridePath ?? operation.path;
    
    // Replace path parameters from 'id' field or 'data' field
    const pathParams = actualPath.match(/\{(\w+)\}/g) || [];
    for (const param of pathParams) {
      const paramName = param.slice(1, -1); // Remove { and }
      let value: string | undefined;
      
      // Check common parameter mappings
      if (paramName === "id" && input.id) {
        value = input.id;
      } else if (input.id && ["projectId", "boardId", "listId", "cardId", "userId", "taskListId", "baseCustomFieldGroupId", "customFieldGroupId", "customFieldId"].includes(paramName)) {
        value = input.id;
      } else if (input.data?.[paramName]) {
        value = input.data[paramName];
      }
      
      if (value) {
        actualPath = actualPath.replace(param, encodeURIComponent(String(value)));
      }
    }

    // Check if there are still unresolved parameters
    const unresolvedParams = actualPath.match(/\{(\w+)\}/g);
    if (unresolvedParams) {
      return { 
        success: false, 
        error: `Missing required path parameters: ${unresolvedParams.join(", ")}. Provide them via 'id' or 'data'.` 
      };
    }

    const url = new URL(`${PLANKA_BASE_URL}/api${actualPath}`);

    // Add query parameters
    if (input?.query) {
      for (const [k, v] of Object.entries(input.query)) {
        if (Array.isArray(v)) {
          v.forEach(val => url.searchParams.append(k, String(val)));
        } else if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const methodUpper = operation.method;
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    // Add authentication header if required (default to true)
    const requiresAuth = operation.requiresAuth !== false;
    if (requiresAuth) {
      if (PLANKA_API_KEY) {
        headers["X-Api-Key"] = PLANKA_API_KEY;
      } else {
        const token = await getAccessToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    // Handle request body
    let body: string | FormData | undefined = undefined;
    if (["POST", "PUT", "PATCH"].includes(methodUpper) && input?.data !== undefined) {
      if (operation.upload) {
        // Multipart upload. Build the FormData once and reuse it across retries
        // (prebuiltBody) so a url-sourced image is fetched a single time, not
        // re-downloaded on every attempt. undici derives the boundary +
        // Content-Type from FormData, so we must NOT set Content-Type ourselves.
        const kind = groupedDef.name === "attachments" ? "attachment" : "background";
        body = prebuiltBody ?? (await buildUploadForm(kind, input.data));
      } else {
        // JSON is rebuilt each call (cheap, no network), keeping Content-Type correct.
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(input.data);
      }
    }

    let res;
    try {
      res = await undiciRequest(url, { method: methodUpper, headers, body });
    } catch (requestError) {
      if (retryAttempt < MAX_HTTP_RETRIES) {
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, retryAttempt);
        console.error(
          `[retry] network error for ${groupedDef.name}.${action} (${methodUpper} ${actualPath}), attempt ${formatAttempt(retryAttempt)} failed, retrying in ${delayMs}ms: ${requestError instanceof Error ? requestError.message : String(requestError)}`
        );
        await sleep(delayMs);
        return executeGroupedApiCall(
          groupedDef,
          input,
          overridePath,
          allowCustomFieldDollarFallback,
          retryAttempt + 1,
          unauthorizedRetried,
          body
        );
      }
      throw requestError;
    }

    const contentType = res.headers["content-type"] || "";
    const text = await res.body.text();

    let data: any = text;
    if (contentType.includes("application/json") && text) {
      try {
        data = JSON.parse(text);
      } catch {
        // Keep as text if JSON parsing fails
      }
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return { success: true, data };
    } else {
      // If we get 401 with bearer auth, clear the cached token and retry once.
      // API key auth cannot be refreshed in-process.
      if (res.statusCode === 401 && requiresAuth && !PLANKA_API_KEY && cachedToken && !unauthorizedRetried) {
        cachedToken = null;
        tokenExpiry = 0;
        console.error(
          `[auth] received 401 for ${groupedDef.name}.${action} (${methodUpper} ${actualPath}); clearing cached token and retrying once`
        );
        return executeGroupedApiCall(
          groupedDef,
          input,
          overridePath,
          allowCustomFieldDollarFallback,
          retryAttempt,
          true,
          body
        );
      }

      // Compatibility fallback for Planka path variant introduced in newer swagger docs:
      // customFieldId:${customFieldId} vs customFieldId:{customFieldId}
      if (
        res.statusCode === 404 &&
        allowCustomFieldDollarFallback &&
        groupedDef.name === "customFields" &&
        (action === "setValue" || action === "clearValue")
      ) {
        const fallbackPath = (overridePath ?? operation.path).replace(
          "customFieldId:{customFieldId}",
          "customFieldId:${customFieldId}"
        );

        if (fallbackPath !== (overridePath ?? operation.path)) {
          console.error(
            `[compat] 404 for ${groupedDef.name}.${action} using ${actualPath}; retrying with legacy custom field path variant`
          );
          return executeGroupedApiCall(
            groupedDef,
            input,
            fallbackPath,
            false,
            retryAttempt,
            unauthorizedRetried,
            body
          );
        }
      }

      if (shouldRetryStatus(res.statusCode) && retryAttempt < MAX_HTTP_RETRIES) {
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, retryAttempt);
        console.error(
          `[retry] transient HTTP ${res.statusCode} for ${groupedDef.name}.${action} (${methodUpper} ${actualPath}), attempt ${formatAttempt(retryAttempt)} failed, retrying in ${delayMs}ms`
        );
        await sleep(delayMs);
        return executeGroupedApiCall(
          groupedDef,
          input,
          overridePath,
          allowCustomFieldDollarFallback,
          retryAttempt + 1,
          unauthorizedRetried,
          body
        );
      }

      console.error(
        `[error] API call failed for ${groupedDef.name}.${action} (${methodUpper} ${actualPath}) with HTTP ${res.statusCode}`
      );
      
      return {
        success: false,
        error: `HTTP ${res.statusCode}: ${truncate(typeof data === 'string' ? data : JSON.stringify(data), 2000)}`,
      };
    }
  } catch (error) {
    console.error(
      `[error] API call crashed for ${groupedDef.name}.${input?.action ?? "unknown"}: ${error instanceof Error ? error.message : String(error)}`
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ----- Initialize MCP Server -----
const toolDefinitions = buildTools();
const toolMap = new Map(toolDefinitions.map(t => [t.tool.name, t]));

// Log tool configuration
console.error(`Tool configuration (grouped):`);
console.error(`  - Core: ${toolCounts.core} tools (${toolCounts.coreOperations} operations)`);
console.error(`  - Admin: ${toolCounts.admin} tools (${toolCounts.adminOperations} operations) - ${ENABLE_ADMIN_TOOLS ? "enabled" : "disabled"}`);
console.error(`  - Optional: ${toolCounts.optional} tools (${toolCounts.optionalOperations} operations) - ${ENABLE_OPTIONAL_TOOLS ? "enabled" : "disabled"}`);
console.error(`  - Total available: ${toolCounts.total} tools (${toolCounts.totalOperations} operations)`);
console.error(`  - Currently enabled: ${toolDefinitions.length} tools`);

function createMcpServer() {
  const server = new McpServer(
    {
      name: "planka-mcp",
      version: "2.1.1",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions.map(t => t.tool),
    };
  });

  // Handle tool execution
  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    const toolDef = toolMap.get(name);
    if (!toolDef) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    const result = await executeGroupedApiCall(toolDef.groupedDef, args);

    if (result.success) {
      return {
        content: [
          {
            type: "text",
            text: typeof result.data === "string" 
              ? result.data 
              : JSON.stringify(result.data, null, 2),
          },
        ],
      };
    } else {
      return {
        content: [{ type: "text", text: result.error || "Unknown error" }],
        isError: true,
      };
    }
  });

  return server;
}

// ----- Start the server -----
async function main() {
  if (MCP_TRANSPORT === "sse") {
    // SSE transport - supports multiple clients over HTTP
    const activeTransports = new Map<string, SSEServerTransport>();
    const heartbeatIntervals = new Map<string, NodeJS.Timeout>();

    // Heartbeat interval in milliseconds (30 seconds to prevent proxy/load balancer timeouts)
    const HEARTBEAT_INTERVAL = 30000;

    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Enable CORS for browser clients
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      if (url.pathname === "/sse" && req.method === "GET") {
        // New SSE connection - create a new server instance for this client
        const mcpServer = createMcpServer();
        const transport = new SSEServerTransport("/messages", res);
        
        const sessionId = transport.sessionId;
        activeTransports.set(sessionId, transport);
        
        console.error(`Client connected: ${sessionId} (${activeTransports.size} active clients)`);

        // Set up heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            // Send SSE comment as heartbeat (doesn't affect protocol)
            if (!res.writableEnded) {
              res.write(": heartbeat\n\n");
            }
          } catch (err) {
            console.error(`Heartbeat failed for ${sessionId}:`, err);
            clearInterval(heartbeat);
            heartbeatIntervals.delete(sessionId);
          }
        }, HEARTBEAT_INTERVAL);
        heartbeatIntervals.set(sessionId, heartbeat);

        // Handle connection close
        const cleanup = () => {
          const hb = heartbeatIntervals.get(sessionId);
          if (hb) {
            clearInterval(hb);
            heartbeatIntervals.delete(sessionId);
          }
          activeTransports.delete(sessionId);
          console.error(`Client disconnected: ${sessionId} (${activeTransports.size} active clients)`);
        };

        transport.onclose = cleanup;
        
        // Also handle HTTP connection close events
        res.on("close", cleanup);
        res.on("error", (err) => {
          console.error(`SSE stream error for ${sessionId}:`, err);
          cleanup();
        });

        try {
          await mcpServer.server.connect(transport);
        } catch (err) {
          console.error(`Failed to connect transport for ${sessionId}:`, err);
          cleanup();
        }
      } else if (url.pathname === "/messages" && req.method === "POST") {
        // Handle messages for existing SSE connection
        const sessionId = url.searchParams.get("sessionId");
        
        if (!sessionId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing sessionId parameter" }));
          return;
        }

        const transport = activeTransports.get(sessionId);
        if (!transport) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Session not found" }));
          return;
        }

        try {
          await transport.handlePostMessage(req, res);
        } catch (err) {
          console.error(`Error handling message for ${sessionId}:`, err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      } else if (url.pathname === "/health") {
        // Health check endpoint
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          status: "ok", 
          activeClients: activeTransports.size,
          toolsAvailable: toolDefinitions.length,
          toolCounts: {
            core: { tools: toolCounts.core, operations: toolCounts.coreOperations },
            admin: ENABLE_ADMIN_TOOLS ? { tools: toolCounts.admin, operations: toolCounts.adminOperations } : { tools: 0, operations: 0 },
            optional: ENABLE_OPTIONAL_TOOLS ? { tools: toolCounts.optional, operations: toolCounts.optionalOperations } : { tools: 0, operations: 0 },
          },
        }));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    });

    // Set keep-alive timeout to prevent premature connection closure
    httpServer.keepAliveTimeout = 120000; // 2 minutes
    httpServer.headersTimeout = 125000; // Slightly higher than keepAliveTimeout

    httpServer.listen(MCP_PORT, () => {
      console.error(`Planka MCP server (SSE) listening on http://localhost:${MCP_PORT}`);
      console.error(`  - SSE endpoint: http://localhost:${MCP_PORT}/sse`);
      console.error(`  - Messages endpoint: http://localhost:${MCP_PORT}/messages`);
      console.error(`  - Health check: http://localhost:${MCP_PORT}/health`);
      console.error(`  - ${toolDefinitions.length} tools available`);
      console.error(`  - Heartbeat interval: ${HEARTBEAT_INTERVAL / 1000}s`);
    });
  } else {
    // Stdio transport - single client mode
    const mcpServer = createMcpServer();
    const transport = new StdioServerTransport();
    await mcpServer.server.connect(transport);
    console.error(`Planka MCP server started (stdio mode, ${toolDefinitions.length} tools available)`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
