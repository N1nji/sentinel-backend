import Log from "../models/Log";

export const registrarLog = async (usuarioId: string, acao: string, detalhes?: string) => {
  try {
    await Log.create({ usuarioId, acao, detalhes });
  } catch (error) {
    console.error("Erro ao salvar log:", error);
  }
};