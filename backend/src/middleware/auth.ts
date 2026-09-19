import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthTokenPayload {
  storeId: string;
  storeCode: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      storeId?: string;
      storeCode?: string;
    }
  }
}

/**
 * Verifies the JWT and attaches storeId/storeCode to the request.
 *
 * This is the ONLY place store identity is ever established. Controllers
 * must read `req.storeId` — never a storeId from req.body/req.query/req.params.
 * That is what makes cross-store data access structurally impossible rather
 * than something each controller has to remember to check.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    req.storeId = payload.storeId;
    req.storeCode = payload.storeCode;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
