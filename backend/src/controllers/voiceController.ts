import { Request, Response } from "express";
import { matchProduct } from "../services/productMatcher";
import { SarvamUnavailableError, transcribeAudio } from "../services/sarvamClient";
import { parseTranscript } from "../services/voiceParser";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * POST /api/voice/transcribe
 * multipart/form-data, field "audio", optional field "languageCode"
 *   -> transcribes via Sarvam, then parses + matches.
 * OR JSON/form field "transcript" (no audio file)
 *   -> skips Sarvam entirely and runs the same parse + match pipeline.
 *      This is what the frontend's native-speech-recognition fallback uses
 *      when Sarvam is unavailable, so ambiguity handling and store-scoped
 *      matching stay identical regardless of which STT produced the text.
 *
 * Never records a sale. Only returns structured candidates for the frontend
 * to add to the cart (confident) or ask the shopkeeper about (ambiguous).
 */
export const transcribeVoice = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  const providedTranscript =
    typeof req.body.transcript === "string" ? req.body.transcript : undefined;

  let transcript: string;

  if (providedTranscript !== undefined) {
    transcript = providedTranscript;
  } else if (file) {
    try {
      const result = await transcribeAudio({
        audioBuffer: file.buffer,
        filename: file.originalname || "audio.webm",
        mimeType: file.mimetype || "audio/webm",
        languageCode:
          typeof req.body.languageCode === "string" ? req.body.languageCode : undefined,
      });
      transcript = result.transcript;
    } catch (err) {
      if (err instanceof SarvamUnavailableError) {
        // Distinct status + flag so the frontend knows to fall back to native
        // speech recognition / manual search rather than showing a generic error.
        return res.status(503).json({
          error: "Speech recognition is temporarily unavailable",
          fallback: true,
          detail: err.message,
        });
      }
      throw err;
    }
  } else {
    return res.status(400).json({
      error: "No audio file uploaded (field 'audio') and no 'transcript' provided",
    });
  }

  if (!transcript.trim()) {
    return res.json({ transcript: "", items: [] });
  }

  const segments = parseTranscript(transcript);

  const items = await Promise.all(
    segments.map(async (seg) => {
      const match = await matchProduct(req.storeId!, seg.rawText);
      return {
        rawText: seg.rawText,
        quantity: seg.quantity,
        status: match.status,
        matches: match.matches,
      };
    })
  );

  res.json({ transcript, items });
});
