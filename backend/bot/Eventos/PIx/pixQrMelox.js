require('../../index')
const Discord = require('discord.js')
const client = require('../../index');
const config = require('../../config');


client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // Cancelar
  if (interaction.customId.startsWith("pixmelox_cancel:")) {
    return interaction.reply({ content: "Ação cancelada.", ephemeral: true });
  }

  // Enviar pix
  if (interaction.customId.startsWith("pixmelox_send:")) {
    const key = interaction.customId.split(":")[1];
    const cache = interaction.client.pixCache?.get(key);

    if (!cache) {
      return interaction.reply({
        content: "Esse Pix expirou. Gere novamente com /pixmelox.",
        ephemeral: true,
      });
    }

    const payload = cache.payload;
    const valor = cache.valor;

    const iconUrl =
      interaction.guild?.iconURL({ extension: "png", size: 256 }) ??
      null;

    // gera QR com ícone
    const png = await (async () => {
      const axios = require("axios");
      const QRCode = require("qrcode");
      const sharp = require("sharp");

      const qrPng = await QRCode.toBuffer(payload, {
        type: "png",
        errorCorrectionLevel: "H",
        scale: 10,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });

      if (!iconUrl) return qrPng;

      const qr = sharp(qrPng);
      const meta = await qr.metadata();
      const qrSize = Math.min(meta.width || 0, meta.height || 0);
      if (!qrSize) return qrPng;

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
          { input: badgeSvg, left: center - Math.round(badgeSize / 2), top: center - Math.round(badgeSize / 2) },
          { input: logoPng, left: center - Math.round(logoSize / 2), top: center - Math.round(logoSize / 2) },
        ])
        .png()
        .toBuffer();
    })();

    const Discord = require("discord.js");
    const file = new Discord.AttachmentBuilder(png, { name: "pix.png" });

    return interaction.reply({
      ephemeral: false, // 🔥 só quem clicou recebe
      content:
        `✅ **Pix gerado**\n` +
        `**Valor:** R$ ${Number(valor).toFixed(2).replace(".", ",")}\n\n` +
        `**Copia e cola:**\n\`\`\`\n${payload}\n\`\`\``,
      files: [file],
    });
  }
});
