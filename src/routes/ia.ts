import { Router } from "express";
import Groq from "groq-sdk";
import { auth } from "../middleware/auth";

const router = Router();

const ia = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// ==========================================================
// 1) IA — SUGESTÃO DE EPI BASEADO EM RISCO
// ==========================================================
router.post("/sugerir", auth, async (req, res) => {
  try {
    const { risco } = req.body;

    if (!risco) {
      return res.status(400).json({ error: "Risco não informado." });
    }

    const resposta = await ia.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Você é um especialista em Segurança do Trabalho, com domínio das normas NR-6, NR-9 e NR-38 (Limpeza Urbana). Responda de forma direta e técnica.",
        },
        {
          role: "user",
          content: `Qual EPI é recomendado para o risco: "${risco}"?`,
        },
      ],
      temperature: 0.3,
    });

    res.json({ resposta: resposta.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao consultar IA." });
  }
});

// ==========================================================
// 2) IA — CHAT GERAL
// ==========================================================
router.post("/chat", auth, async (req, res) => {
  try {
    const { mensagem } = req.body;

    if (!mensagem) {
      return res.status(400).json({ error: "Mensagem não enviada." });
    }

    const resposta = await ia.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente especialista em Segurança do Trabalho, NR-6, NR-9, NR-38 (Limpeza Urbana), EPIs e riscos ocupacionais.",
        },
        { role: "user", content: mensagem },
      ],
      temperature: 0.4,
    });

    res.json({ resposta: resposta.choices[0].message.content });
  } catch (err) {
    console.error("ERRO NA IA:", err);
    res.status(500).json({ error: "Erro ao consultar IA." });
  }
});

export default router;
