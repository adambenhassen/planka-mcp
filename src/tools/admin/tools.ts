import { GroupedToolDefinition, buildGroupedSchema } from "../types.js";

/**
 * Config tool - manages application configuration (admin only)
 */
export const configTool: GroupedToolDefinition = {
  name: "config",
  description: "Manage Planka application configuration. Requires admin privileges.",
  operations: {
    get: {
      method: "GET",
      path: "/config",
      description: "Get application configuration including SMTP settings",
    },
    update: {
      method: "PATCH",
      path: "/config",
      description: "Update application configuration",
    },
    testSmtp: {
      method: "POST",
      path: "/config/test-smtp",
      description: "Send a test email to verify SMTP configuration",
    },
  },
  inputSchema: buildGroupedSchema(
    ["get", "update", "testSmtp"],
    {
      get: "Get application configuration",
      update: "Update application configuration",
      testSmtp: "Test SMTP configuration by sending a test email",
    },
    {
      data: {
        description: "Config data: { smtpHost?: string, smtpPort?: number, smtpName?: string, smtpUser?: string, smtpPassword?: string, smtpFrom?: string, smtpSecure?: boolean, smtpTlsRejectUnauthorized?: boolean }",
        requiredFor: ["update"],
      },
    }
  ),
};

/**
 * Users tool - manages user accounts (admin only)
 */
export const usersTool: GroupedToolDefinition = {
  name: "users",
  description: "Manage Planka user accounts. Requires admin privileges for most operations.",
  operations: {
    list: {
      method: "GET",
      path: "/users",
      description: "List all users",
    },
    create: {
      method: "POST",
      path: "/users",
      description: "Create a new user account",
    },
    update: {
      method: "PATCH",
      path: "/users/{id}",
      description: "Update user profile",
    },
    delete: {
      method: "DELETE",
      path: "/users/{id}",
      description: "Delete a user account",
    },
    updateEmail: {
      method: "PATCH",
      path: "/users/{id}/email",
      description: "Update user's email address",
    },
    updatePassword: {
      method: "PATCH",
      path: "/users/{id}/password",
      description: "Update user's password",
    },
    updateUsername: {
      method: "PATCH",
      path: "/users/{id}/username",
      description: "Update user's username",
    },
    updateAvatar: {
      method: "POST",
      path: "/users/{id}/avatar",
      description: "Update user's avatar image",
      upload: true,
    },
    createApiKey: {
      method: "POST",
      path: "/users/{id}/api-key",
      description: "Generate an API key for a user",
    },
  },
  inputSchema: buildGroupedSchema(
    ["list", "create", "update", "delete", "updateEmail", "updatePassword", "updateUsername", "updateAvatar", "createApiKey"],
    {
      list: "List all users",
      create: "Create a new user",
      update: "Update user profile",
      delete: "Delete a user",
      updateEmail: "Update user's email",
      updatePassword: "Update user's password",
      updateUsername: "Update user's username",
      updateAvatar: "Update user's avatar",
      createApiKey: "Generate API key for user",
    },
    {
      id: {
        description: "User ID",
        requiredFor: ["update", "delete", "updateEmail", "updatePassword", "updateUsername", "updateAvatar", "createApiKey"],
      },
      data: {
        description: "User data. For create: { email: string (required), password: string (required), name: string (required), role: 'admin'|'projectOwner'|'boardUser' (required), username?: string }. For update: { name?: string, role?: string, isDeactivated?: boolean } — email/password/username can NOT be changed via update; use updateEmail { email }, updatePassword { password }, updateUsername { username }, each plus currentPassword?: string (required when changing your own account). For updateAvatar: { url?: string (image fetched server-side), base64?: string (tiny fallback, <1MB) } — provide exactly one of url/base64.",
        requiredFor: ["create", "update", "updateEmail", "updatePassword", "updateUsername", "updateAvatar"],
      },
    }
  ),
};

/**
 * Webhooks tool - manages webhooks (admin only)
 */
export const webhooksTool: GroupedToolDefinition = {
  name: "webhooks",
  description: "Manage Planka webhooks for event notifications. Requires admin privileges.",
  operations: {
    list: {
      method: "GET",
      path: "/webhooks",
      description: "List all configured webhooks",
    },
    create: {
      method: "POST",
      path: "/webhooks",
      description: "Create a new webhook",
    },
    update: {
      method: "PATCH",
      path: "/webhooks/{id}",
      description: "Update webhook configuration",
    },
    delete: {
      method: "DELETE",
      path: "/webhooks/{id}",
      description: "Delete a webhook",
    },
  },
  inputSchema: buildGroupedSchema(
    ["list", "create", "update", "delete"],
    {
      list: "List all webhooks",
      create: "Create a new webhook",
      update: "Update webhook configuration",
      delete: "Delete a webhook",
    },
    {
      id: {
        description: "Webhook ID",
        requiredFor: ["update", "delete"],
      },
      data: {
        description: "Webhook data: { name: string (required for create), url: string (required for create), accessToken?: string, events?: string (comma-separated, e.g. 'cardCreate,cardUpdate'), excludedEvents?: string (comma-separated) }",
        requiredFor: ["create", "update"],
      },
    }
  ),
};

/**
 * Project Managers tool - manages project manager assignments
 */
export const projectManagersTool: GroupedToolDefinition = {
  name: "projectManagers",
  description: "Manage project manager assignments. Requires admin privileges for shared projects.",
  operations: {
    add: {
      method: "POST",
      path: "/projects/{projectId}/project-managers",
      description: "Add a user as project manager",
    },
    remove: {
      method: "DELETE",
      path: "/project-managers/{id}",
      description: "Remove a project manager",
    },
  },
  inputSchema: buildGroupedSchema(
    ["add", "remove"],
    {
      add: "Add a project manager",
      remove: "Remove a project manager",
    },
    {
      id: {
        description: "Project ID (for add) or Project Manager ID (for remove)",
        requiredFor: ["add", "remove"],
      },
      data: {
        description: "Manager data: { userId: string }",
        requiredFor: ["add"],
      },
    }
  ),
};
