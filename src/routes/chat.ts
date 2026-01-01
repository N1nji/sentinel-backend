import { Router, Response } from "express";
import Groq from "groq-sdk";
import Chat from "../models/Chat";
import Epi from "../models/Epi";
import Setor from "../models/Setor";
import Risco from "../models/Risco";
import Colaborador from "../models/Colaborador";
import { auth, AuthRequest } from "../middleware/auth";
import PDFDocument from "pdfkit";

const router = Router();
const ia = new Groq({ apiKey: process.env.GROQ_API_KEY! });

/**
 * Helper para resumir dados sem estourar tokens
 */
function resumo(list: any[], limit = 20, fields: string[] = ["nome"]) {
  return list
    .slice(0, limit)
    .map((item) =>
      fields
        .map((f) => item[f])
        .filter(Boolean)
        .join(" | ")
    )
    .join("\n");
}

// ======================================================
// CRIAR CHAT
// ======================================================
router.post("/novo", auth, async (req: AuthRequest, res) => {
  try {
    const chat = await Chat.create({
      userId: req.userId,
      titulo: req.body.titulo || "Novo chat",
      mensagens: [],
    });

    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar chat" });
  }
});

// ======================================================
// LISTAR CHATS
// ======================================================
router.get("/", auth, async (req: AuthRequest, res) => {
  try {
    const chats = await Chat.find({
      userId: req.userId,
      archived: { $ne: true },
    }).sort({ updatedAt: -1 });

    res.json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar chats" });
  }
});

// ======================================================
// BUSCAR CHAT
// ======================================================
router.get("/:id", auth, async (req: AuthRequest, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar chat" });
  }
});

// ======================================================
// RENOMEAR CHAT
// ======================================================
router.put("/:id/rename", auth, async (req: AuthRequest, res) => {
  try {
    const { titulo } = req.body;

    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { titulo, tituloEditado: true } },
      { new: true }
    );

    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao renomear chat" });
  }
});

// ======================================================
// EXPORTAR CHAT EM PDF
// ======================================================
router.get("/:id/export", auth, async (req: AuthRequest, res: Response) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="chat-${chat._id}.pdf"`
    );

    doc.pipe(res);

    doc.fontSize(18).text(chat.titulo, { align: "center" });
    doc.moveDown();

    chat.mensagens.forEach((m: any) => {
      doc
        .fontSize(10)
        .fillColor(m.role === "user" ? "blue" : "black")
        .text(
          `${m.role.toUpperCase()} - ${new Date(m.timestamp).toLocaleString()}`
        );

      doc.moveDown(0.2);
      doc.fontSize(12).fillColor("black").text(m.content);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao exportar PDF" });
  }
});

// ======================================================
// ENVIAR MENSAGEM + IA COM CONTEXTO
// ======================================================
router.post("/:id/mensagem", auth, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Mensagem vazia" });

    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

    // Salva mensagem do usuário
    chat.mensagens.push({ role: "user", content });

    // 🔥 BUSCAR CONTEXTO REAL COM POPULATE
    const [epis, riscos, setores, colabs] = await Promise.all([
      Epi.find().limit(100).lean(),
      Risco.find().populate("setorId", "nome").limit(100).lean(),
      Setor.find().limit(100).lean(),
      Colaborador.find().populate("setorId", "nome").limit(200).lean(),
    ]);

    // 🔥 SYSTEM PROMPT FINAL (NR-6, NR-9, NR-38)
    const systemPrompt = `
Você é o assistente oficial do sistema **Sentinel — Gestão de Riscos & EPIs**,
desenvolvido por **Felipe (N1nji)**.

Especialização obrigatória:
- NR-6 (EPIs)
- NR-9 (Riscos Ambientais)
- NR-38 (Limpeza Urbana)

REGRAS:
- Priorize o contexto real abaixo
- Para normas regulamentadoras (NRs), utilize também conhecimento técnico oficial
- Se algo não existir, diga claramente
- Nunca invente dados sobre colaboradores, setores ou EPIs que não estejam no contexto

====================
EPIs EM ESTOQUE (DADOS REAIS):
${epis.map(e => `- ITEM/EPI: ${e.nome} | QUANTIDADE_EM_ESTOQUE: ${e.estoque} unidades | CA: ${e.ca || "N/A"}`).join("\n")}

REGRAS DE OURO:
1. "QUANTIDADE_EM_ESTOQUE" é o que temos no armazém.
2. "CA" (CERTIFICADO DE APROVAÇÃO) é apenas o número do registro, NUNCA use o CA (CERTIFICADO DE APROVAÇÃO) como se fosse a quantidade.
3. Se o usuário perguntar "quanto tem", olhe apenas para o campo QUANTIDADE_EM_ESTOQUE.

Riscos:
${riscos
  .map(
    (r: any) =>
      `${r.nome} [${r.classificacao}] - setor:${r.setorId?.nome || "N/A"}`
  )
  .slice(0, 20)
  .join("\n")}

Setores:
${resumo(setores, 50, ["nome"])}

Colaboradores:
${colabs
  .map(
    (c: any) =>
      `${c.nome} (${c.matricula}) - setor:${c.setorId?.nome || "N/A"}`
  )
  .slice(0, 50)
  .join("\n")}
====================
`.trim();

    // Monta histórico
    const msgs: any[] = [{ role: "system", content: systemPrompt }];
    chat.mensagens.forEach((m: any) =>
      msgs.push({ role: m.role, content: m.content })
    );
    msgs.push({ role: "user", content });

    // Chamada IA
    const respostaIA = await ia.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: msgs,
      temperature: 0.3,
    });

    // ✅ MANTENDO PADRÃO ANTIGO (SEM NULL)
    const resposta =
      respostaIA.choices?.[0]?.message?.content || "Sem resposta.";

    // Salva resposta
    chat.mensagens.push({ role: "assistant", content: resposta });

    // ✅ AUTO-RENAME (IGUAL AO ANTIGO, SÓ MAIS SEGURO)
    if (!chat.tituloEditado && chat.titulo === "Novo chat") {
      const primeiraLinha = resposta.split("\n")[0] || "";
      const palavras = primeiraLinha.split(/\s+/).slice(0, 4);
      const titulo = palavras.join(" ").trim();

      chat.titulo = titulo.length > 0 ? titulo : "Novo chat IA";
    }

    await chat.save();
    res.json({ resposta, chat });
  } catch (err) {
    console.error("Erro chat IA:", err);
    res.status(500).json({ error: "Erro ao processar mensagem" });
  }
});

// ======================================================
// DELETAR CHAT
// ======================================================
router.delete("/:id", auth, async (req: AuthRequest, res) => {
  try {
    await Chat.deleteOne({ _id: req.params.id, userId: req.userId });
    res.json({ msg: "Chat removido" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar chat" });
  }
});

export default router;
