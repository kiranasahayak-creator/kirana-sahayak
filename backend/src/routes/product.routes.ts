import { Router } from "express";
import { listProducts, searchProducts } from "../controllers/productController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.get("/", listProducts);
router.get("/search", searchProducts);

export default router;
