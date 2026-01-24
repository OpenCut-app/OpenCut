import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { geminiTools } from "@/lib/ai-chat/tool-definitions";

const messageSchema = z.object({
  role: z.enum(["user", "model", "function"]),
  parts: z.array(
    z.union([
      z.object({ text: z.string() }),
      z.object({
        functionCall: z.object({
          name: z.string(),
          args: z.record(z.unknown()),
        }),
      }),
      z.object({
        functionResponse: z.object({
          name: z.string(),
          response: z.record(z.unknown()),
        }),
      }),
    ])
  ),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema),
  timelineContext: z.string().optional(),
});

const SYSTEM_INSTRUCTION = `You are an AI assistant integrated into a video editor. You help users automate editing tasks through natural language commands.

You have access to tools that control the video editor:
- Timeline tools: add/update/delete text elements, change timing, split, duplicate
- Playback tools: play/pause, seek to time, change speed
- State tools: get timeline state, get selected elements, undo/redo

When the user asks you to do something:
1. First, if needed, use get_timeline_state or get_selected_elements to understand the current state
2. Then execute the appropriate tool(s) to accomplish the task
3. Provide a brief, helpful response about what you did

Keep responses concise. Focus on actions, not explanations.

Examples:
- "Add a title" -> Use add_text_element with appropriate content
- "Move it to 3 seconds" -> Use get_selected_elements first, then update_element_timing
- "Delete that" -> Use delete_element (will delete selected elements)
- "Go to the beginning" -> Use seek_to_time with time: 0

Be proactive: if the user's request is ambiguous but you can make a reasonable assumption, do it and tell them what you did.`;

export const POST = async (request: NextRequest) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key not configured",
          message: "Set GEMINI_API_KEY environment variable to enable AI chat",
        },
        { status: 503 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validationResult = chatRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { messages, timelineContext } = validationResult.data;

    // Build system instruction with optional timeline context
    let systemInstruction = SYSTEM_INSTRUCTION;
    if (timelineContext) {
      systemInstruction += `\n\nCurrent timeline context:\n${timelineContext}`;
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: messages,
          tools: [geminiTools],
          tool_config: {
            function_calling_config: {
              mode: "AUTO",
            },
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      return NextResponse.json(
        { error: "AI service unavailable", details: errorText },
        { status: 502 }
      );
    }

    const responseData = await geminiResponse.json();

    // Extract the candidate response
    const candidate = responseData.candidates?.[0];
    if (!candidate) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    const content = candidate.content;
    const finishReason = candidate.finishReason;

    // Check for function calls
    const functionCalls = content?.parts?.filter(
      (part: { functionCall?: unknown }) => part.functionCall
    );

    if (functionCalls && functionCalls.length > 0) {
      // Return function calls for client-side execution
      return NextResponse.json({
        type: "function_calls",
        functionCalls: functionCalls.map(
          (part: {
            functionCall: { name: string; args: Record<string, unknown> };
          }) => ({
            name: part.functionCall.name,
            args: part.functionCall.args,
          })
        ),
        // Include the model's response if there's also text
        text:
          content?.parts?.find((part: { text?: string }) => part.text)?.text ||
          null,
      });
    }

    // Return text response
    const textPart = content?.parts?.find(
      (part: { text?: string }) => part.text
    );
    return NextResponse.json({
      type: "text",
      text: textPart?.text || "I completed the action.",
      finishReason,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

// Continue conversation after function execution
export const PUT = async (request: NextRequest) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 503 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { messages } = rawBody;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: messages,
          tools: [geminiTools],
          tool_config: {
            function_calling_config: {
              mode: "AUTO",
            },
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 502 }
      );
    }

    const responseData = await geminiResponse.json();
    const candidate = responseData.candidates?.[0];

    if (!candidate) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    const content = candidate.content;

    // Check for more function calls
    const functionCalls = content?.parts?.filter(
      (part: { functionCall?: unknown }) => part.functionCall
    );

    if (functionCalls && functionCalls.length > 0) {
      return NextResponse.json({
        type: "function_calls",
        functionCalls: functionCalls.map(
          (part: {
            functionCall: { name: string; args: Record<string, unknown> };
          }) => ({
            name: part.functionCall.name,
            args: part.functionCall.args,
          })
        ),
        text:
          content?.parts?.find((part: { text?: string }) => part.text)?.text ||
          null,
      });
    }

    // Return final text response
    const textPart = content?.parts?.find(
      (part: { text?: string }) => part.text
    );
    return NextResponse.json({
      type: "text",
      text: textPart?.text || "Done!",
    });
  } catch (error) {
    console.error("AI chat continuation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
