import express from 'express';
import db from '../models/index.js';
import authMiddleware from '../middleware/auth.js'; // seu middleware de auth
import { requirePerm } from '../middleware/requirePerm.js';

const router = express.Router();

const { User } = db;
// roles do menor pro maior
const ROLE_ORDER = [
    "cidadao",
    "auxiliar",
    "advogado",
    "tabeliao",
    "escrivao",
    "promotor",
    "conselheiro",
    "promotor chefe",
    "juiz",
    "desembargador",
];

// subRoles do menor pro maior
const SUBROLE_ORDER = [
    null,
    "alteracaocargo",
    "equipejuridico",
    "responsaveljuridico",
    "master",
];

const norm = (v) =>
    v === null || v === undefined ? null : String(v).trim().toLowerCase();

const roleRank = (role) => ROLE_ORDER.indexOf(norm(role));
const subRank = (sub) => SUBROLE_ORDER.indexOf(norm(sub));


router.get(
    "/",
    authMiddleware(), requirePerm("admin.perm.manageroles"),
    async (req, res) => {
        const users = await User.findAll({
            attributes: ["id", "username", "discordId", "role", "subRole"],
        });
        res.json(users);
    }
);





router.patch(
    "/:id",
    // ✅ agora não é mais por ROLE "admin". É por SUBROLE
    // você vai precisar adaptar seu authMiddleware pra aceitar subRoles (como eu te mandei antes)
    authMiddleware(), requirePerm("admin.perm.manageroles"),
    async (req, res) => {
        const { role, subRole } = req.body;

        const newRole = role !== undefined ? norm(role) : undefined;
        const newSub = subRole !== undefined ? norm(subRole) : undefined;

        // valida valores
        const validRoles = ROLE_ORDER;
        const validSubRoles = SUBROLE_ORDER;

        if (newRole !== undefined && !validRoles.includes(newRole)) {
            return res.status(400).json({ msg: "Cargo inválido" });
        }
        if (newSub !== undefined && !validSubRoles.includes(newSub)) {
            return res.status(400).json({ msg: "Sub-cargo inválido" });
        }

        try {
            const actor = req.user; // vem do auth (role/subRole do DB)
            const actorRole = norm(actor.role);
            const actorSub = norm(actor.subRole);

            const actorRoleR = roleRank(actorRole);
            const actorSubR = subRank(actorSub);

            const isActorMaster = actorSub === "master";
            const isActorResponsavel = actorSub === "responsaveljuridico";

            // ✅ subRole sempre precisa ser válido (senão ninguém manda em nada)
            if (actorSubR < 0) {
                return res.status(403).json({ msg: "Seu sub-cargo é inválido/sem hierarquia." });
            }

            // ✅ role só é obrigatório pra quem NÃO é master/responsável
            if (!isActorMaster && !isActorResponsavel && actorRoleR < 0) {
                return res.status(403).json({ msg: "Seu cargo é inválido/sem hierarquia." });
            }

            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ msg: "Usuário não encontrado" });

            const targetRole = norm(user.role);
            const targetSub = norm(user.subRole);

            const targetRoleR = roleRank(targetRole);
            const targetSubR = subRank(targetSub);

            // =========================
            // 1) Protege superiores
            // =========================

            if (targetSub === "master" && !isActorMaster) {
                return res.status(403).json({ msg: "Você não pode alterar um usuário MASTER." });
            }
            if (targetSub === "responsaveljuridico" && !isActorMaster) {
                return res.status(403).json({ msg: "Você não pode alterar um RESPONSÁVEL JURÍDICO." });
            }

            // Se não é responsavel/master, não mexe em role maior que o seu
            if (!isActorMaster && !isActorResponsavel) {
                if (targetRoleR > actorRoleR) {
                    return res.status(403).json({ msg: "Você não pode alterar cargo de alguém acima do seu." });
                }
                // e também não mexe em subRole acima do seu
                if (targetSubR > actorSubR) {
                    return res.status(403).json({ msg: "Você não pode alterar sub-cargo de alguém acima do seu." });
                }
            }

            // =========================
            // 2) Define o teto de ROLE que o ator pode atribuir
            // =========================
            let maxRoleAssignable = -1;

            // master/responsável REAL (por subRole) continuam podendo tudo
            if (isActorMaster || isActorResponsavel) {
                maxRoleAssignable = ROLE_ORDER.length - 1;
            } else {
                // ✅ agora quem chegou aqui é porque passou no requirePerm("admin.perm.manageroles")
                // então ele pode alterar ROLE, MAS limitado à própria hierarquia (não acima dele).
                if (actorRoleR < 0) {
                    return res.status(403).json({ msg: "Seu cargo é inválido/sem hierarquia." });
                }
                maxRoleAssignable = actorRoleR;
            }

            // se tentou mudar role, valida teto
            if (newRole !== undefined) {
                const newRoleR = roleRank(newRole);
                if (newRoleR < 0) return res.status(400).json({ msg: "Cargo inválido (rank)." });

                if (newRoleR > maxRoleAssignable) {
                    return res.status(403).json({ msg: "Você não pode definir um cargo acima do seu limite." });
                }
            }

            // =========================
            // 3) Define o teto de SUBROLE que o ator pode atribuir
            // =========================
            let allowedSubSet = new Set();

            if (isActorMaster) {
                allowedSubSet = new Set(SUBROLE_ORDER); // pode tudo (inclui master)
            } else if (isActorResponsavel) {
                // não pode setar responsaveljuridico nem master
                allowedSubSet = new Set([null, "alteracaocargo", "equipejuridico"]);
            } else if (actorSub === "equipejuridico") {
                // sugestão: pode no máximo equipejuridico
                allowedSubSet = new Set([null, "alteracaocargo", "equipejuridico"]);
            } else if (actorSub === "alteracaocargo") {
                // só pode setar null ou alteracaocargo
                allowedSubSet = new Set([null, "alteracaocargo"]);
            } else {
                return res.status(403).json({ msg: "Você não tem permissão para alterar sub-cargos." });
            }

            if (newSub !== undefined) {
                if (!allowedSubSet.has(newSub)) {
                    return res.status(403).json({ msg: "Você não pode definir esse sub-cargo." });
                }
            }

            // =========================
            // 4) Aplica mudanças
            // =========================
            if (newRole !== undefined) user.role = newRole;
            if (newSub !== undefined) user.subRole = newSub;

            await user.save();

            return res.json({ msg: "Usuário atualizado", user });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ msg: "Erro ao atualizar usuário" });
        }
    }
);

export default router;