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
// IA COM CONTEXTO CORPORATIVO + MEMÓRIA + DATA
// ======================================================
router.post("/context", auth, async (req: AuthRequest, res) => {
  try {
    // Adicionamos 'historico' vindo do corpo da requisição
    const { mensagem, historico = [] } = req.body;

    if (!mensagem) {
      return res.status(400).json({ error: "Mensagem não enviada." });
    }

    // Buscar dados com limites para performance
    const [epis, setores, riscos, colaboradores] = await Promise.all([
      Epi.find().limit(50).lean(),
      Setor.find().limit(50).lean(),
      Risco.find().limit(30).lean(),
      Colaborador.find()
        .populate("setorId", "nome")
        .limit(100)
        .lean(),
    ]);

    // ==================================================
    // FORMATADORES DE CONTEXTO (LISTAS TÉCNICAS)
    // ==================================================
    const resumoSetores = setores.map((s) => `- SETOR: ${s.nome}`).join("\n");

    const resumoColaboradores = colaboradores.map((c) => {
      const setorNome = (c.setorId as any)?.nome || "Setor não informado";
      return `- COLABORADOR: ${c.nome} | SETOR: ${setorNome} | MATRÍCULA: ${c.matricula || "N/A"}`;
    }).join("\n");

    const resumoRiscos = riscos.map((r) => `- RISCO: ${r.nome} | CLASSIFICAÇÃO: ${r.classificacao}`).join("\n");

    const resumoEpis = epis.map((e) => {
      // Rótulos explícitos para matar o bug do CA vs Estoque
      return `- ITEM/EPI: ${e.nome} | CA: ${e.ca || "N/A"} | QUANTIDADE_EM_ESTOQUE: ${e.estoque} unidades`;
    }).join("\n");

    // ==================================================
    // 📅 DATA ATUAL DINÂMICA
    // ==================================================
    const dataAtual = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(new Date());

    // ==================================================
    // SYSTEM PROMPT (AUTORITÁRIO)
    // ==================================================
    const systemPrompt = `
Você é o assistente virtual do Sentinel, especialista em Segurança do Trabalho e NRs.
Data e hora atual: ${dataAtual}.

REGRAS CRÍTICAS:
1. NR-38 refere-se estritamente a LIMPEZA URBANA.
2. NUNCA CONFUNDA "CA" com "QUANTIDADE_EM_ESTOQUE".
3. O número de 5 dígitos (ex: 42331) é o CERTIFICADO DE APROVAÇÃO (CA). NÃO É O ESTOQUE.
4. Use os dados abaixo para responder. Se não souber, diga que não tem acesso a essa informação específica.
5. Respostas curtas, profissionais e com **negrito** em dados numéricos.
6. Se o usuário perguntar "quanto tem no estoque", responda APENAS o valor de QUANTIDADE_EM_ESTOQUE.

CONTEXTO DA EMPRESA:
---
ESTOQUE DE EPIS:
${resumoEpis}

COLABORADORES:
${resumoColaboradores}

SETORES:
${resumoSetores}

RISCOS MAPEADOS:
${resumoRiscos}
---
`.trim();

    // ==================================================
    // GESTÃO DE MENSAGENS (SYSTEM + HISTÓRICO + USER)
    // ==================================================
    const messages = [
      { role: "system", content: systemPrompt },
      // O histórico deve ser um array de objetos { role: 'user' | 'assistant', content: '...' }
      ...historico.slice(-6), // Mantém as últimas 6 interações para ter memória
      { role: "user", content: mensagem },
    ];

    // ==================================================
    // CHAMADA À IA (TEMPERATURE 0.3)
    // ==================================================
    const resposta = await ia.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages as any,
      temperature: 0.3, // Focado mas com fluidez natural
      max_tokens: 1000,
      top_p: 1,
    });

    res.json({
      resposta: resposta.choices[0].message.content,
    });
  } catch (err) {
    console.error("Erro IA context:", err);
    res.status(500).json({ error: "Erro ao processar inteligência do Sentinel." });
  }
});

export default router;