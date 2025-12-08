import { env } from "@/env";

/**
 * Checks whether all required transcription-related environment variables are present.
 *
 * Checks for CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
 * and MODAL_TRANSCRIPTION_URL and reports which (if any) are missing.
 *
 * @returns An object with `configured` set to `true` if all required environment variables are present, `false` otherwise, and `missingVars` containing the names of any missing variables.
 */
export function isTranscriptionConfigured() {
  const missingVars = [];

  if (!env.CLOUDFLARE_ACCOUNT_ID) missingVars.push("CLOUDFLARE_ACCOUNT_ID");
  if (!env.R2_ACCESS_KEY_ID) missingVars.push("R2_ACCESS_KEY_ID");
  if (!env.R2_SECRET_ACCESS_KEY) missingVars.push("R2_SECRET_ACCESS_KEY");
  if (!env.R2_BUCKET_NAME) missingVars.push("R2_BUCKET_NAME");
  if (!env.MODAL_TRANSCRIPTION_URL) missingVars.push("MODAL_TRANSCRIPTION_URL");

  return { configured: missingVars.length === 0, missingVars };
}