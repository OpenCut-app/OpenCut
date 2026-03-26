import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import WebSocket from "ws";

const WS_BRIDGE_URL = "ws://localhost:3001/ws?role=mcp";

// --- WebSocket Bridge Client ---

let ws: WebSocket | null = null;
const pendingRequests = new Map<string, { resolve: (data: unknown) => void; reject: (err: Error) => void }>();
let requestCounter = 0;

function connectWs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws?.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    ws = new WebSocket(WS_BRIDGE_URL);

    ws.on("open", () => {
      console.error("[mcp] connected to ws-bridge");
      resolve();
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const pending = pendingRequests.get(msg.id);
        if (pending) {
          pendingRequests.delete(msg.id);
          if (msg.ok) {
            pending.resolve(msg.data ?? null);
          } else {
            pending.reject(new Error(msg.error ?? "Unknown error"));
          }
        }
      } catch (e) {
        console.error("[mcp] failed to parse ws message:", e);
      }
    });

    ws.on("close", () => {
      console.error("[mcp] ws-bridge disconnected");
      ws = null;
      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        pending.reject(new Error("WebSocket disconnected"));
        pendingRequests.delete(id);
      }
    });

    ws.on("error", (err) => {
      console.error("[mcp] ws error:", err.message);
      reject(err);
    });
  });
}

async function sendCommand(type: string, params?: Record<string, unknown>): Promise<unknown> {
  await connectWs();
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to ws-bridge. Is OpenCut running?");
  }

  const id = `mcp-${++requestCounter}`;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error("Command timed out (10s)"));
    }, 10000);

    pendingRequests.set(id, {
      resolve: (data) => {
        clearTimeout(timeout);
        resolve(data);
      },
      reject: (err) => {
        clearTimeout(timeout);
        reject(err);
      },
    });

    ws!.send(JSON.stringify({ id, type, params }));
  });
}

// --- MCP Server ---

const server = new McpServer({
  name: "opencut",
  version: "0.1.0",
});

server.tool(
  "get_timeline",
  "Get the current timeline state including tracks, elements, playback position",
  {},
  async () => {
    const data = await sendCommand("get_timeline");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "split",
  "Split all clips at the specified time (seconds)",
  { time: z.number().describe("Time in seconds where to split") },
  async ({ time }) => {
    const data = await sendCommand("split", { time });
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
);

server.tool(
  "remove_range",
  "Remove all content between start and end time (seconds). Splits at boundaries then deletes elements in range.",
  {
    start: z.number().describe("Start time in seconds"),
    end: z.number().describe("End time in seconds"),
  },
  async ({ start, end }) => {
    const data = await sendCommand("remove_range", { start, end });
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
);

server.tool(
  "trim",
  "Adjust the trim (in/out points) of a specific element",
  {
    elementId: z.string().describe("ID of the element to trim"),
    trimStart: z.number().optional().describe("New trim start offset in seconds"),
    trimEnd: z.number().optional().describe("New trim end offset in seconds"),
    startTime: z.number().optional().describe("New start time on the timeline"),
    duration: z.number().optional().describe("New visible duration"),
  },
  async ({ elementId, trimStart, trimEnd, startTime, duration }) => {
    const data = await sendCommand("trim", { elementId, trimStart, trimEnd, startTime, duration });
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
);

server.tool(
  "undo",
  "Undo the last editing operation",
  {},
  async () => {
    const data = await sendCommand("undo");
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
);

server.tool(
  "redo",
  "Redo the last undone operation",
  {},
  async () => {
    const data = await sendCommand("redo");
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
);

server.tool(
  "seek",
  "Seek the playhead to a specific time",
  { time: z.number().describe("Time in seconds to seek to") },
  async ({ time }) => {
    const data = await sendCommand("seek", { time });
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
);

server.tool(
  "play",
  "Start playback",
  {},
  async () => {
    const data = await sendCommand("play");
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
);

server.tool(
  "pause",
  "Pause playback",
  {},
  async () => {
    const data = await sendCommand("pause");
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[mcp] OpenCut MCP server started");
}

main().catch((err) => {
  console.error("[mcp] Fatal error:", err);
  process.exit(1);
});
