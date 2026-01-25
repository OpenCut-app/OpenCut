import { env } from "@/env";

export interface TranscriptionConfigCheck {
  configured: boolean;
  missingVars: string[];
}

export const isTranscriptionConfigured = (): TranscriptionConfigCheck => {
  const missingVars: string[] = [];

  if (!env.GEMINI_API_KEY) missingVars.push("GEMINI_API_KEY");

  return { configured: missingVars.length === 0, missingVars };
};
