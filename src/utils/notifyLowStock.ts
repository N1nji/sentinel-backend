// backend/src/utils/notifyLowStock.ts
export async function notifyLowStock(epi: any) {
  const webhookUrl = process.env.WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("WEBHOOK_URL não configurada. Ignorando notificação.");
    return;
  }

  const payload = {
    text: `⚠️ Estoque baixo detectado\n\nEPI: ${epi.nome}\nEstoque atual: ${epi.estoque}\nID: ${epi._id}`,
    estoque: epi.estoque,
    epiId: epi._id,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) console.error("Webhook retornou erro:", await res.text());
    else console.log("Webhook enviado com sucesso para baixa de estoque.");

  } catch (err) {
    console.error("Falha ao chamar webhook:", err);
  }
}
