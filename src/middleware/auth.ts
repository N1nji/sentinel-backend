// backend/src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extende o tipo do Express Request para aceitar user e userId
// backend/src/middleware/auth.ts
export interface AuthRequest extends Request {
  user?: {
    id: string;
    tipo: string; // Adicionamos o tipo aqui
    email: string;
  };
  userId?: string;
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ erro: "Token ausente" });

  const token = header.replace("Bearer ", "");

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

    // O objeto 'decoded' deve conter o que você enviou no login (id, tipo, etc)
    req.user = decoded; 
    req.userId = decoded.id || decoded._id;

    next();
  } catch (err) {
    return res.status(401).json({ erro: "Token inválido" });
  }
}