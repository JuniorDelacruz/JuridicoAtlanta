// backend/utils/discordWebhook.js
import axios from 'axios';


async function notifyDiscordBot(cadastro) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL não configurado no .env');
    return;
  }

  // Sanitiza valores para evitar undefined/null
  const safe = (val) => val ?? '—';

  const embed = {
    title: 'CADASTRO DE CIDADÃO',
    color: 0x00ff00, // Verde
    description: `CADASTRO DE CIDADÃO Nº ${cadastro.id}`,
    thumbnail: { url: "https://i.imgur.com/A22LhtG.png"},
    fields: [
      { name: 'Nome Completo', value: safe(cadastro.nomeCompleto), inline: false },
      { name: 'Pombo', value: safe(cadastro.pombo), inline: false },
      { name: 'Identidade', value: safe(cadastro.identidade), inline: false },
      { name: 'Profissão', value: safe(cadastro.profissao), inline: false },
      { name: 'Residência', value: safe(cadastro.residencia), inline: false },
      { name: 'ID Discord', value: `<@${safe(cadastro.discordId)}>`, inline: false },
      { name: 'Aprovado por', value: `ID ${safe(cadastro.aprovadoPor)}`, inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Jurídico Atlanta RP' },
  };
  const payload = { embeds: [embed] };

  // Log do payload para debug
  console.log('Enviando payload para Discord:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('Notificação enviada ao Discord! Status:', response.status);
  } catch (err) {
    console.error('Erro ao enviar webhook para o Discord:', err.message);
    if (err.response) {
      console.error('Resposta do Discord:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

export default notifyDiscordBot;