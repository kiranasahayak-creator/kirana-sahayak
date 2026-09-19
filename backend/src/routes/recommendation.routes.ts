import { Router } from "express";
import { getWeeklyRecommendations } from "../controllers/recommendationController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.get("/weekly", getWeeklyRecommendations);

export default router;
