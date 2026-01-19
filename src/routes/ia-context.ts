import { Router } from "express";
import Groq from "groq-sdk";
import { auth, AuthRequest } from "../middleware/auth";

import Epi from "../models/Epi";
import Setor from "../models/Setor";
import Risco from "../models/Risco";
import Colaborador from "../models/Colaborador";
import EntregaEpi from "../models/EntregaEpi";

const router = Router();

const ia = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// ======================================================
// IA COM CONTEXTO CORPORATIVO + MEMÓRIA + DATA
// ======================================================
router.post("/context", auth, async (req: AuthRequest, res) => {
  try {
    const { mensagem, historico = [] } = req.body;

    if (!mensagem) {
      return res.status(400).json({ error: "Mensagem não enviada." });
    }

    // ==================================================
    // BUSCA DE DADOS (LIMITADA PARA TOKENS/PERFORMANCE)
    // ==================================================
    const [epis, setores, riscos, colaboradores, entregas] =
      await Promise.all([
        Epi.find().limit(50).lean(),
        Setor.find().limit(50).lean(),
        Risco.find().limit(30).lean(),
        Colaborador.find()
          .populate("setorId", "nome")
          .limit(100)
          .lean(),
        EntregaEpi.find()
          .populate("colaboradorId", "nome matricula")
          .populate("epiId", "nome")
          .sort({ dataEntrega: -1 })
          .limit(100)
          .lean(),
      ]);

    // ==================================================
    // FORMATADORES DE CONTEXTO
    // ==================================================
    const resumoSetores = setores
      .map((s) => `- SETOR: ${s.nome}`)
      .join("\n");

    const resumoColaboradores = colaboradores
      .map((c) => {
        const setorNome = (c.setorId as any)?.nome || "Setor não informado";
        return `- COLABORADOR: ${c.nome} | MATRÍCULA: ${
          c.matricula || "N/A"
        } | SETOR: ${setorNome}`;
      })
      .join("\n");

    const resumoRiscos = riscos
      .map(
        (r) => `- RISCO: ${r.nome} | CLASSIFICAÇÃO: ${r.classificacao}`
      )
      .join("\n");

    const resumoEpis = epis
      .map((e) => {
        return `
- ITEM/EPI: ${e.nome}
  CA: ${e.ca}
  VALIDADE_CA: ${new Date(e.validade_ca).toLocaleDateString("pt-BR")}
  ESTOQUE: ${e.estoque} unidades
  STATUS: ${e.status.toUpperCase()}
`;
      })
      .join("\n");

    const resumoEntregas = entregas
      .map((e: any) => {
        return `
- ENTREGA:
  COLABORADOR: ${e.colaboradorId?.nome || "N/A"} (${
          e.colaboradorId?.matricula || "N/A"
        })
  EPI: ${e.epiSnapshot?.nome || e.epiId?.nome}
  CA: ${e.epiSnapshot?.ca}
  VALIDADE_CA: ${
    e.epiSnapshot?.validade_ca
      ? new Date(e.epiSnapshot.validade_ca).toLocaleDateString("pt-BR")
      : "N/A"
  }
  STATUS_CA: ${e.validadeStatus.toUpperCase()}
  DATA_ENTREGA: ${new Date(e.dataEntrega).toLocaleDateString("pt-BR")}
  DEVOLVIDA: ${e.devolvida ? "SIM" : "NÃO"}
`;
      })
      .join("\n");

    // ==================================================
    // DATA ATUAL
    // ==================================================
    const dataAtual = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());

    // ==================================================
    // SYSTEM PROMPT (VERSÃO FINAL)
    // ==================================================
    const systemPrompt = `
Você é o assistente oficial do sistema **Sentinel — Gestão de Riscos & EPIs**,
desenvolvido por **Felipe (N1nji)** Co-Fundador da N1S1 Games estúdio de jogos.

DATA ATUAL: ${dataAtual}

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
${resumoEpis}

ENTREGAS DE EPIS (BASE LEGAL):
${resumoEntregas}

COLABORADORES:
${resumoColaboradores}

SETORES:
${resumoSetores}

RISCOS:
${resumoRiscos}

=================================================
`.trim();

    // ==================================================
    // MENSAGENS (SYSTEM + HISTÓRICO + USER)
    // ==================================================
    const messages = [
      { role: "system", content: systemPrompt },
      ...historico.slice(-6),
      { role: "user", content: mensagem },
    ];

    // ==================================================
    // CHAMADA IA
    // ==================================================
    const resposta = await ia.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages as any,
      temperature: 0.3,
      max_tokens: 1000,
      top_p: 1,
    });

    res.json({
      resposta: resposta.choices[0].message.content,
    });
  } catch (err) {
    console.error("Erro IA context:", err);
    res
      .status(500)
      .json({ error: "Erro ao processar inteligência do Sentinel." });
  }
});

export default router;
