import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Zeigt Informationen über den aktuellen Channel an'),

    async execute(interaction) {
        await interaction.reply(`Dieser Channel heißt **${interaction.channel.name}**.`);
    }
};
