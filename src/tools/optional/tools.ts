import { GroupedToolDefinition, buildGroupedSchema } from "../types.js";

/**
 * Actions tool - action history
 */
export const actionsTool: GroupedToolDefinition = {
  name: "actions",
  description: "View action history for boards and cards.",
  operations: {
    boardActions: {
      method: "GET",
      path: "/boards/{boardId}/actions",
      description: "Get action history for a board",
    },
    cardActions: {
      method: "GET",
      path: "/cards/{cardId}/actions",
      description: "Get action history for a card",
    },
  },
  inputSchema: buildGroupedSchema(
    ["boardActions", "cardActions"],
    {
      boardActions: "Get board action history",
      cardActions: "Get card action history",
    },
    {
      id: {
        description: "Board ID (for boardActions) or Card ID (for cardActions)",
        requiredFor: ["boardActions", "cardActions"],
      },
      query: {
        beforeId: { type: "string", description: "Get actions before this ID (pagination)" },
      },
    }
  ),
};

/**
 * Attachments tool - manages card attachments
 */
export const attachmentsTool: GroupedToolDefinition = {
  name: "attachments",
  description: "Manage attachments on Planka cards.",
  operations: {
    create: {
      method: "POST",
      path: "/cards/{cardId}/attachments",
      description: "Add an attachment to a card",
      upload: true,
    },
    update: {
      method: "PATCH",
      path: "/attachments/{id}",
      description: "Update attachment properties",
    },
    delete: {
      method: "DELETE",
      path: "/attachments/{id}",
      description: "Delete an attachment",
    },
  },
  inputSchema: buildGroupedSchema(
    ["create", "update", "delete"],
    {
      create: "Add attachment to card",
      update: "Update attachment",
      delete: "Delete attachment",
    },
    {
      id: {
        description: "Card ID (for create) or Attachment ID (for update, delete)",
        requiredFor: ["create", "update", "delete"],
      },
      data: {
        description: "Attachment data: { type: 'file'|'link', name?: string, url?: string (for link) }",
        requiredFor: ["create", "update"],
      },
    }
  ),
};

/**
 * Board Members tool - manages board memberships
 */
export const boardMembersTool: GroupedToolDefinition = {
  name: "boardMembers",
  description: "Manage user memberships on Planka boards.",
  operations: {
    add: {
      method: "POST",
      path: "/boards/{boardId}/board-memberships",
      description: "Add a user to a board",
    },
    update: {
      method: "PATCH",
      path: "/board-memberships/{id}",
      description: "Update membership role",
    },
    remove: {
      method: "DELETE",
      path: "/board-memberships/{id}",
      description: "Remove a user from a board",
    },
  },
  inputSchema: buildGroupedSchema(
    ["add", "update", "remove"],
    {
      add: "Add user to board",
      update: "Update membership role",
      remove: "Remove user from board",
    },
    {
      id: {
        description: "Board ID (for add) or Board Membership ID (for update, remove)",
        requiredFor: ["add", "update", "remove"],
      },
      data: {
        description: "Membership data: { userId: string, role: 'editor'|'viewer', canComment?: boolean }",
        requiredFor: ["add", "update"],
      },
    }
  ),
};

/**
 * Custom Fields tool - manages custom field groups and fields
 */
export const customFieldsTool: GroupedToolDefinition = {
  name: "customFields",
  description: "Manage custom fields and field groups in Planka.",
  operations: {
    // Base groups (project level)
    createBaseGroup: {
      method: "POST",
      path: "/projects/{projectId}/base-custom-field-groups",
      description: "Create a base custom field group template",
    },
    updateBaseGroup: {
      method: "PATCH",
      path: "/base-custom-field-groups/{id}",
      description: "Update a base custom field group",
    },
    deleteBaseGroup: {
      method: "DELETE",
      path: "/base-custom-field-groups/{id}",
      description: "Delete a base custom field group",
    },
    // Board/Card groups
    createBoardGroup: {
      method: "POST",
      path: "/boards/{boardId}/custom-field-groups",
      description: "Create a custom field group on a board",
    },
    createCardGroup: {
      method: "POST",
      path: "/cards/{cardId}/custom-field-groups",
      description: "Create a custom field group on a card",
    },
    getGroup: {
      method: "GET",
      path: "/custom-field-groups/{id}",
      description: "Get a custom field group with fields",
    },
    updateGroup: {
      method: "PATCH",
      path: "/custom-field-groups/{id}",
      description: "Update a custom field group",
    },
    deleteGroup: {
      method: "DELETE",
      path: "/custom-field-groups/{id}",
      description: "Delete a custom field group",
    },
    // Fields
    createFieldInBase: {
      method: "POST",
      path: "/base-custom-field-groups/{baseCustomFieldGroupId}/custom-fields",
      description: "Create a field in a base group",
    },
    createField: {
      method: "POST",
      path: "/custom-field-groups/{customFieldGroupId}/custom-fields",
      description: "Create a field in a group",
    },
    updateField: {
      method: "PATCH",
      path: "/custom-fields/{id}",
      description: "Update a custom field",
    },
    deleteField: {
      method: "DELETE",
      path: "/custom-fields/{id}",
      description: "Delete a custom field",
    },
    // Field values
    setValue: {
      method: "PATCH",
      path: "/cards/{cardId}/custom-field-values/customFieldGroupId:{customFieldGroupId}:customFieldId:{customFieldId}",
      description: "Set a custom field value on a card",
    },
    clearValue: {
      method: "DELETE",
      path: "/cards/{cardId}/custom-field-value/customFieldGroupId:{customFieldGroupId}:customFieldId:{customFieldId}",
      description: "Clear a custom field value",
    },
  },
  inputSchema: buildGroupedSchema(
    ["createBaseGroup", "updateBaseGroup", "deleteBaseGroup", "createBoardGroup", "createCardGroup", "getGroup", "updateGroup", "deleteGroup", "createFieldInBase", "createField", "updateField", "deleteField", "setValue", "clearValue"],
    {
      createBaseGroup: "Create base field group",
      updateBaseGroup: "Update base field group",
      deleteBaseGroup: "Delete base field group",
      createBoardGroup: "Create board field group",
      createCardGroup: "Create card field group",
      getGroup: "Get field group",
      updateGroup: "Update field group",
      deleteGroup: "Delete field group",
      createFieldInBase: "Create field in base group",
      createField: "Create field in group",
      updateField: "Update field",
      deleteField: "Delete field",
      setValue: "Set field value",
      clearValue: "Clear field value",
    },
    {
      id: {
        description: "Resource ID - varies by action (project, board, card, group, or field ID)",
        requiredFor: ["createBaseGroup", "updateBaseGroup", "deleteBaseGroup", "createBoardGroup", "createCardGroup", "getGroup", "updateGroup", "deleteGroup", "createFieldInBase", "createField", "updateField", "deleteField", "setValue", "clearValue"],
      },
      data: {
        description: "Field/group data: { name?: string, position?: number, content?: string (for setValue), customFieldGroupId?: string, customFieldId?: string }",
        requiredFor: ["createBaseGroup", "updateBaseGroup", "createBoardGroup", "createCardGroup", "updateGroup", "createFieldInBase", "createField", "updateField", "setValue"],
      },
    }
  ),
};

/**
 * Notifications tool - manages notifications and notification services
 */
export const notificationsTool: GroupedToolDefinition = {
  name: "notifications",
  description: "Manage Planka notifications and notification services.",
  operations: {
    list: {
      method: "GET",
      path: "/notifications",
      description: "Get all unread notifications",
    },
    get: {
      method: "GET",
      path: "/notifications/{id}",
      description: "Get a specific notification",
    },
    markRead: {
      method: "PATCH",
      path: "/notifications/{id}",
      description: "Mark a notification as read",
    },
    markAllRead: {
      method: "POST",
      path: "/notifications/read-all",
      description: "Mark all notifications as read",
    },
    markCardRead: {
      method: "POST",
      path: "/cards/{id}/read-notifications",
      description: "Mark all notifications for a card as read",
    },
    createUserService: {
      method: "POST",
      path: "/users/{userId}/notification-services",
      description: "Create a user notification service",
    },
    createBoardService: {
      method: "POST",
      path: "/boards/{boardId}/notification-services",
      description: "Create a board notification service",
    },
    updateService: {
      method: "PATCH",
      path: "/notification-services/{id}",
      description: "Update a notification service",
    },
    deleteService: {
      method: "DELETE",
      path: "/notification-services/{id}",
      description: "Delete a notification service",
    },
    testService: {
      method: "POST",
      path: "/notification-services/{id}/test",
      description: "Test a notification service",
    },
  },
  inputSchema: buildGroupedSchema(
    ["list", "get", "markRead", "markAllRead", "markCardRead", "createUserService", "createBoardService", "updateService", "deleteService", "testService"],
    {
      list: "List unread notifications",
      get: "Get notification",
      markRead: "Mark notification read",
      markAllRead: "Mark all read",
      markCardRead: "Mark card notifications read",
      createUserService: "Create user notification service",
      createBoardService: "Create board notification service",
      updateService: "Update notification service",
      deleteService: "Delete notification service",
      testService: "Test notification service",
    },
    {
      id: {
        description: "Notification ID, Card ID, User ID, Board ID, or Service ID depending on action",
        requiredFor: ["get", "markRead", "markCardRead", "createUserService", "createBoardService", "updateService", "deleteService", "testService"],
      },
      data: {
        description: "Service data: { url: string, format: 'text'|'markdown'|'html', isRead?: boolean }",
        requiredFor: ["markRead", "createUserService", "createBoardService", "updateService"],
      },
    }
  ),
};

/**
 * Background Images tool - manages project background images
 */
export const backgroundImagesTool: GroupedToolDefinition = {
  name: "backgroundImages",
  description: "Manage background images for Planka projects.",
  operations: {
    upload: {
      method: "POST",
      path: "/projects/{projectId}/background-images",
      description: "Upload a background image",
      upload: true,
    },
    delete: {
      method: "DELETE",
      path: "/background-images/{id}",
      description: "Delete a background image",
    },
  },
  inputSchema: buildGroupedSchema(
    ["upload", "delete"],
    {
      upload: "Upload background image",
      delete: "Delete background image",
    },
    {
      id: {
        description: "Project ID (for upload) or Background Image ID (for delete)",
        requiredFor: ["upload", "delete"],
      },
      data: {
        description: "Image data (for upload)",
        requiredFor: ["upload"],
      },
    }
  ),
};

/**
 * Card Extras tool - extended card operations
 */
export const cardExtrasTool: GroupedToolDefinition = {
  name: "cardExtras",
  description: "Extended card operations in Planka.",
  operations: {
    duplicate: {
      method: "POST",
      path: "/cards/{id}/duplicate",
      description: "Duplicate a card with all content",
    },
  },
  inputSchema: buildGroupedSchema(
    ["duplicate"],
    {
      duplicate: "Duplicate a card",
    },
    {
      id: {
        description: "Card ID to duplicate",
        requiredFor: ["duplicate"],
      },
      data: {
        description: "Duplicate options: { position?: number }",
      },
    }
  ),
};

/**
 * Comment Extras tool - extended comment operations
 */
export const commentExtrasTool: GroupedToolDefinition = {
  name: "commentExtras",
  description: "Extended comment operations in Planka.",
  operations: {
    update: {
      method: "PATCH",
      path: "/comments/{id}",
      description: "Update a comment",
    },
    delete: {
      method: "DELETE",
      path: "/comments/{id}",
      description: "Delete a comment",
    },
  },
  inputSchema: buildGroupedSchema(
    ["update", "delete"],
    {
      update: "Update a comment",
      delete: "Delete a comment",
    },
    {
      id: {
        description: "Comment ID",
        requiredFor: ["update", "delete"],
      },
      data: {
        description: "Comment data: { text: string }",
        requiredFor: ["update"],
      },
    }
  ),
};

/**
 * List Extras tool - extended list operations
 */
export const listExtrasTool: GroupedToolDefinition = {
  name: "listExtras",
  description: "Extended list operations in Planka.",
  operations: {
    clear: {
      method: "POST",
      path: "/lists/{id}/clear",
      description: "Move all cards in a list to trash",
    },
    moveCards: {
      method: "POST",
      path: "/lists/{id}/move-cards",
      description: "Move all cards to another list",
    },
    sort: {
      method: "POST",
      path: "/lists/{id}/sort",
      description: "Sort cards in a list",
    },
  },
  inputSchema: buildGroupedSchema(
    ["clear", "moveCards", "sort"],
    {
      clear: "Clear list (trash all cards)",
      moveCards: "Move all cards to another list",
      sort: "Sort cards in list",
    },
    {
      id: {
        description: "List ID",
        requiredFor: ["clear", "moveCards", "sort"],
      },
      data: {
        description: "Options: { listId?: string (target for moveCards), fieldName?: 'name'|'dueDate'|'createdAt' (for sort), order?: 'asc'|'desc' (for sort) }",
        requiredFor: ["moveCards", "sort"],
      },
    }
  ),
};

/**
 * Task Extras tool - extended task operations
 */
export const taskExtrasTool: GroupedToolDefinition = {
  name: "taskExtras",
  description: "Extended task and task list operations in Planka.",
  operations: {
    updateList: {
      method: "PATCH",
      path: "/task-lists/{id}",
      description: "Update a task list",
    },
    deleteList: {
      method: "DELETE",
      path: "/task-lists/{id}",
      description: "Delete a task list",
    },
    deleteTask: {
      method: "DELETE",
      path: "/tasks/{id}",
      description: "Delete a task",
    },
  },
  inputSchema: buildGroupedSchema(
    ["updateList", "deleteList", "deleteTask"],
    {
      updateList: "Update task list",
      deleteList: "Delete task list",
      deleteTask: "Delete task",
    },
    {
      id: {
        description: "Task List ID (for updateList, deleteList) or Task ID (for deleteTask)",
        requiredFor: ["updateList", "deleteList", "deleteTask"],
      },
      data: {
        description: "Task list data: { name?: string, position?: number }",
        requiredFor: ["updateList"],
      },
    }
  ),
};

/**
 * Label Extras tool - extended label operations
 */
export const labelExtrasTool: GroupedToolDefinition = {
  name: "labelExtras",
  description: "Extended label operations in Planka.",
  operations: {
    update: {
      method: "PATCH",
      path: "/labels/{id}",
      description: "Update a label",
    },
    delete: {
      method: "DELETE",
      path: "/labels/{id}",
      description: "Delete a label",
    },
    removeFromCard: {
      method: "DELETE",
      path: "/cards/{cardId}/card-labels/labelId:{labelId}",
      description: "Remove a label from a card",
    },
  },
  inputSchema: buildGroupedSchema(
    ["update", "delete", "removeFromCard"],
    {
      update: "Update a label",
      delete: "Delete a label",
      removeFromCard: "Remove label from card",
    },
    {
      id: {
        description: "Label ID (for update, delete) or Card ID (for removeFromCard)",
        requiredFor: ["update", "delete", "removeFromCard"],
      },
      data: {
        description: "Label data: { name?: string, color?: string, position?: number } for update; { labelId: string, cardId: string } for removeFromCard",
        requiredFor: ["update", "removeFromCard"],
      },
    }
  ),
};

/**
 * Card Member Extras tool - extended card membership operations
 */
export const cardMemberExtrasTool: GroupedToolDefinition = {
  name: "cardMemberExtras",
  description: "Extended card membership operations in Planka.",
  operations: {
    remove: {
      method: "DELETE",
      path: "/cards/{cardId}/card-memberships/userId:{userId}",
      description: "Remove a user from a card",
    },
  },
  inputSchema: buildGroupedSchema(
    ["remove"],
    {
      remove: "Remove user from card",
    },
    {
      id: {
        description: "Card ID",
        requiredFor: ["remove"],
      },
      data: {
        description: "Membership data: { userId: string, cardId: string }",
        requiredFor: ["remove"],
      },
    }
  ),
};

/**
 * User Info tool - get user information (non-admin)
 */
export const userInfoTool: GroupedToolDefinition = {
  name: "userInfo",
  description: "Get user profile information.",
  operations: {
    get: {
      method: "GET",
      path: "/users/{id}",
      description: "Get a user's profile",
    },
  },
  inputSchema: buildGroupedSchema(
    ["get"],
    {
      get: "Get user profile",
    },
    {
      id: {
        description: "User ID",
        requiredFor: ["get"],
      },
    }
  ),
};
