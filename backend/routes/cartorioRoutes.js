import express from 'express';
import db from '../models/index.js';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path'
import authMiddleware from '../middleware/auth.js';
import notifyDiscordBot from '../utils/discordWebhook.js';
import { criarRegistroArma, validarPorte } from '../controllers/cartorio.controller.js';
import { where } from 'sequelize';
import { createImageUpload } from '../utils/upload.js';
dotenv.config();
const router = express.Router();

const { CadastroCidadao, User } = db;

const upload = createImageUpload({
  dest: "public/uploads",
  maxSizeMB: 5,
});

// GET /api/cartorio/pendentes - Lista cadastros pendentes (para triagem/cartório)
router.get('/pendentes', authMiddleware(['auxiliar', 'tabeliao', 'escrivao', 'juiz', 'admin']), async (req, res) => {
    try {
        const pendentes = await CadastroCidadao.findAll({
            where: { status: 'PENDENTE' },
            include: [{ model: User, as: 'aprovador', attributes: ['username'] }],
            order: [['createdAt', 'ASC']],
        });
        res.json(pendentes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao listar pendentes' });
    }
});

router.post("/porte/validar", authMiddleware(["tabeliao", "escrivao", "juiz", "admin"]), validarPorte,

    async (req, res) => {
        res.status(201).json({
            msg: 'Cadastro criado com sucesso! Aguarde aprovação na triagem.',
            cadastro: novo
        })
    });

router.post("/arma/registro",
    authMiddleware(["tabeliao", "escrivao", "juiz", "admin"]),
    upload.single("imagemIdentidade"),
    criarRegistroArma
);

router.post('/cadastro',
    authMiddleware(['auxiliar', 'tabeliao', 'escrivao', 'juiz', 'admin']),
    upload.single('imagemIdentidade'), // nome do campo no form
    async (req, res) => {
        const {
            nomeCompleto,
            pombo,
            identidade,
            profissao,
            residencia,
            discordId
        } = req.body;

        // Validação
        if (!nomeCompleto || !identidade || !profissao || !residencia || !discordId) {
            return res.status(400).json({ msg: 'Campos obrigatórios faltando' });
        }

        if (!req.file) {
            return res.status(400).json({ msg: 'Imagem da identidade é obrigatória' });
        }

        try {
            const imagePath = `${process.env.URLAPI}/uploads/${req.file.filename}`; // URL relativa

            const novo = await CadastroCidadao.create({
                nomeCompleto,
                pombo: pombo || null,
                identidade,
                profissao,
                residencia,
                discordId,
                imagemIdentidade: imagePath, // salva o caminho
                status: 'PENDENTE',
                userId: req.user.id,
            });

            res.status(201).json({
                msg: 'Cadastro criado com sucesso! Aguarde aprovação na triagem.',
                cadastro: novo
            });
        } catch (err) {
            console.error('Erro ao criar cadastro:', err);
            res.status(500).json({ msg: 'Erro interno ao criar cadastro' });
        }
    }
);



router.patch('/:id/aprovar', authMiddleware(['juiz', 'admin']), async (req, res) => {
    try {
        const cadastro = await CadastroCidadao.findByPk(req.params.id);
        if (!cadastro || cadastro.status !== 'PENDENTE') return res.status(400).json({ msg: 'Cadastro inválido ou já processado' });

        console.log(req.user)

        const Aprovador = await CadastroCidadao.findOne({ where: { discordId: req.user?.discordId }})

        cadastro.status = 'APROVADO';
        cadastro.aprovadoPor = req.user.id;
        cadastro.dataAprovacao = new Date();
        await cadastro.save();


        const CidadaoPayload = { 
            status: "APROVADO",
            aprovadoPor: Aprovador.nomeCompleto,
            dados : cadastro
        }

        // Chama o bot Discord para enviar mensagem (via webhook ou API interna)
        await notifyDiscordBot("cadastroCidadao", CidadaoPayload);

        res.json({ msg: 'Cadastro aprovado e notificado no Discord', cadastro });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao aprovar cadastro' });
    }
});

// PATCH /api/cartorio/:id/indeferir - Indeferir
router.patch('/:id/indeferir', authMiddleware(['juiz', 'admin']), async (req, res) => {
    try {
        const cadastro = await CadastroCidadao.findByPk(req.params.id);
        if (!cadastro || cadastro.status !== 'PENDENTE') return res.status(400).json({ msg: 'Cadastro inválido' });

        cadastro.status = 'INDEFERIDO';
        cadastro.aprovadoPor = req.user.id;
        cadastro.dataAprovacao = new Date();
        await cadastro.save();

        res.json(cadastro);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao indeferir cadastro' });
    }
});

export default router;