import { Router } from "express";
import multer from "multer";
import { transcribeVoice } from "../controllers/voiceController";
import { requireAuth } from "../middleware/auth";

// In-memory storage — clips are a few seconds, no need to touch disk, and
// nothing about the audio itself is persisted after the request completes.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB is generous for a short voice clip
});

const router = Router();

router.use(requireAuth);
router.post("/transcribe", upload.single("audio"), transcribeVoice);

export default router;
