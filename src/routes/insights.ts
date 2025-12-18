import { Router } from "express";
import Groq from "groq-sdk";
import { auth } from "../middleware/auth";

const router = Router();
const ia = new Groq({ apiKey: process.env.GROQ_API_KEY! });

router.post("/", auth, async (req, res) => {
  try {
    // espera receber um payload resumido: { resumoDados: string }
    const { resumoDados } = req.body;
    if (!resumoDados) return res.status(400).json({ error: "resumoDados é obrigatório" });

    const prompt = `Você é analista de SST. Com base no resumo abaixo, gere: (1) 3 insights principais, (2) 3 ações recomendadas e (3) 1 sugestão de compra para reabastecer estoque.\n\nResumo:\n${resumoDados}`;

    const resposta = await ia.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Você é especialista em SST e logística de EPIs." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });

    res.json({ insights: resposta.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar insights IA" });
  }
});

export default router;
