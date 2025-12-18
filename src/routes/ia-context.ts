import { Router } from "express";
import Groq from "groq-sdk";
import { auth, AuthRequest } from "../middleware/auth";
import Epi from "../models/Epi";
import Setor from "../models/Setor";
import Risco from "../models/Risco";
import Colaborador from "../models/Colaborador";

const router = Router();

const ia = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// ======================================================
// IA COM CONTEXTO CORPORATIVO (FORTE + AFIRMATIVO)
// ======================================================
router.post("/context", auth, async (req: AuthRequest, res) => {
  try {
    const { mensagem } = req.body;

    if (!mensagem) {
      return res.status(400).json({ error: "Mensagem não enviada." });
    }

    // 🔹 Buscar dados COM POPULATE
    const [epis, setores, riscos, colaboradores] = await Promise.all([
      Epi.find().limit(100).lean(),
      Setor.find().limit(100).lean(),
      Risco.find().limit(100).lean(),
      Colaborador.find()
        .populate("setorId", "nome")
        .limit(200)
        .lean(),
    ]);

    // ==================================================
    // RESUMOS HUMANOS (SEM IDs SOLTOS)
    // ==================================================
    function resumoSetores(list: any[]) {
      return list
        .map((s) => `Setor ${s.nome}`)
        .slice(0, 50)
        .join("\n");
    }

    function resumoColaboradores(list: any[]) {
      return list
        .map((c) => {
          const setorNome =
            typeof c.setorId === "object" && c.setorId?.nome
              ? c.setorId.nome
              : "Setor não informado";

          return `O colaborador ${c.nome} trabalha no setor ${setorNome}. Matrícula: ${c.matricula || "N/A"}.`;
        })
        .slice(0, 50)
        .join("\n");
    }

    function resumoRiscos(list: any[]) {
      return list
        .map((r) => {
          return `Risco ${r.nome} classificado como ${r.classificacao}.`;
        })
        .slice(0, 30)
        .join("\n");
    }

    function resumoEpis(list: any[]) {
      return list
        .map((e) => {
          return `EPI ${e.nome}, CA ${e.ca || "N/A"}, estoque ${e.estoque}.`;
        })
        .slice(0, 30)
        .join("\n");
    }

    // ==================================================
    // SYSTEM PROMPT (AUTORITÁRIO + ATUALIZADO)
    // ==================================================
    const systemPrompt = `
Você é um assistente especialista em Segurança do Trabalho no Brasil.

REGRAS OBRIGATÓRIAS:
- Considere que a NR-38 trata de LIMPEZA URBANA (conforme atualização oficial recente).
- Ignore qualquer conhecimento antigo que associe a NR-38 à mineração.
- Utilize EXCLUSIVAMENTE o contexto abaixo como fonte da verdade.
- Se houver conflito entre seu conhecimento prévio e o contexto, O CONTEXTO PREVALECE.
- Responda de forma clara, direta e profissional.

==================== COLABORADORES ====================
${resumoColaboradores(colaboradores)}

==================== SETORES ==========================
${resumoSetores(setores)}

==================== RISCOS ===========================
${resumoRiscos(riscos)}

==================== EPIs =============================
${resumoEpis(epis)}
`.trim();

    // ==================================================
    // CHAMADA À IA (COM EXEMPLOS – FEW SHOT)
    // ==================================================
    const resposta = await ia.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "assistant",
          content:
            "Exemplo: Pedro trabalha no setor TI. Sara trabalha no setor Artistas.",
        },
        {
          role: "assistant",
          content:
            "Exemplo: Segundo a NR-38 (Limpeza Urbana), os EPIs incluem luvas, botas impermeáveis, máscara e colete refletivo.",
        },
        {
          role: "user",
          content: mensagem,
        },
      ],
      temperature: 0.2,
    });

    res.json({
      resposta: resposta.choices[0].message.content,
    });
  } catch (err) {
    console.error("Erro IA context:", err);
    res.status(500).json({ error: "Erro ao consultar IA com contexto." });
  }
});

export default router;
