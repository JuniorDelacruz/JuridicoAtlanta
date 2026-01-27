// backend/routes/cadastroCidadaoRoutes.js
import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";


const router = express.Router();
const { CadastroCidadao } = db;


// GET /api/cadastros/existe?identidade=XXX
router.get("/existe", authMiddleware(['admin']), async (req, res) => {
try {
const identidade = String(req.query.identidade || "").trim();
if (!identidade) return res.status(400).json({ msg: "Identidade é obrigatória" });


const cidadao = await CadastroCidadao.findOne({
where: { identidade },
attributes: ["id", "nomeCompleto", "identidade", "status"],
});


if (!cidadao) return res.json({ exists: false });


return res.json({
exists: true,
cidadao: {
id: cidadao.id,
nomeCompleto: cidadao.nomeCompleto,
identidade: cidadao.identidade,
status: cidadao.status,
},
});
} catch (err) {
console.error(err);
return res.status(500).json({ msg: "Erro ao verificar identidade" });
}
});


export default router;