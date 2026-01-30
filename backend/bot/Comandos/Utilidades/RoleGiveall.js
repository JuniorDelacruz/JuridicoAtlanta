// Comandos/admin/role-giveall.js
const {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  name: 'role-giveall',
  description: 'Concede um cargo para todos os membros do servidor (com segurança e em lotes).',
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: String(PermissionFlagsBits.ManageRoles),
  options: [
    {
      name: 'cargo',
      description: 'Cargo que será atribuído para todos',
      type: ApplicationCommandOptionType.Role,
      required: true
    },
    {
      name: 'incluir_bots',
      description: 'Incluir bots no processamento? (padrão: não)',
      type: ApplicationCommandOptionType.Boolean,
      required: false
    },
    {
      name: 'apenas_sem_cargo',
      description: 'Apenas quem ainda NÃO tem o cargo? (padrão: sim)',
      type: ApplicationCommandOptionType.Boolean,
      required: false
    },
    {
      name: 'lote_tamanho',
      description: 'Qtd por lote (padrão 10, máx 25)',
      type: ApplicationCommandOptionType.Integer,
      required: false
    },
    {
      name: 'lote_intervalo_ms',
      description: 'Intervalo entre lotes em ms (padrão 1500ms)',
      type: ApplicationCommandOptionType.Integer,
      required: false
    }
  ],

  async run(client, interaction) {
    try {
      // Seu index já faz deferReply({ephemeral:true}); então usamos editReply.
      const guild = interaction.guild;
      if (!guild) return interaction.editReply({ content: '❌ Use este comando dentro de um servidor.' });

      const role = interaction.options.getRole('cargo', true);
      const incluirBots = interaction.options.getBoolean('incluir_bots') ?? false;
      const apenasSemCargo = interaction.options.getBoolean('apenas_sem_cargo') ?? true;
      const loteTamanho = Math.min(Math.max(interaction.options.getInteger('lote_tamanho') ?? 10, 1), 25);
      const loteIntervalo = Math.max(interaction.options.getInteger('lote_intervalo_ms') ?? 1500, 0);

      // Checagens de segurança
      const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
      if (!me) return interaction.editReply({ content: '❌ Não consegui validar minhas permissões.' });

      if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.editReply({ content: '❌ Eu não tenho permissão **Gerenciar Cargos**.' });
      }

      // Hierarquia de cargos (bot precisa estar ACIMA do cargo que vai dar)
      const myTop = me.roles.highest?.position ?? 0;
      if (role.position >= myTop) {
        return interaction.editReply({ content: '❌ Não posso conceder este cargo: meu cargo mais alto está abaixo ou no mesmo nível.' });
      }

      // Evita tentar dar cargos gerenciados (integrações)
      if (role.managed) {
        return interaction.editReply({ content: '❌ Este cargo é gerenciado por uma integração e não pode ser atribuído.' });
      }

      // Busca membros
      await interaction.editReply({ content: '🔎 Coletando membros do servidor…' });
      const allMembers = await guild.members.fetch({ withPresences: false }).catch(() => null);
      if (!allMembers) return interaction.editReply({ content: '❌ Não consegui carregar os membros.' });

      // Filtra população alvo
      let alvo = allMembers.filter((m) => {
        if (!incluirBots && m.user.bot) return false;
        if (apenasSemCargo && m.roles.cache.has(role.id)) return false;
        // Não tente dar cargo ao dono se posição do cargo for maior que o do bot (já validado na hierarquia global acima, mas ok)
        return true;
      });

      // Evita tentar dar a quem o bot não pode editar (hierarquia por membro)
      alvo = alvo.filter((m) => {
        // regra prática: se o bot NÃO pode gerenciar o membro, ignore
        // (por ex.: membro com cargo acima do bot)
        return me.roles.highest.comparePositionTo(m.roles.highest) > 0 || m.id === me.id;
      });

      const total = alvo.size;
      if (total === 0) {
        return interaction.editReply({ content: 'ℹ️ Ninguém para atualizar com os filtros atuais.' });
      }

      // Resumo inicial
      const summary = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle('Distribuição de Cargo — Iniciada')
        .setDescription(
          [
            `**Cargo:** ${role} (\`${role.id}\`)`,
            `**Incluir bots:** ${incluirBots ? 'Sim' : 'Não'}`,
            `**Apenas quem não tem o cargo:** ${apenasSemCargo ? 'Sim' : 'Não'}`,
            `**Lote:** ${loteTamanho} | **Intervalo:** ${loteIntervalo}ms`,
            `**Alvos:** ${total} membro(s)`
          ].join('\n')
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [summary] });

      // Processamento em lotes (rate-limit friendly)
      const ids = [...alvo.keys()];
      let ok = 0, fail = 0;

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      for (let i = 0; i < ids.length; i += loteTamanho) {
        const slice = ids.slice(i, i + loteTamanho);

        const results = await Promise.allSettled(
          slice.map(async (id) => {
            const member = allMembers.get(id) || await guild.members.fetch(id).catch(() => null);
            if (!member) throw new Error('member_not_found');

            // Evita redundância se alguém ganhou o cargo no meio do processo
            if (member.roles.cache.has(role.id)) return 'already_has';

            await member.roles.add(role, `role-giveall by ${interaction.user.tag}`).catch((e) => {
              // Algumas falhas comuns: Missing Permissions, Unknown Member, etc.
              throw e;
            });
            return 'added';
          })
        );

        for (const r of results) {
          if (r.status === 'fulfilled' && r.value === 'added') ok++;
          else if (r.status === 'fulfilled' && r.value === 'already_has') { /* ignora */ }
          else fail++;
        }

        // Feedback parcial (edita a mesma resposta)
        await interaction.editReply({
          content: `⏳ Processando… **${ok}** ok, **${fail}** falharam, **${Math.min(i + loteTamanho, ids.length)} / ${ids.length}**`
        });

        if (i + loteTamanho < ids.length && loteIntervalo > 0) {
          await sleep(loteIntervalo);
        }
      }

      const done = new EmbedBuilder()
        .setColor(fail ? 0xf59e0b : 0x22c55e)
        .setTitle('Distribuição de Cargo — Concluída')
        .setDescription(
          [
            `**Cargo:** ${role}`,
            `**Sucesso:** ${ok}`,
            `**Falhas:** ${fail}`,
            `**Total processado:** ${ids.length}`
          ].join('\n')
        )
        .setTimestamp();

      return interaction.editReply({ content: null, embeds: [done] });
    } catch (err) {
      console.error('[role-giveall]', err);
      return interaction.editReply({ content: `❌ Erro ao processar: ${String(err.message || err)}` });
    }
  }
};
