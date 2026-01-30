const Discord = require("discord.js");
const axios = require("axios");
const QRCode = require("qrcode");
const sharp = require("sharp");
const { QrCodePix } = require("qrcode-pix");

// ✅ Ajuste com seus dados
const PIX_KEY = "kauemelox2018@gmail.com";
const MERCHANT_NAME = "KAUE MELOX";
const MERCHANT_CITY = "SAOPAULO";

// ranking opcional só pra validação
function formatBRL(n) {
  return `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
}

// Gera payload Pix (copia e cola)
function buildPixPayloadMelox({ amount }) {
  const qrCodePix = QrCodePix({
    version: "01",
    key: PIX_KEY,
    name: MERCHANT_NAME,
    city: MERCHANT_CITY,
    transactionId: "***",
    value: Number(Number(amount).toFixed(2)),
  });

  return qrCodePix.payload();
}

// Gera QRCode PNG + ícone do servidor no meio
async function makePixQrWithGuildIconMelox(payload, iconUrl) {
  const qrPng = await QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "H",
    scale: 10,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const qr = sharp(qrPng);
  const meta = await qr.metadata();
  const qrSize = Math.min(meta.width || 0, meta.height || 0);
  if (!qrSize) return qrPng; // fallback

  // se não tiver ícone, retorna QR puro
  if (!iconUrl) return qrPng;

  const logoResp = await axios.get(iconUrl, { responseType: "arraybuffer" });
  const logoBuf = Buffer.from(logoResp.data);

  const logoSize = Math.round(qrSize * 0.18);
  const badgeSize = Math.round(logoSize * 1.25);

  const logoPng = await sharp(logoBuf)
    .resize(logoSize, logoSize, { fit: "cover" })
    .png()
    .toBuffer();

  const badgeSvg = Buffer.from(`
    <svg width="${badgeSize}" height="${badgeSize}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${badgeSize}" height="${badgeSize}"
        rx="${Math.round(badgeSize * 0.2)}" ry="${Math.round(badgeSize * 0.2)}"
        fill="white"/>
    </svg>
  `);

  const center = Math.round(qrSize / 2);

  return await qr
    .composite([
      {
        input: badgeSvg,
        left: center - Math.round(badgeSize / 2),
        top: center - Math.round(badgeSize / 2),
      },
      {
        input: logoPng,
        left: center - Math.round(logoSize / 2),
        top: center - Math.round(logoSize / 2),
      },
    ])
    .png()
    .toBuffer();
}

module.exports = {
  name: "pixmelox",
  description: "Gera um Pix (estático) com QRCode e ícone do servidor",
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "valor",
      description: "Valor em reais. Ex: 15.90",
      type: Discord.ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: "descricao",
      description: "Descrição (opcional) que aparece em alguns bancos",
      type: Discord.ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const valor = interaction.options.getNumber("valor");
    const descricao = interaction.options.getString("descricao") || "";

    if (!valor || valor <= 0) {
      return interaction.editReply({
        content: "Valor inválido. Use um número maior que 0.",
        ephemeral: true,
      });
    }

    // 🔥 txid simples e seguro (sem caracteres estranhos)
    const txid = `TICKET${interaction.channelId.slice(-6)}${Date.now().toString().slice(-4)}`;

    const payload = buildPixPayloadMelox({
      amount: valor,
      txid,
      description: descricao,
    });

    // Guarda no customId (não pode ser gigante). Melhor guardar em memória/banco.
    // Aqui vamos mandar o payload direto quando clicar, então deixo salvo em cache simples:
    if (!client.pixCache) client.pixCache = new Map();
    client.pixCache.set(interaction.id, {
      payload,
      valor,
      txid,
      guildId: interaction.guildId,
    });

    // Botões
    const btnEnviar = new Discord.ButtonBuilder()
      .setCustomId(`pixmelox_send:${interaction.id}`)
      .setLabel("Enviar Pix")
      .setEmoji("💠")
      .setStyle(Discord.ButtonStyle.Success);

    const btnCancelar = new Discord.ButtonBuilder()
      .setCustomId(`pixmelox_cancel:${interaction.id}`)
      .setLabel("Cancelar")
      .setEmoji("✖️")
      .setStyle(Discord.ButtonStyle.Secondary);

    const row = new Discord.ActionRowBuilder().addComponents(btnEnviar, btnCancelar);

    await interaction.editReply({
      content:
        `💸 **Gerar Pix Estático**\n` +
        `**Valor:** ${formatBRL(valor)}\n` +
        `Clique em **Enviar Pix** para receber o QRCode e o copia-e-cola.`,
      components: [row],
    });
  },
};
