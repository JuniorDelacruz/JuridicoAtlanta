import express from 'express';
import db from '../models/index.js';
import authMiddleware from '../middleware/auth.js'; // seu middleware de auth

const router = express.Router();

const { User } = db;

// GET /api/users - Lista todos usuários (protegido)
router.get('/', authMiddleware(['admin', 'conselheiro']), async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'discordId', 'role', 'subRole'],
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ msg: 'Erro ao listar usuários' });
    }
});

router.patch('/:id', authMiddleware(['admin']), async (req, res) => {
    const { role, subRole } = req.body;

    const validRoles = ['cidadao', 'auxiliar', 'advogado', 'tabeliao', 'escrivao', 'promotor', 'conselheiro', 'promotor Chefe', 'juiz', 'desembargador', 'admin'];
    const validSubRoles = [null, 'equipejuridico']; // ou outros sub-cargos que quiser

    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ msg: 'Cargo inválido' });
    }

    if (subRole !== undefined && !validSubRoles.includes(subRole)) {
        return res.status(400).json({ msg: 'Sub-cargo inválido' });
    }

    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Usuário não encontrado' });

        if (role !== undefined) user.role = role;
        if (subRole !== undefined) user.subRole = subRole;

        await user.save();

        res.json({ msg: 'Usuário atualizado', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao atualizar usuário' });
    }
});

export default router;