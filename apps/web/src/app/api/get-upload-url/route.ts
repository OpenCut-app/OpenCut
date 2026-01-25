import { NextResponse } from "next/server";

export const POST = async () => {
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message:
        "Audio upload is no longer required. Send audio directly to /api/transcribe as multipart/form-data.",
    },
    { status: 410 },
  );
};
