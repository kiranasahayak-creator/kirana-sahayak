import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import inventoryRoutes from "./routes/inventory.routes";
import productRoutes from "./routes/product.routes";
import recommendationRoutes from "./routes/recommendation.routes";
import saleRoutes from "./routes/sale.routes";
import storeRoutes from "./routes/store.routes";
import voiceRoutes from "./routes/voice.routes";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/store", storeRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `No route: ${req.method} ${req.path}` });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Kirana Sahayak backend listening on http://localhost:${env.PORT}`);
});
