import express from 'express';
import db from '../models/index.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

const { Requerimento, User } = db;

// GET /api/requerimentos - Lista requerimentos (todos para admin/equipe, só os seus para outros)
router.get('/', authMiddleware(), async (req, res) => {
    try {
        const where = {};

        // Admin e conselheiro veem todos
        if (!['admin', 'conselheiro'].includes(req.user.role) && req.user.subRole !== 'equipejuridico') {
            where.userId = req.user.id; // só vê os seus
        }

        const requerimentos = await Requerimento.findAll({
            where,
            include: [{ model: User, attributes: ['username'] }],
            order: [['createdAt', 'DESC']],
        });

        res.json(requerimentos);
    } catch (err) {
        console.error('Erro ao listar requerimentos:', err);
        res.status(500).json({ msg: 'Erro ao listar requerimentos' });
    }
});

// POST /api/requerimentos - Cria novo requerimento
router.post('/', authMiddleware(), async (req, res) => {
    const { tipo, dados } = req.body;

    // Validação básica
    if (!tipo || !dados) {
        return res.status(400).json({ msg: 'Tipo e dados são obrigatórios' });
    }

    try {
        const novo = await Requerimento.create({
            tipo,
            dados,
            solicitante: req.user.username || 'Usuário',
            status: 'PENDENTE',
            userId: req.user.id,
        });

        res.status(201).json(novo);
    } catch (err) {
        console.error('Erro ao criar requerimento:', err);
        res.status(500).json({ msg: 'Erro ao criar requerimento' });
    }
});

// GET /api/triagem - Lista pendentes (só para quem tem permissão)
router.get('/triagem', authMiddleware(['juiz', 'promotor', 'promotorchefe', 'tabeliao', 'escrivao', 'admin']), async (req, res) => {
    try {
        const pendentes = await Requerimento.findAll({
            where: { status: 'PENDENTE' },
            include: [{ model: User, attributes: ['username'] }],
            order: [['createdAt', 'ASC']], // pendentes mais antigos primeiro
        });
        res.json(pendentes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao carregar triagem' });
    }
});

// GET /api/requerimentos/:numero - Detalhes de um requerimento
router.get('/:numero', authMiddleware(), async (req, res) => {
    try {
        const requerimento = await Requerimento.findOne({
            where: { numero: req.params.numero },
            include: [{ model: User, attributes: ['username'] }],
        });

        if (!requerimento) {
            return res.status(404).json({ msg: 'Requerimento não encontrado' });
        }

        // Verifica permissão: dono ou admin
        if (requerimento.userId !== req.user.id && !['admin'].includes(req.user.role)) {
            return res.status(403).json({ msg: 'Acesso negado' });
        }

        res.json(requerimento);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao carregar detalhes' });
    }
});

// PATCH /api/requerimentos/:id/carimbar (só para porte de arma aprovado)
router.patch('/:id/carimbar', authMiddleware(['tabeliao', 'escrivao']), async (req, res) => {
    try {
        const req = await Requerimento.findByPk(req.params.id);
        if (!req) return res.status(404).json({ msg: 'Requerimento não encontrado' });
        if (req.tipo !== 'Porte de Arma' || req.status !== 'APROVADO') {
            return res.status(400).json({ msg: 'Não pode carimbar este requerimento' });
        }

        req.carimbadoPor = req.user.id;
        req.dataCarimbo = new Date();
        await req.save();

        res.json({ msg: 'Carimbado com sucesso', requerimento: req });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao carimbar' });
    }
});

export default router;