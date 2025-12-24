// backend/src/models/Notification.ts
import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  usuario_id: mongoose.Types.ObjectId;
  titulo: string;
  mensagem: string;
  tipo: "estoque" | "entrega" | "vencimento";
  lida: boolean;
  dataCriacao: Date;
}

const NotificationSchema: Schema = new Schema({
  usuario_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  titulo: { type: String, required: true },
  mensagem: { type: String, required: true },
  tipo: { type: String, enum: ["estoque", "entrega", "vencimento"], default: "entrega" },
  lida: { type: Boolean, default: false },
  dataCriacao: { type: Date, default: Date.now },
});

export default mongoose.model<INotification>("Notification", NotificationSchema);