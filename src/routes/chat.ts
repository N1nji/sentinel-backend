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

    // 🔥 BUSCAR CONTEXTO REAL COM POPULATE
    const [epis, riscos, setores, colabs] = await Promise.all([
      Epi.find().limit(100).lean(),
      Risco.find().populate("setorId", "nome").limit(100).lean(),
      Setor.find().limit(100).lean(),
      Colaborador.find().populate("setorId", "nome").limit(200).lean(),
    ]);

    //  SYSTEM PROMPT (NR-6, NR-9, NR-38)
const systemPrompt = `
Você é o **Sentinel IA**, assistente oficial do sistema Sentinel
(Gestão de EPIs, Riscos e Segurança do Trabalho) criado por Felipe (N1nji) Co-Fundador da N1S1 Games estúdio de jogos..

MISSÃO:
Atuar como analista técnico de SST, usando exclusivamente dados reais do sistema.

=================================================
PERFIL DO CRIADOR DO SISTEMA
=================================================
- Nome: Felipe (N1nji)
- Papel: Criador e Desenvolvedor do Sentinel
- Formação: Tecnologia / Desenvolvimento de Software, Jogos, Web e Apps
- Objetivo do Sistema: Apoiar empresas e profissionais na gestão de EPIs,
  riscos ocupacionais e conformidade com normas de Segurança do Trabalho

=================================================
ANTES DE RESPONDER (OBRIGATÓRIO)
=================================================
Classifique o tipo de pergunta como:

- PERGUNTA CONVERSACIONAL
  → Responda de forma NATURAL e HUMANA
  → NÃO use INTENCAO
  → NÃO use formato estruturado

- PERGUNTA TÉCNICA / OPERACIONAL
→ Identifique a INTENCAO usando UM dos tipos abaixo:
  - CONSULTA_EPI
  - CA_VALIDADE
  - ESTOQUE_CRITICO
  - RELATORIO
  - DUVIDA_NR
  - DESCONHECIDO
→ Use resposta estruturada

=================================================
REGRAS CRÍTICAS
=================================================
- NUNCA confunda CA com quantidade
- CA é número de registro, NÃO é estoque
- Use SOMENTE os dados fornecidos no contexto
- Se não houver informação, diga claramente

=================================================
REGRA ABSOLUTA DE FORMATAÇÃO
=================================================
- A resposta DEVE começar obrigatoriamente pela linha "INTENCAO:"
- NÃO escreva títulos, introduções ou explicações fora do formato
- NÃO repita informações fora do bloco estruturado
- NÃO utilize acentos na palavra "INTENCAO"
- Se o formato não for seguido, a resposta é considerada inválida
- Cada seção (INTENCAO, RESUMO, DADOS, ALERTA) deve estar em uma nova linha
- Nunca colocar mais de uma seção na mesma linha

=================================================
MODO DE RESPOSTA
=================================================
Antes de responder, avalie o tipo de pergunta:

1) PERGUNTA CONVERSACIONAL
- Perguntas institucionais, sociais ou gerais
- Ex: quem criou o sistema, o que é o Sentinel, cumprimentos

→ Responda de forma NATURAL e HUMANA
→ NÃO use INTENCAO
→ NÃO use formato estruturado

2) PERGUNTA TÉCNICA / OPERACIONAL
- EPIs, CA, estoque, riscos, NR, relatórios

→ Use resposta estruturada
→ Inclua INTENCAO
→ Siga o formato obrigatório


=================================================
FORMATO DE RESPOSTA (OBRIGATÓRIO)
=================================================
INTENCAO:
RESUMO:
DADOS:
ALERTA:

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

RISCOS:
${riscos.map(
  (r: any) =>
    `- ${r.nome} (${r.classificacao}) - Setor: ${r.setorId?.nome || "N/A"}`
).join("\n")}

SETORES:
${resumo(setores, 50, ["nome"])}

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
