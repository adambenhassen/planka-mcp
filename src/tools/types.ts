/**
 * Tool definition for Planka MCP server
 * Supports grouped tools with multiple actions/operations
 */

/**
 * Defines a single API operation within a grouped tool
 */
export interface ToolOperation {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** API path with parameter placeholders (e.g., /projects/{id}) */
  path: string;
  /** Whether this endpoint requires authentication */
  requiresAuth?: boolean; // defaults to true
  /** Description of this specific operation */
  description?: string;
  /** When true, the executor sends multipart/form-data (image upload) instead of JSON */
  upload?: boolean;
}

/**
 * Grouped tool definition - multiple operations under one tool
 */
export interface GroupedToolDefinition {
  /** Tool name (lowercase, used as MCP tool identifier) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** Map of action names to their operations */
  operations: Record<string, ToolOperation>;
  /** Input schema for MCP tool */
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Tool category for filtering
 */
export type ToolCategory = "core" | "admin" | "optional";

/**
 * Helper to build input schema for grouped tools
 */
export function buildGroupedSchema(
  actions: string[],
  actionDescriptions: Record<string, string>,
  params?: {
    id?: { description: string; requiredFor?: string[] };
    data?: { description: string; requiredFor?: string[] };
    query?: Record<string, { type: string; description: string }>;
    extra?: Record<string, any>;
  }
): GroupedToolDefinition["inputSchema"] {
  const properties: Record<string, any> = {
    action: {
      type: "string",
      enum: actions,
      description: `Action to perform: ${actions.map(a => `'${a}' - ${actionDescriptions[a]}`).join("; ")}`,
    },
  };

  if (params?.id) {
    properties.id = {
      type: "string",
      description: params.id.description + (params.id.requiredFor ? ` (required for: ${params.id.requiredFor.join(", ")})` : ""),
    };
  }

  if (params?.data) {
    properties.data = {
      type: "object",
      description: params.data.description + (params.data.requiredFor ? ` (required for: ${params.data.requiredFor.join(", ")})` : ""),
      additionalProperties: true,
    };
  }

  if (params?.query) {
    properties.query = {
      type: "object",
      description: "Query parameters for filtering/pagination",
      properties: params.query,
    };
  }

  if (params?.extra) {
    Object.assign(properties, params.extra);
  }

  return {
    type: "object",
    properties,
    required: ["action"],
  };
}
