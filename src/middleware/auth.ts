// backend/src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extende o tipo do Express Request para aceitar user e userId
export interface AuthRequest extends Request {
  user?: any;
  userId?: string;
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ erro: "Token ausente" });

  const token = header.replace("Bearer ", "");

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

    req.user = decoded;
    req.userId = decoded.id || decoded._id;

    next();
  } catch (err) {
    console.error("Erro no token:", err);
    return res.status(401).json({ erro: "Token inválido" });
  }
}
