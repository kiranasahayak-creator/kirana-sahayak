import FormData from "form-data";
import fetch from "node-fetch";
import { env, isSarvamConfigured } from "../config/env";

export class SarvamUnavailableError extends Error {}

interface SarvamTranscribeResponse {
  transcript?: string;
  language_code?: string;
  [key: string]: unknown;
}

/**
 * Sends a short audio clip to Sarvam's Speech-to-Text endpoint and returns
 * the transcript.
 *
 * Endpoint / auth per Sarvam's current docs (docs.sarvam.ai):
 *   POST https://api.sarvam.ai/speech-to-text
 *   header: api-subscription-key: <SARVAM_API_KEY>   (NOT "Authorization: Bearer")
 *   multipart/form-data, field "file"
 *   model default: saaras:v3 (mode="transcribe" or mode="codemix")
 *   real-time REST endpoint caps audio at 30 seconds — fine for cart-add utterances.
 *
 * Key stays server-side only: this function is only ever called from
 * voiceController, never exposed as a pass-through endpoint.
 */
export async function transcribeAudio(params: {
  audioBuffer: Buffer;
  filename: string;
  mimeType: string;
  languageCode?: string; // e.g. "hi-IN", "en-IN"; omit/"unknown" for auto-detect
}): Promise<{ transcript: string; languageCode?: string }> {
  if (!isSarvamConfigured()) {
    throw new SarvamUnavailableError("SARVAM_API_KEY is not configured on the backend");
  }

  const form = new FormData();
  form.append("file", params.audioBuffer, {
    filename: params.filename,
    contentType: params.mimeType,
  });
  form.append("model", env.SARVAM_STT_MODEL);
  form.append("mode", env.SARVAM_STT_MODE);
  form.append("language_code", params.languageCode || "unknown");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s hard timeout

  try {
    const response = await fetch(`${env.SARVAM_API_BASE_URL}/speech-to-text`, {
      method: "POST",
      headers: {
        "api-subscription-key": env.SARVAM_API_KEY,
        ...form.getHeaders(),
      },
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SarvamUnavailableError(
        `Sarvam STT returned ${response.status}: ${body.slice(0, 300)}`
      );
    }

    const data = (await response.json()) as SarvamTranscribeResponse;
    return {
      transcript: data.transcript || "",
      languageCode: data.language_code,
    };
  } catch (err) {
    if (err instanceof SarvamUnavailableError) throw err;
    throw new SarvamUnavailableError(
      `Sarvam STT request failed: ${(err as Error).message}`
    );
  } finally {
    clearTimeout(timeout);
  }
}
