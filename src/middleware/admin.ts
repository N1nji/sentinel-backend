import type { Request, Response, NextFunction } from "express";

export function onlyAdmin(req: Request, res: Response, next: NextFunction) {
  // @ts-ignore
  if (req.user?.tipo !== "admin") {
    return res.status(403).json({ erro: "Acesso permitido somente para administradores." });
  }

  next();
}
