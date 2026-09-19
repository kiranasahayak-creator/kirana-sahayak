import { Router } from "express";
import { getStoreProfile } from "../controllers/storeController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.get("/profile", getStoreProfile);

export default router;
