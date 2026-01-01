// backend/src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario";

// Extende o tipo do Express Request para aceitar user e userId
export interface AuthRequest extends Request {
  user?: {
    id: string;
    tipo: string;
    email: string;
  };
  userId?: string;
}

export async function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ erro: "Token ausente" });
  }

  const token = header.replace("Bearer ", "");

  try {
    // 1️⃣ Verifica o token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

    const userId = decoded.id || decoded._id;
    if (!userId) {
      return res.status(401).json({ erro: "Token inválido" });
    }

    // 2️⃣ Busca usuário no banco
    const usuario = await Usuario.findById(userId).select("status tipo email");

    if (!usuario) {
      return res.status(401).json({ erro: "Usuário não encontrado" });
    }

    // 3️⃣ Verifica status (🔥 AQUI ESTÁ A MÁGICA)
    if (usuario.status !== "ativo") {
      return res.status(403).json({
        erro: "Acesso bloqueado. Entre em contato com o administrador.",
      });
    }

    // 4️⃣ Injeta dados no request (mantém compatibilidade)
    req.user = {
      id: usuario._id.toString(),
      tipo: usuario.tipo,
      email: usuario.email,
    };
    req.userId = usuario._id.toString();

    next();
  } catch (err) {
    return res.status(401).json({ erro: "Token inválido" });
  }
}
