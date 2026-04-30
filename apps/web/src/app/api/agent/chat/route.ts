import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { AgentContext } from "@/agent/types";
import { buildSystemPrompt } from "@/agent/system-prompt";
import { createProvider } from "@/agent/providers";
import type { ProviderConfig } from "@/agent/providers";
import { providerToolSchemas } from "@/agent/tools/schemas";

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------
const toolCallSchema = z.object({
	id: z.string(),
	name: z.string(),
	args: z.record(z.string(), z.unknown()),
	thoughtSignature: z.string().optional(),
});

const chatRequestSchema = z.object({
	messages: z.array(
		z.object({
			id: z.string(),
			role: z.enum(["user", "assistant", "tool_result"]),
			content: z.string(),
			toolCalls: z.array(toolCallSchema).optional(),
			toolCallId: z.string().optional(),
			timestamp: z.number(),
		}),
	),
	context: z.object({
		projectId: z.string().nullable(),
		activeSceneId: z.string().nullable(),
		mediaAssets: z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				type: z.string(),
				duration: z.number(),
				usedInTimeline: z.boolean().optional(),
			}),
		),
		timelineTracks: z
			.array(
				z.object({
					trackId: z.string(),
					type: z.enum(["main", "overlay", "audio", "text", "effect"]),
					position: z.number(),
					visualLayer: z.number().nullable(),
					isVisualLayer: z.boolean(),
					stacking: z.enum(["top", "above_main", "main", "audio"]),
					elements: z.array(
						z.object({
							elementId: z.string(),
							type: z.string(),
							assetId: z.string().optional(),
							name: z.string().optional(),
							content: z.string().optional(),
							start: z.number(),
							end: z.number(),
						}),
					),
				}),
			)
			.optional(),
		playbackTimeMs: z.number(),
		mode: z.enum(["plan", "execute"]).optional(),
	}) satisfies z.ZodType<AgentContext>,
});

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
	const body = await request.json();
	const result = chatRequestSchema.safeParse(body);

	if (!result.success) {
		const fieldErrors = result.error.flatten().fieldErrors;
		if (process.env.NODE_ENV === "development") {
			console.error(
				"[agent/chat] Validation failed:",
				JSON.stringify({ fieldErrors }, null, 2),
			);
		}
		return NextResponse.json(
			{ error: "Invalid input", details: fieldErrors },
			{ status: 400 },
		);
	}

	const { messages, context } = result.data;

	const mode = context.mode;

	const provider = process.env.LLM_PROVIDER;
	const apiKey = process.env.LLM_API_KEY;
	const model = process.env.LLM_MODEL;
	const baseUrl = process.env.LLM_BASE_URL;

	if (!provider || !apiKey || !model) {
		return NextResponse.json(
			{
				error:
					"Server configuration error: missing LLM_PROVIDER, LLM_API_KEY, or LLM_MODEL",
			},
			{ status: 502 },
		);
	}

	const config: ProviderConfig = { provider, apiKey, model, baseUrl };

	const systemPrompt = buildSystemPrompt(context, providerToolSchemas, mode);

	// Delegate to provider adapter
	try {
		const adapter = createProvider(config);
		const response = await adapter.chat({
			messages,
			systemPrompt,
			tools: providerToolSchemas,
		});

		return NextResponse.json({
			content: response.content,
			...(response.toolCalls && { toolCalls: response.toolCalls }),
		});
	} catch (error) {
		const status = (error as { status?: number }).status;
		const message =
			error instanceof Error ? error.message : "Unknown provider error";
		const providerError = toProviderErrorResponse({ message, status });
		console.error("[agent/chat] Provider error:", error);
		return NextResponse.json(
			{
				error: providerError.error,
				...(status ? { providerStatus: status } : {}),
				...(process.env.NODE_ENV === "development" ? { detail: message } : {}),
			},
			{ status: providerError.status },
		);
	}
}

function toProviderErrorResponse({
	message,
	status,
}: {
	message: string;
	status?: number;
}): { error: string; status: number } {
	if (status === 429 && isBillingOrQuotaExhaustedMessage(message)) {
		return {
			status: 402,
			error:
				"Gemini credits are depleted. Add credits in AI Studio or switch LLM_PROVIDER/LLM_MODEL in .env.local.",
		};
	}

	return { status: 502, error: "LLM provider error" };
}

function isBillingOrQuotaExhaustedMessage(message: string): boolean {
	return /prepayment credits are depleted|billing|quota.*(?:depleted|exhausted)/i.test(
		message,
	);
}
