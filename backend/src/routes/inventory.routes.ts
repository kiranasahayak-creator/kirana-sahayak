import { Router } from "express";
import { adjustInventory, getInventory } from "../controllers/inventoryController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.get("/", getInventory);
router.post("/adjust", adjustInventory);

export default router;
