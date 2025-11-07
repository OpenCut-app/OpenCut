import { NextRequest, NextResponse } from "next/server";
import { baseRateLimit } from "@/lib/rate-limit";
import { db, exportWaitlist, eq } from "@opencut/db";
import { randomUUID } from "crypto";
import {
  exportWaitlistSchema,
  exportWaitlistResponseSchema,
} from "@/lib/schemas/waitlist";

const requestSchema = exportWaitlistSchema;
const responseSchema = exportWaitlistResponseSchema;

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await baseRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const existing = await db
      .select({ id: exportWaitlist.id })
      .from(exportWaitlist)
      .where(eq(exportWaitlist.email, email))
      .limit(1);

    if (existing.length > 0) {
      const responseData = { success: true, alreadySubscribed: true } as const;
      const validated = responseSchema.safeParse(responseData);
      if (!validated.success) {
        return NextResponse.json(
          { error: "Internal response formatting error" },
          { status: 500 }
        );
      }
      return NextResponse.json(validated.data);
    }

    await db.insert(exportWaitlist).values({
      id: randomUUID(),
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const responseData = { success: true } as const;
    const validated = responseSchema.safeParse(responseData);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Internal response formatting error" },
        { status: 500 }
      );
    }
    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
