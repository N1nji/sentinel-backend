// backend/src/models/SecurityLog.ts
import mongoose from "mongoose";

const SecurityLogSchema = new mongoose.Schema(
  {
    // Usuário relacionado (quando existir)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: false,
    },

    // Email (útil para login falho)
    email: {
      type: String,
      required: false,
    },

    // Tipo de ação registrada
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "LOGOUT",
        "USER_BLOCKED",
        "USER_UNBLOCKED",
        "TOKEN_INVALID",
        "ACCESS_DENIED",
      ],
    },

    // IP de origem
    ip: {
      type: String,
      required: true,
    },

    // Navegador / SO
    userAgent: {
      type: String,
      required: true,
    },

    // Info extra (opcional, flexível)
    details: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt automáticos
  }
);

//  Índices para performance (importante)
SecurityLogSchema.index({ createdAt: -1 });
SecurityLogSchema.index({ action: 1 });
SecurityLogSchema.index({ userId: 1 });

export default mongoose.model("SecurityLog", SecurityLogSchema);
