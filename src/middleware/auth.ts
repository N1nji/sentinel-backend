// backend/src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario";
import Log from "../models/Log";

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
    // 1️⃣ Verifica JWT
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

    const userId = decoded.id || decoded._id;
    if (!userId) {
      return res.status(401).json({ erro: "Token inválido" });
    }

    // 2️⃣ Busca usuário + tokenVersion
    const usuario = await Usuario.findById(userId).select(
      "status tipo email tokenVersion"
    );

    if (!usuario) {
      return res.status(401).json({ erro: "Usuário não encontrado" });
    }

    // 3️⃣ Verifica tokenVersion (🔥 logout remoto REAL)
    if (decoded.tokenVersion !== usuario.tokenVersion) {
      return res.status(401).json({ erro: "Sessão encerrada" });
    }

    // 4️⃣ Verifica status
    if (usuario.status !== "ativo") {
      await Log.create({
        usuarioId: usuario._id,
        acao: "ACCESS_DENIED",
        detalhes: "Tentativa de acesso com conta inativa",
        ip: req.ip,
      });

      return res.status(403).json({
        erro: "Acesso bloqueado. Entre em contato com o administrador.",
      });
    }

    // 5️⃣ Injeta dados no request
    req.user = {
      id: usuario._id.toString(),
      tipo: usuario.tipo,
      email: usuario.email,
    };
    req.userId = usuario._id.toString();

    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido" });
  }
}
