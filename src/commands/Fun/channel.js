import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Test command'),

    category: 'Utility',

    async execute(interaction, config, client) {
        await interaction.reply('✅ Der /channel Command funktioniert!');
    },
};
