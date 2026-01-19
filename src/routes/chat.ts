import { Router, Response } from "express";
import Groq from "groq-sdk";
import Chat from "../models/Chat";
import Epi from "../models/Epi";
import Setor from "../models/Setor";
import Risco from "../models/Risco";
import Colaborador from "../models/Colaborador";
import EntregaEpi from "../models/EntregaEpi";
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
// EXPORTAR CHAT EM PDF (VERSÃO PREMIUM SENTINEL)
// ======================================================
router.get("/:id/export", auth, async (req: AuthRequest, res: Response) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

    // Inicia o documento A4 com margens profissionais
    const doc = new PDFDocument({ 
      size: "A4", 
      margin: 50,
      bufferPages: true 
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Relatorio_Sentinel_${chat._id}.pdf"`
    );

    doc.pipe(res);

    // --- CABEÇALHO (BRANDING) ---
    doc
      .fillColor("#6366f1") // Indigo Sentinel
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("SENTINEL IA", { continued: true })
      .fillColor("#94a3b8")
      .fontSize(10)
      .font("Helvetica")
      .text("  |  SISTEMA DE GESTÃO SST", { align: "right" });

    doc.moveDown(0.5);
    
    // Linha horizontal decorativa
    doc
      .strokeColor("#e2e8f0")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    
    doc.moveDown(1.5);

    // --- TÍTULO E METADADOS ---
    doc
      .fillColor("#1e293b")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(chat.titulo.toUpperCase());

    doc
      .fontSize(9)
      .fillColor("#64748b")
      .font("Helvetica")
      .text(`Protocolo: ${chat._id}  •  Emitido em: ${new Date().toLocaleString("pt-BR")}`);

    doc.moveDown(2);

    // --- MENSAGENS ---
    chat.mensagens.forEach((m: any) => {
      const isUser = m.role === "user";
      
      // Salva a posição inicial para desenhar a linha lateral depois
      const startY = doc.y;

      // Nome do Remetente
      doc
        .fillColor(isUser ? "#64748b" : "#6366f1")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(isUser ? "SOLICITAÇÃO DO USUÁRIO" : "RESPOSTA TÉCNICA SENTINEL IA", 65);

      doc.moveDown(0.4);

      // Conteúdo da Mensagem
      doc
        .fillColor("#334155")
        .font("Helvetica")
        .fontSize(10)
        .text(m.content, 70, doc.y, {
          width: 470,
          align: "justify",
          lineGap: 2
        });

      // Linha lateral (Visual de "Quote" profissional)
      const endY = doc.y;
      doc
        .strokeColor(isUser ? "#cbd5e1" : "#6366f1")
        .lineWidth(2)
        .moveTo(55, startY + 2)
        .lineTo(55, endY)
        .stroke();

      doc.moveDown(1.5); // Espaço entre as mensagens

      // Evita que uma mensagem comece no finalzinho da página
      if (doc.y > 700) doc.addPage();
    });

    // --- RODAPÉ (PAGINAÇÃO) ---
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < (range.start + range.count); i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .text(
          `Página ${i + 1} de ${range.count}  •  Documento gerado pelo ecossistema Sentinel IA`,
          50,
          780,
          { align: "center", width: 500 }
        );
    }

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

    // BUSCAR CONTEXTO REAL COM POPULATE
    const [epis, riscos, setores, colabs, entregas] = await Promise.all([
      Epi.find().limit(100).lean(),
      Risco.find().populate("setorId", "nome").limit(100).lean(),
      Setor.find().limit(100).lean(),
      Colaborador.find().populate("setorId", "nome").limit(200).lean(),
      EntregaEpi.find()
      .populate("colaboradorId", "nome matricula")
      .populate("epiId", "nome")
      .sort({ dataEntrega: -1 })
      .limit(20)
      .lean(),
    ]);

    // ==================================================
    // DATA ATUAL
    // ==================================================
    const dataAtual = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());

    const resumoEntregas = entregas
  .map((e: any) => {
    return `- ENTREGA:
  COLABORADOR: ${e.colaboradorId?.nome || "N/A"} (${e.colaboradorId?.matricula || "N/A"})
  EPI: ${e.epiSnapshot?.nome || e.epiId?.nome}
  CA: ${e.epiSnapshot?.ca}
  VALIDADE_CA: ${
    e.epiSnapshot?.validade_ca
      ? new Date(e.epiSnapshot.validade_ca).toLocaleDateString("pt-BR")
      : "N/A"
  }
  STATUS_CA: ${e.validadeStatus?.toUpperCase() || "N/A"}
  DATA_ENTREGA: ${new Date(e.dataEntrega).toLocaleDateString("pt-BR")}
  DEVOLVIDA: ${e.devolvida ? "SIM" : "NÃO"}`;
  })
  .join("\n");
    

    //  SYSTEM PROMPT (NR-1, NR-6, NR-9, NR-38)
const systemPrompt = `
Você é o assistente oficial do sistema **Sentinel — Gestão de Riscos & EPIs**,
desenvolvido por **Felipe (N1nji)** Co-Fundador da N1S1 Games estúdio de jogos.

Data atual: ${dataAtual}

Especialização:
- NR-1 (Disposições Gerais)
- NR-6 (EPIs)
- NR-9 (Riscos Ambientais)
- NR-38 (Limpeza Urbana)

MISSÃO:
Ajudar usuários de forma clara, profissional e humana, utilizando
exclusivamente dados reais do sistema quando necessário.

REGRAS IMPORTANTES:
- Nunca confunda CA com quantidade
- CA é número de registro, NÃO é estoque
- Use apenas dados fornecidos no contexto
- Nunca invente informações
- Se algo não existir, diga claramente

DADOS DISPONÍVEIS NO SISTEMA:
- EPIs em estoque
- Entregas de EPIs (histórico legal e validade no momento da entrega)
- Colaboradores
- Setores
- Riscos ocupacionais

USO DAS ENTREGAS DE EPI:
- Utilize ENTREGAS quando a pergunta envolver:
  - histórico de entrega
  - EPI entregue a colaborador
  - validade do CA no momento da entrega
  - devolução ou status da entrega


TOM DE COMUNICAÇÃO:
- Profissional e acessível
- Linguagem natural
- Evite respostas robóticas

EXTENSÃO DAS RESPOSTAS:
- Perguntas simples → respostas curtas
- Perguntas técnicas → respostas mais detalhadas

PADRÃO DE RESPOSTA:
- Prefira listas quando houver vários itens
- Destaque informações críticas como validade, estoque e riscos
- Use avisos visuais (⚠️ 🔴 🟡) quando fizer sentido

SOBRE O SISTEMA:
- Explique o Sentinel de forma clara e objetiva quando perguntado

=================================================
CONTEXTO DO SISTEMA
=================================================

EPIS EM ESTOQUE:
${epis.map(e =>
  `- ${e.nome}
    CA: ${e.ca}
    VALIDADE_CA: ${new Date(e.validade_ca).toLocaleDateString("pt-BR")}
    ESTOQUE: ${e.estoque}
    STATUS: ${e.status.toUpperCase()}`
).join("\n")}

ENTREGAS DE EPIs (BASE LEGAL):
${resumoEntregas}

RISCOS:
${riscos.map(
  (r: any) =>
    `- ${r.nome} (${r.classificacao}) - Setor: ${r.setorId?.nome || "N/A"}`
).join("\n")}

SETORES:
${setores.map(s => `
  - SETOR: ${s.nome}
    RESPONSÁVEL: ${s.responsavel || "Não informado"}
    STATUS: ${s.status.toUpperCase()}
    DESCRIÇÃO: ${s.descricao || "N/A"}
`).join("\n")}

COLABORADORES:
${colabs.map(
  (c: any) =>
    `- ${c.nome} (${c.matricula}) - Setor: ${c.setorId?.nome || "N/A"}`
).join("\n")}

=================================================
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

    // MANTENDO PADRÃO ANTIGO
    const resposta =
      respostaIA.choices?.[0]?.message?.content || "Sem resposta.";

    // Salva resposta
    chat.mensagens.push({ role: "assistant", content: resposta });

    // AUTO-RENAME (IGUAL AO ANTIGO, SÓ MAIS SEGURO)
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
