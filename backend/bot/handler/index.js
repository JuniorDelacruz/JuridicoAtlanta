const fs = require("fs")
const Discord = require("discord.js")

module.exports = async (client) => {

const SlashsArray = []

  fs.readdir(`./Comandos`, (error, folder) => {
  folder.forEach(subfolder => {
fs.readdir(`./Comandos/${subfolder}/`, (error, files) => { 
  files.forEach(files => {
      
  if(!files?.endsWith('.js')) return;
  files = require(`../Comandos/${subfolder}/${files}`);
  if(!files?.name) return;
  client.slashCommands.set(files?.name, files);
   
  SlashsArray.push(files)
  });
    });
  });
});
  client.on(Discord.Events.ClientReady, async () => {
  client.guilds.cache.forEach(guild => guild.commands.set(SlashsArray))
    });
};