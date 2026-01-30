// backend/controllers/webhookConfigController.js
import db from "../models/index.js";

const { WebhookConfig } = db;

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function listWebhooks(req, res) {
  try {
    const rows = await WebhookConfig.findAll({
      order: [["tipo", "ASC"]],
    });
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ msg: "Erro ao listar webhooks.", error: err.message });
  }
}

export async function createWebhook(req, res) {
  try {
    const { tipo, url, enabled } = req.body;

    if (!tipo || !String(tipo).trim()) {
      return res.status(400).json({ msg: "Campo 'tipo' é obrigatório." });
    }

    const cleanTipo = String(tipo).trim();
    const cleanUrl = String(url).trim();

    // Se já existir tipo, retorna erro (ou podemos fazer upsert, se preferir)
    const exists = await WebhookConfig.findOne({ where: { tipo: cleanTipo } });
    if (exists) {
      return res.status(409).json({ msg: "Já existe webhook para esse tipo. Edite o existente." });
    }

    const row = await WebhookConfig.create({
      tipo: cleanTipo,
      url: cleanUrl,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      createdBy: req.user?.id || null,
      updatedBy: req.user?.id || null,
    });

    return res.status(201).json({ msg: "Webhook criado.", item: row });
  } catch (err) {
    return res.status(500).json({ msg: "Erro ao criar webhook.", error: err.message });
  }
}

export async function updateWebhook(req, res) {
  try {
    const { id } = req.params;
    const { tipo, url, enabled } = req.body;

    const row = await WebhookConfig.findByPk(id);
    if (!row) return res.status(404).json({ msg: "Webhook não encontrado." });

    if (tipo !== undefined) {
      const cleanTipo = String(tipo).trim();
      if (!cleanTipo) return res.status(400).json({ msg: "Campo 'tipo' inválido." });

      // garante unique tipo ao editar
      const other = await WebhookConfig.findOne({ where: { tipo: cleanTipo } });
      if (other && other.id !== row.id) {
        return res.status(409).json({ msg: "Já existe webhook para esse tipo." });
      }

      row.tipo = cleanTipo;
    }

    if (url !== undefined) {
      const cleanUrl = String(url).trim();
      if (!cleanUrl || !isValidUrl(cleanUrl)) {
        return res.status(400).json({ msg: "Campo 'url' inválido." });
      }
      row.url = cleanUrl;
    }

    if (enabled !== undefined) {
      row.enabled = Boolean(enabled);
    }

    row.updatedBy = req.user?.id || null;
    await row.save();

    return res.json({ msg: "Webhook atualizado.", item: row });
  } catch (err) {
    return res.status(500).json({ msg: "Erro ao atualizar webhook.", error: err.message });
  }
}

export async function deleteWebhook(req, res) {
  try {
    const { id } = req.params;

    const row = await WebhookConfig.findByPk(id);
    if (!row) return res.status(404).json({ msg: "Webhook não encontrado." });

    await row.destroy();
    return res.json({ msg: "Webhook deletado." });
  } catch (err) {
    return res.status(500).json({ msg: "Erro ao deletar webhook.", error: err.message });
  }
}