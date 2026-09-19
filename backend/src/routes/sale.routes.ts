import { Router } from "express";
import { createSale, listSales } from "../controllers/saleController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.post("/", createSale);
router.get("/", listSales);

export default router;
