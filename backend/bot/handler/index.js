// arquivo: handler.js  (ou o nome que você estiver usando)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Events } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (client) => {
  const slashCommands = [];

  // Caminho da pasta principal de comandos
  const commandsPath = path.join(__dirname, '..', 'Comandos');

  try {
    const subfolders = await fs.readdir(commandsPath, { withFileTypes: true });

    for (const folder of subfolders) {
      if (!folder.isDirectory()) continue;

      const folderPath = path.join(commandsPath, folder.name);
      const files = await fs.readdir(folderPath, { withFileTypes: true });

      for (const file of files) {
        if (!file.isFile() || !file.name.endsWith('.js')) continue;

        const filePath = path.join(folderPath, file.name);

        // Import dinâmico do comando
        const commandModule = await import(filePath);

        // Padrão mais comum em ESM: export default { name, description, run, ... }
        const command = commandModule.default ?? commandModule;

        if (!command?.name) {
          console.warn(`Comando sem "name" ignorado: ${filePath}`);
          continue;
        }

        // Registra no Collection do client
        client.slashCommands.set(command.name, command);

        // Adiciona ao array para deploy global
        slashCommands.push(command);
      }
    }

    // Quando o bot estiver pronto, registra os comandos em todos os servidores
    client.on(Events.ClientReady, async () => {
      console.log(`[Comandos] Registrando ${slashCommands.length} comandos slash globais...`);

      try {
        // Deploy global (para todos os servidores)
        await client.application.commands.set(slashCommands);
        console.log('[Comandos] Comandos slash globais registrados com sucesso!');
      } catch (error) {
        console.error('[Comandos] Erro ao registrar comandos globais:', error);
      }

      // Alternativa: se quiser registrar por guilda (mais rápido para testes)
      // client.guilds.cache.forEach(async (guild) => {
      //   await guild.commands.set(slashCommands);
      //   console.log(`Comandos registrados em ${guild.name}`);
      // });
    });

  } catch (error) {
    console.error('Erro ao carregar comandos:', error);
  }
};