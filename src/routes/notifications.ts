// backend/src/routes/notification.routes.ts
import { Router, Response } from "express";
import { auth, AuthRequest } from "../middleware/auth";
import Notification from "../models/Notifications";

const router = Router();

// Buscar notificações do usuário logado
router.get("/notifications", auth, async (req: AuthRequest, res: Response) => {
  try {
    // Usando o req.userId que seu middleware já extrai do token
    const notificacoes = await Notification.find({ usuario_id: req.userId })
      .sort({ dataCriacao: -1 }) // Mais recentes primeiro
      .limit(20);

    return res.json(notificacoes);
  } catch (err) {
    return res.status(500).json({ erro: "Erro ao buscar notificações" });
  }
});

// Marcar como lida
router.put("/notifications/:id/read", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Além do ID, garantimos que a notificação pertence ao usuário logado (Segurança!)
    await Notification.findOneAndUpdate(
      { _id: id, usuario_id: req.userId }, 
      { lida: true }
    );
    
    return res.sendStatus(200);
  } catch (err) {
    return res.status(500).json({ erro: "Erro ao atualizar notificação" });
  }
});

export default router;