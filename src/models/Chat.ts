import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user","assistant","system"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  titulo: { type: String, default: "Novo chat" },
  tituloEditado: { type: Boolean, default: false }, // se o user editou manualmente
  archived: { type: Boolean, default: false },
  mensagens: [MessageSchema],
}, { timestamps: true });

export default mongoose.model("Chat", ChatSchema);
