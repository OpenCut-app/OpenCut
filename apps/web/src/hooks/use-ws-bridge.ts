"use client";

import { useEffect, useRef } from "react";
import { EditorCore } from "@/core";
import { getElementsAtTime } from "@/lib/timeline";
import type { TimelineTrack, TimelineElement } from "@/types/timeline";

const WS_BRIDGE_URL = "ws://localhost:3001/ws?role=browser";

interface WsCommand {
  id: string;
  type: string;
  params?: Record<string, unknown>;
}

interface WsResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

function serializeTrack(track: TimelineTrack) {
  return {
    id: track.id,
    name: track.name,
    type: track.type,
    elements: track.elements.map((el: TimelineElement) => ({
      id: el.id,
      name: el.name,
      type: el.type,
      startTime: el.startTime,
      duration: el.duration,
      trimStart: el.trimStart,
      trimEnd: el.trimEnd,
      sourceDuration: el.sourceDuration,
    })),
  };
}

function handleCommand(cmd: WsCommand): WsResponse {
  try {
    const editor = EditorCore.getInstance();
    const { type, params } = cmd;

    switch (type) {
      case "get_timeline": {
        const tracks = editor.timeline.getTracks();
        const totalDuration = editor.timeline.getTotalDuration();
        const currentTime = editor.playback.getCurrentTime();
        const isPlaying = editor.playback.getIsPlaying();
        return {
          id: cmd.id,
          ok: true,
          data: {
            tracks: tracks.map(serializeTrack),
            totalDuration,
            currentTime,
            isPlaying,
          },
        };
      }

      case "split": {
        const time = params?.time as number;
        if (time == null) return { id: cmd.id, ok: false, error: "time is required" };

        const tracks = editor.timeline.getTracks();
        const elements = getElementsAtTime({ tracks, time });
        if (elements.length === 0) {
          return { id: cmd.id, ok: false, error: `No elements found at time ${time}` };
        }

        editor.timeline.splitElements({
          elements,
          splitTime: time,
        });

        return { id: cmd.id, ok: true, data: { splitAt: time, elementsAffected: elements.length } };
      }

      case "remove_range": {
        const start = params?.start as number;
        const end = params?.end as number;
        if (start == null || end == null) {
          return { id: cmd.id, ok: false, error: "start and end are required" };
        }

        const tracks = editor.timeline.getTracks();

        // Split at start
        const elementsAtStart = getElementsAtTime({ tracks, time: start });
        if (elementsAtStart.length > 0) {
          editor.timeline.splitElements({ elements: elementsAtStart, splitTime: start });
        }

        // Split at end (re-read tracks after first split)
        const tracksAfterFirstSplit = editor.timeline.getTracks();
        const elementsAtEnd = getElementsAtTime({ tracks: tracksAfterFirstSplit, time: end });
        if (elementsAtEnd.length > 0) {
          editor.timeline.splitElements({ elements: elementsAtEnd, splitTime: end });
        }

        // Delete elements within the range
        const tracksAfterSplits = editor.timeline.getTracks();
        const elementsInRange: { trackId: string; elementId: string }[] = [];
        for (const track of tracksAfterSplits) {
          for (const el of track.elements) {
            const elStart = el.startTime;
            const elEnd = el.startTime + el.duration;
            // Element is fully within the range
            if (elStart >= start && elEnd <= end) {
              elementsInRange.push({ trackId: track.id, elementId: el.id });
            }
          }
        }

        if (elementsInRange.length > 0) {
          editor.timeline.deleteElements({
            elements: elementsInRange,
            rippleEnabled: true,
          });
        }

        return {
          id: cmd.id,
          ok: true,
          data: { removedRange: { start, end }, elementsDeleted: elementsInRange.length },
        };
      }

      case "trim": {
        const elementId = params?.elementId as string;
        if (!elementId) return { id: cmd.id, ok: false, error: "elementId is required" };

        editor.timeline.updateElementTrim({
          elementId,
          trimStart: params?.trimStart as number | undefined,
          trimEnd: params?.trimEnd as number | undefined,
          startTime: params?.startTime as number | undefined,
          duration: params?.duration as number | undefined,
          pushHistory: true,
        });

        return { id: cmd.id, ok: true, data: { elementId } };
      }

      case "undo": {
        if (!editor.command.canUndo()) {
          return { id: cmd.id, ok: false, error: "Nothing to undo" };
        }
        editor.command.undo();
        return { id: cmd.id, ok: true };
      }

      case "redo": {
        if (!editor.command.canRedo()) {
          return { id: cmd.id, ok: false, error: "Nothing to redo" };
        }
        editor.command.redo();
        return { id: cmd.id, ok: true };
      }

      case "seek": {
        const time = params?.time as number;
        if (time == null) return { id: cmd.id, ok: false, error: "time is required" };
        editor.playback.seek({ time });
        return { id: cmd.id, ok: true, data: { seekedTo: time } };
      }

      case "play": {
        if (!editor.playback.getIsPlaying()) {
          editor.playback.toggle();
        }
        return { id: cmd.id, ok: true };
      }

      case "pause": {
        if (editor.playback.getIsPlaying()) {
          editor.playback.toggle();
        }
        return { id: cmd.id, ok: true };
      }

      default:
        return { id: cmd.id, ok: false, error: `Unknown command: ${type}` };
    }
  } catch (e) {
    return { id: cmd.id, ok: false, error: String(e) };
  }
}

export function useWsBridge() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_BRIDGE_URL);

      ws.onopen = () => {
        console.log("[ws-bridge] connected to bridge server");
      };

      ws.onmessage = (event) => {
        try {
          const cmd = JSON.parse(event.data) as WsCommand;
          const response = handleCommand(cmd);
          ws.send(JSON.stringify(response));
        } catch (e) {
          console.error("[ws-bridge] failed to handle message:", e);
        }
      };

      ws.onclose = () => {
        console.log("[ws-bridge] disconnected, reconnecting in 3s...");
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);
}
