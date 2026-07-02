import { GroupedToolDefinition, buildGroupedSchema } from "../types.js";

/**
 * Auth tool - authentication operations
 */
export const authTool: GroupedToolDefinition = {
  name: "auth",
  description: "Authentication operations for login flows, token management, and terms acceptance.",
  operations: {
    login: {
      method: "POST",
      path: "/access-tokens",
      requiresAuth: false,
      description: "Authenticate with email/username and password",
    },
    logout: {
      method: "DELETE",
      path: "/access-tokens/me",
      description: "Logout current user",
    },
    acceptTerms: {
      method: "POST",
      path: "/access-tokens/accept-terms",
      requiresAuth: false,
      description: "Accept terms during authentication flow",
    },
    oidcExchange: {
      method: "POST",
      path: "/access-tokens/exchange-with-oidc",
      requiresAuth: false,
      description: "Exchange OIDC code for access token",
    },
    revokePending: {
      method: "POST",
      path: "/access-tokens/revoke-pending-token",
      requiresAuth: false,
      description: "Revoke pending authentication token",
    },
    getTerms: {
      method: "GET",
      path: "/terms",
      requiresAuth: false,
      description: "Get terms and conditions",
    },
  },
  inputSchema: buildGroupedSchema(
    ["login", "logout", "acceptTerms", "oidcExchange", "revokePending", "getTerms"],
    {
      login: "Login with credentials",
      logout: "Logout current session",
      acceptTerms: "Accept terms during auth",
      oidcExchange: "Exchange OIDC code",
      revokePending: "Revoke pending token",
      getTerms: "Get terms document",
    },
    {
      data: {
        description: "Auth data: { emailOrUsername?: string + password?: string (for login), pendingToken?: string (for acceptTerms/revokePending), signature?: string (for acceptTerms), code?: string + nonce?: string (for oidcExchange) }",
        requiredFor: ["login", "acceptTerms", "oidcExchange", "revokePending"],
      },
      query: {
        language: { type: "string", description: "Language code for terms" },
      },
    }
  ),
};

/**
 * Projects tool - manages Planka projects
 */
export const projectsTool: GroupedToolDefinition = {
  name: "projects",
  description: "Manage Planka projects. Projects are top-level containers for boards.",
  operations: {
    list: {
      method: "GET",
      path: "/projects",
      description: "List all projects accessible to the current user",
    },
    get: {
      method: "GET",
      path: "/projects/{id}",
      description: "Get detailed project information including boards and memberships",
    },
    create: {
      method: "POST",
      path: "/projects",
      description: "Create a new project (you become the project manager)",
    },
    update: {
      method: "PATCH",
      path: "/projects/{id}",
      description: "Update project settings",
    },
    delete: {
      method: "DELETE",
      path: "/projects/{id}",
      description: "Delete a project and all its data",
    },
  },
  inputSchema: buildGroupedSchema(
    ["list", "get", "create", "update", "delete"],
    {
      list: "List all accessible projects",
      get: "Get project details by ID",
      create: "Create a new project",
      update: "Update project settings",
      delete: "Delete a project",
    },
    {
      id: {
        description: "Project ID",
        requiredFor: ["get", "update", "delete"],
      },
      data: {
        description: "Project data: { name: string, type: 'private'|'shared' (required for create; create only), description?: string. Update only: backgroundType?: 'gradient'|'image', backgroundGradient?: string (one of: old-lime, ocean-dive, tzepesch-style, jungle-mesh, strawberry-dust, purple-rose, sun-scream, warm-rust, sky-change, green-eyes, blue-xchange, blood-orange, sour-peel, green-ninja, algae-green, coral-reef, steel-grey, heat-waves, velvet-lounge, purple-rain, blue-steel, blueish-curve, prism-light, green-mist, red-curtain), backgroundImageId?: string (id from backgroundImages.upload; required with backgroundType:'image'; null to clear), isFavorite?: boolean, isHidden?: boolean }",
        requiredFor: ["create", "update"],
      },
    }
  ),
};

/**
 * Boards tool - manages boards within projects
 */
export const boardsTool: GroupedToolDefinition = {
  name: "boards",
  description: "Manage Planka boards. Boards contain lists and cards for organizing work.",
  operations: {
    get: {
      method: "GET",
      path: "/boards/{id}",
      description: "Get board with lists, cards, labels, and memberships",
    },
    create: {
      method: "POST",
      path: "/projects/{projectId}/boards",
      description: "Create a new board in a project",
    },
    update: {
      method: "PATCH",
      path: "/boards/{id}",
      description: "Update board settings",
    },
    delete: {
      method: "DELETE",
      path: "/boards/{id}",
      description: "Delete a board and all its data",
    },
  },
  inputSchema: buildGroupedSchema(
    ["get", "create", "update", "delete"],
    {
      get: "Get board details by ID",
      create: "Create a new board in a project",
      update: "Update board settings",
      delete: "Delete a board",
    },
    {
      id: {
        description: "Board ID (for get, update, delete) or Project ID (for create, use projectId in data)",
        requiredFor: ["get", "update", "delete"],
      },
      data: {
        description: "Board data: { name: string, position: number (required for create), projectId?: string (for create), defaultView?: 'kanban'|'grid'|'list' (update only), defaultCardType?: 'project'|'story' (update only) }",
        requiredFor: ["create", "update"],
      },
    }
  ),
};

/**
 * Lists tool - manages lists within boards
 */
export const listsTool: GroupedToolDefinition = {
  name: "lists",
  description: "Manage Planka lists. Lists are columns on a board that contain cards.",
  operations: {
    get: {
      method: "GET",
      path: "/lists/{id}",
      description: "Get a list with its cards",
    },
    create: {
      method: "POST",
      path: "/boards/{boardId}/lists",
      description: "Create a new list on a board",
    },
    update: {
      method: "PATCH",
      path: "/lists/{id}",
      description: "Update list name, position, or type",
    },
    delete: {
      method: "DELETE",
      path: "/lists/{id}",
      description: "Delete a list (cards move to trash)",
    },
  },
  inputSchema: buildGroupedSchema(
    ["get", "create", "update", "delete"],
    {
      get: "Get list details and cards",
      create: "Create a new list on a board",
      update: "Update list settings",
      delete: "Delete a list",
    },
    {
      id: {
        description: "List ID (for get, update, delete) or Board ID (for create, use boardId in data)",
        requiredFor: ["get", "update", "delete"],
      },
      data: {
        description: "List data: { name: string, type: 'active'|'closed' (required for create), position: number (required for create), boardId?: string (for create/move), color?: string|null (update only; one of: berry-red, pumpkin-orange, lagoon-blue, pink-tulip, light-mud, orange-peel, bright-moss, antique-blue, dark-granite, turquoise-sea) }",
        requiredFor: ["create", "update"],
      },
    }
  ),
};

/**
 * Cards tool - manages cards within lists
 */
export const cardsTool: GroupedToolDefinition = {
  name: "cards",
  description: "Manage Planka cards. Cards are individual work items on a board.",
  operations: {
    list: {
      method: "GET",
      path: "/lists/{listId}/cards",
      description: "Get cards from a list with filtering, search, and pagination",
    },
    get: {
      method: "GET",
      path: "/cards/{id}",
      description: "Get card with task lists, attachments, and custom fields",
    },
    create: {
      method: "POST",
      path: "/lists/{listId}/cards",
      description: "Create a new card in a list",
    },
    update: {
      method: "PATCH",
      path: "/cards/{id}",
      description: "Update card properties (can move between lists)",
    },
    delete: {
      method: "DELETE",
      path: "/cards/{id}",
      description: "Delete a card permanently",
    },
  },
  inputSchema: buildGroupedSchema(
    ["list", "get", "create", "update", "delete"],
    {
      list: "Get cards from a list (requires listId)",
      get: "Get card details by ID",
      create: "Create a new card",
      update: "Update card properties",
      delete: "Delete a card",
    },
    {
      id: {
        description: "Card ID (for get, update, delete) or List ID (for list, create)",
        requiredFor: ["list", "get", "update", "delete"],
      },
      data: {
        description: "Card data: { name: string, type: 'project'|'story' (required for create), listId?: string (for create/move), boardId?: string (update only: move to another board), position?: number (required when moving to a new list), description?: string, dueDate?: string, isDueCompleted?: boolean, coverAttachmentId?: string (set the card's cover to an uploaded image attachment; null to clear), stopwatch?: { startedAt: string, total: number } }",
        requiredFor: ["create", "update"],
      },
      query: {
        search: { type: "string", description: "Search term to filter cards" },
        userIds: { type: "string", description: "Comma-separated user IDs to filter by" },
        labelIds: { type: "string", description: "Comma-separated label IDs to filter by" },
        "before[id]": { type: "string", description: "Pagination cursor: card ID from the last result (must be paired with before[listChangedAt])" },
        "before[listChangedAt]": { type: "string", description: "Pagination cursor: listChangedAt from the last result (must be paired with before[id])" },
      },
    }
  ),
};

/**
 * Comments tool - manages comments on cards
 */
export const commentsTool: GroupedToolDefinition = {
  name: "comments",
  description: "Manage comments on Planka cards.",
  operations: {
    list: {
      method: "GET",
      path: "/cards/{cardId}/comments",
      description: "Get comments for a card with pagination",
    },
    create: {
      method: "POST",
      path: "/cards/{cardId}/comments",
      description: "Add a comment to a card",
    },
  },
  inputSchema: buildGroupedSchema(
    ["list", "create"],
    {
      list: "Get comments for a card",
      create: "Add a comment to a card",
    },
    {
      id: {
        description: "Card ID to get/add comments",
        requiredFor: ["list", "create"],
      },
      data: {
        description: "Comment data: { text: string }",
        requiredFor: ["create"],
      },
      query: {
        beforeId: { type: "string", description: "Get comments before this ID (pagination)" },
      },
    }
  ),
};

/**
 * Tasks tool - manages task lists and tasks on cards
 */
export const tasksTool: GroupedToolDefinition = {
  name: "tasks",
  description: "Manage task lists and tasks on Planka cards. Tasks are checklist items within a card.",
  operations: {
    getList: {
      method: "GET",
      path: "/task-lists/{id}",
      description: "Get a task list with all its tasks",
    },
    createList: {
      method: "POST",
      path: "/cards/{cardId}/task-lists",
      description: "Create a new task list on a card",
    },
    create: {
      method: "POST",
      path: "/task-lists/{taskListId}/tasks",
      description: "Create a new task in a task list",
    },
    update: {
      method: "PATCH",
      path: "/tasks/{id}",
      description: "Update task (name, completion status, assignee)",
    },
  },
  inputSchema: buildGroupedSchema(
    ["getList", "createList", "create", "update"],
    {
      getList: "Get a task list by ID",
      createList: "Create a task list on a card",
      create: "Create a task in a task list",
      update: "Update a task",
    },
    {
      id: {
        description: "Task List ID (for getList), Card ID (for createList), Task List ID (for create, use taskListId in data), or Task ID (for update)",
        requiredFor: ["getList", "createList", "create", "update"],
      },
      data: {
        description: "Data: { name?: string (required for createList; required for create unless linkedCardId is provided), position: number (required for createList/create), cardId?: string (for createList), taskListId?: string (for create, or on update to move the task to another list), isCompleted?: boolean, assigneeUserId?: string (update only), linkedCardId?: string (for create) }",
        requiredFor: ["createList", "create", "update"],
      },
    }
  ),
};

/**
 * Labels tool - manages labels on boards and cards
 */
export const labelsTool: GroupedToolDefinition = {
  name: "labels",
  description: "Manage labels on Planka boards and cards. Labels help categorize and filter cards.",
  operations: {
    create: {
      method: "POST",
      path: "/boards/{boardId}/labels",
      description: "Create a new label on a board",
    },
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
    addToCard: {
      method: "POST",
      path: "/cards/{cardId}/card-labels",
      description: "Add a label to a card",
    },
    removeFromCard: {
      method: "DELETE",
      path: "/cards/{cardId}/card-labels/labelId:{labelId}",
      description: "Remove a label from a card",
    },
  },
  inputSchema: buildGroupedSchema(
    ["create", "update", "delete", "addToCard", "removeFromCard"],
    {
      create: "Create a label on a board",
      update: "Update a label's name, color, or position",
      delete: "Delete a label from a board",
      addToCard: "Add a label to a card",
      removeFromCard: "Remove a label from a card",
    },
    {
      id: {
        description: "Board ID (for create), Label ID (for update, delete), or Card ID (for addToCard, removeFromCard)",
        requiredFor: ["create", "update", "delete", "addToCard", "removeFromCard"],
      },
      data: {
        description: "Label data: { name?: string, color: string, position: number } for create/update, { labelId: string } for addToCard/removeFromCard. Colors: muddy-grey, autumn-leafs, morning-sky, antique-blue, egg-yellow, desert-sand, dark-granite, fresh-salad, lagoon-blue, midnight-blue, light-orange, pumpkin-orange, light-concrete, sunny-grass, navy-blue, lilac-eyes, apricot-red, orange-peel, silver-glint, bright-moss, deep-ocean, summer-sky, berry-red, light-cocoa, grey-stone, tank-green, coral-green, sugar-plum, pink-tulip, shady-rust, wet-rock, wet-moss, turquoise-sea, lavender-fields, piggy-red, light-mud, gun-metal, modern-green, french-coast, sweet-lilac, red-burgundy, pirate-gold",
        requiredFor: ["create", "update", "addToCard", "removeFromCard"],
      },
    }
  ),
};

/**
 * Card Members tool - manages card memberships
 */
export const cardMembersTool: GroupedToolDefinition = {
  name: "cardMembers",
  description: "Manage user assignments on Planka cards.",
  operations: {
    add: {
      method: "POST",
      path: "/cards/{cardId}/card-memberships",
      description: "Assign a user to a card",
    },
    remove: {
      method: "DELETE",
      path: "/cards/{cardId}/card-memberships/userId:{userId}",
      description: "Remove a user from a card",
    },
  },
  inputSchema: buildGroupedSchema(
    ["add", "remove"],
    {
      add: "Assign a user to a card",
      remove: "Remove a user from a card",
    },
    {
      id: {
        description: "Card ID",
        requiredFor: ["add", "remove"],
      },
      data: {
        description: "Membership data: { userId: string }",
        requiredFor: ["add", "remove"],
      },
    }
  ),
};

/**
 * Bootstrap tool - retrieves application initialization data
 */
export const bootstrapTool: GroupedToolDefinition = {
  name: "bootstrap",
  description: "Get Planka application bootstrap data including current user, projects, boards, and notifications.",
  operations: {
    get: {
      method: "GET",
      path: "/bootstrap",
      description: "Get application bootstrap data",
    },
  },
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get"],
        description: "Action: 'get' - Retrieve bootstrap data",
      },
    },
    required: ["action"],
  },
};
