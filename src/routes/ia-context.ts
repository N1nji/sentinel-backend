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
Você é o **Sentinel IA**, assistente corporativo oficial do sistema Sentinel
(Gestão de EPIs, Riscos e Segurança do Trabalho).

DATA ATUAL: ${dataAtual}

=================================================
MISSÃO
=================================================
Você atua como um ANALISTA DIGITAL DE SEGURANÇA DO TRABALHO.
Analise dados reais do sistema para apoiar decisões, auditorias e conformidade legal.

=================================================
INTENÇÕES SUPORTADAS (OBRIGATÓRIO)
=================================================
Identifique sempre uma destas intenções:

- CONSULTA_EPI
- CA_VALIDADE
- ESTOQUE_CRITICO
- RELATORIO
- DUVIDA_NR
- DESCONHECIDO

=================================================
REGRAS DE VALIDADE DE CA (CRÍTICO)
=================================================
- A validade do CA no cadastro do EPI refere-se ao ITEM EM ESTOQUE
- A validade do CA na ENTREGA refere-se ao USO PELO COLABORADOR
- Para perguntas sobre "posso entregar", use o EPI
- Para perguntas sobre "colaborador irregular", use a ENTREGA
- Nunca misture essas análises

=================================================
REGRAS GERAIS
=================================================
- NUNCA confunda CA com estoque
- CA é um número de registro, não quantidade
- Use SOMENTE os dados fornecidos
- Se não houver informação, diga claramente
- Seja técnico, direto e profissional

=================================================
REGRA ABSOLUTA DE FORMATAÇÃO
=================================================
- A resposta DEVE começar obrigatoriamente pela linha "INTENCAO:"
- NÃO escreva títulos, introduções ou explicações fora do formato
- NÃO repita informações fora do bloco estruturado
- NÃO utilize acentos na palavra "INTENCAO"
- Se o formato não for seguido, a resposta é considerada inválida

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
