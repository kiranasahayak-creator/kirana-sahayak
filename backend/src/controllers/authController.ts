import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";

const loginSchema = z.object({
  storeCode: z.string().min(1),
  password: z.string().min(1),
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "storeCode and password are required" });
  }
  const { storeCode, password } = parsed.data;

  const store = await prisma.store.findUnique({
    where: { storeCode: storeCode.trim().toUpperCase() },
  });

  // Same generic error for "no such store" and "wrong password" — don't
  // leak which one it was.
  if (!store) {
    return res.status(401).json({ error: "Invalid store ID or password" });
  }

  const valid = await bcrypt.compare(password, store.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid store ID or password" });
  }

  const token = jwt.sign(
    { storeId: store.id, storeCode: store.storeCode },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  res.json({
    token,
    store: { storeCode: store.storeCode, storeName: store.storeName },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const store = await prisma.store.findUnique({
    where: { id: req.storeId! },
    select: { storeCode: true, storeName: true, location: true, createdAt: true },
  });
  if (!store) return res.status(404).json({ error: "Store not found" });
  res.json(store);
});
