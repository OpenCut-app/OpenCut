// Tool definitions for Gemini function calling
// These define the schema of tools available to the AI agent

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
}

export const toolDefinitions: ToolDefinition[] = [
  // Timeline Tools
  {
    name: "add_text_element",
    description:
      "Add a new text element to the timeline. Creates a text overlay that appears on the video.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The text content to display",
        },
        startTime: {
          type: "number",
          description:
            "Start time in seconds where the text should appear (default: current playhead position)",
        },
        duration: {
          type: "number",
          description:
            "Duration in seconds for how long the text should be visible (default: 5 seconds)",
        },
        fontSize: {
          type: "number",
          description: "Font size in pixels (default: 48)",
        },
        color: {
          type: "string",
          description: "Text color as hex string (default: #ffffff)",
        },
        fontWeight: {
          type: "string",
          description: "Font weight",
          enum: ["normal", "bold"],
        },
        textAlign: {
          type: "string",
          description: "Text alignment",
          enum: ["left", "center", "right"],
        },
        x: {
          type: "number",
          description: "X position relative to canvas center (default: 0)",
        },
        y: {
          type: "number",
          description: "Y position relative to canvas center (default: 0)",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "update_text_element",
    description:
      "Update properties of an existing text element on the timeline",
    parameters: {
      type: "object",
      properties: {
        elementId: {
          type: "string",
          description: "The ID of the text element to update",
        },
        trackId: {
          type: "string",
          description: "The ID of the track containing the element",
        },
        content: {
          type: "string",
          description: "New text content",
        },
        fontSize: {
          type: "number",
          description: "New font size in pixels",
        },
        color: {
          type: "string",
          description: "New text color as hex string",
        },
        fontWeight: {
          type: "string",
          description: "New font weight",
          enum: ["normal", "bold"],
        },
        textAlign: {
          type: "string",
          description: "New text alignment",
          enum: ["left", "center", "right"],
        },
        x: {
          type: "number",
          description: "New X position",
        },
        y: {
          type: "number",
          description: "New Y position",
        },
        opacity: {
          type: "number",
          description: "New opacity (0-1)",
        },
      },
      required: ["elementId", "trackId"],
    },
  },
  {
    name: "update_element_timing",
    description: "Change the start time or duration of a timeline element",
    parameters: {
      type: "object",
      properties: {
        trackId: {
          type: "string",
          description: "The ID of the track containing the element",
        },
        elementId: {
          type: "string",
          description: "The ID of the element to update",
        },
        startTime: {
          type: "number",
          description: "New start time in seconds",
        },
        duration: {
          type: "number",
          description: "New duration in seconds",
        },
      },
      required: ["trackId", "elementId"],
    },
  },
  {
    name: "split_element",
    description:
      "Split a timeline element at the current playhead position, creating two separate elements",
    parameters: {
      type: "object",
      properties: {
        trackId: {
          type: "string",
          description:
            "The ID of the track containing the element (optional, uses selected element if not provided)",
        },
        elementId: {
          type: "string",
          description:
            "The ID of the element to split (optional, uses selected element if not provided)",
        },
      },
      required: [],
    },
  },
  {
    name: "delete_element",
    description: "Remove an element from the timeline",
    parameters: {
      type: "object",
      properties: {
        trackId: {
          type: "string",
          description:
            "The ID of the track containing the element (optional, deletes selected elements if not provided)",
        },
        elementId: {
          type: "string",
          description:
            "The ID of the element to delete (optional, deletes selected elements if not provided)",
        },
      },
      required: [],
    },
  },
  {
    name: "duplicate_element",
    description: "Create a copy of an element and place it after the original",
    parameters: {
      type: "object",
      properties: {
        trackId: {
          type: "string",
          description: "The ID of the track containing the element",
        },
        elementId: {
          type: "string",
          description: "The ID of the element to duplicate",
        },
      },
      required: ["trackId", "elementId"],
    },
  },

  // Playback Tools
  {
    name: "play_pause",
    description: "Toggle playback - play if paused, pause if playing",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Specific action to take",
          enum: ["play", "pause", "toggle"],
        },
      },
      required: [],
    },
  },
  {
    name: "seek_to_time",
    description: "Move the playhead to a specific time in the timeline",
    parameters: {
      type: "object",
      properties: {
        time: {
          type: "number",
          description: "Time in seconds to seek to",
        },
      },
      required: ["time"],
    },
  },
  {
    name: "set_playback_speed",
    description: "Adjust the playback speed",
    parameters: {
      type: "object",
      properties: {
        speed: {
          type: "number",
          description: "Playback speed multiplier (0.1 to 2.0)",
        },
      },
      required: ["speed"],
    },
  },

  // State Tools
  {
    name: "get_timeline_state",
    description:
      "Get the current state of the timeline including all tracks and elements. Use this to understand what's on the timeline before making changes.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_selected_elements",
    description:
      "Get information about currently selected elements on the timeline",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "undo",
    description: "Undo the last action",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "redo",
    description: "Redo the last undone action",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// Convert to Gemini function declaration format
export const geminiTools = {
  function_declarations: toolDefinitions.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  })),
};
