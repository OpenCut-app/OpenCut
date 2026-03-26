/**
 * WebSocket Bridge Server
 *
 * MCPサーバーとOpenCutブラウザ間の通信を仲介する。
 * ポート3001で起動し、2つの接続を管理:
 * - MCPサーバーからのコマンド送信
 * - ブラウザ(OpenCut)からの結果返信
 */

const WS_PORT = 3001;

const server = Bun.serve({
  port: WS_PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocketアップグレード
    if (url.pathname === "/ws") {
      const role = url.searchParams.get("role") ?? "browser";
      const upgraded = server.upgrade(req, { data: { role } });
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined;
    }

    // ヘルスチェック
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", connections: { browser: !!browserSocket, mcp: !!mcpSocket } }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    open(ws) {
      const role = (ws.data as { role: string }).role;
      console.log(`[ws-bridge] ${role} connected`);

      if (role === "browser") {
        browserSocket = ws;
      } else if (role === "mcp") {
        mcpSocket = ws;
      }
    },
    message(ws, message) {
      const role = (ws.data as { role: string }).role;
      const msgStr = typeof message === "string" ? message : new TextDecoder().decode(message);

      if (role === "mcp") {
        // MCPからのコマンド → ブラウザに転送
        if (browserSocket) {
          browserSocket.send(msgStr);
        } else {
          ws.send(JSON.stringify({ error: "Browser not connected" }));
        }
      } else if (role === "browser") {
        // ブラウザからの結果 → MCPに転送
        if (mcpSocket) {
          mcpSocket.send(msgStr);
        }
      }
    },
    close(ws) {
      const role = (ws.data as { role: string }).role;
      console.log(`[ws-bridge] ${role} disconnected`);

      if (role === "browser" && browserSocket === ws) {
        browserSocket = null;
      } else if (role === "mcp" && mcpSocket === ws) {
        mcpSocket = null;
      }
    },
  },
});

let browserSocket: ReturnType<typeof server.upgrade> | null = null;
let mcpSocket: ReturnType<typeof server.upgrade> | null = null;

console.log(`[ws-bridge] listening on ws://localhost:${WS_PORT}/ws`);
