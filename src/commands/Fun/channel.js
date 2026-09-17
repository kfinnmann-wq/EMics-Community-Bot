```js
import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Verwalte die Kanäle des Servers')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    category: 'Utility',

    async execute(interaction, config, client) {
        // Sicherheitsprüfung
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ Du benötigst die Berechtigung **Kanäle verwalten**, um diesen Befehl zu verwenden.',
                ephemeral: true,
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🍫 EMics System • Channel Manager')
            .setDescription(
                'Verwalte deine Server-Kanäle über das Menü unten.\n\n' +
                'Wähle aus, was du machen möchtest:'
            )
            .addFields(
                {
                    name: '➕ Erstellen',
                    value: 'Text- oder Sprachkanäle erstellen',
                    inline: true,
                },
                {
                    name: '✏️ Bearbeiten',
                    value: 'Kanäle umbenennen',
                    inline: true,
                },
                {
                    name: '🔒 Verwaltung',
                    value: 'Kanäle sperren oder entsperren',
                    inline: true,
                },
                {
                    name: '🗑️ Löschen',
                    value: 'Kanäle sicher entfernen',
                    inline: true,
                }
            )
            .setFooter({
                text: `${interaction.guild.name} • EMics System🍫`,
            })
            .setTimestamp();

        const menu = new StringSelectMenuBuilder()
            .setCustomId('channel_manager')
            .setPlaceholder('⚙️ Aktion auswählen...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Kanal erstellen')
                    .setDescription('Einen neuen Text- oder Sprachkanal erstellen')
                    .setEmoji('➕')
                    .setValue('create'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Kanal umbenennen')
                    .setDescription('Einen vorhandenen Kanal umbenennen')
                    .setEmoji('✏️')
                    .setValue('rename'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Kanal sperren')
                    .setDescription('Nachrichten in einem Kanal deaktivieren')
                    .setEmoji('🔒')
                    .setValue('lock'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Kanal entsperren')
                    .setDescription('Nachrichten wieder erlauben')
                    .setEmoji('🔓')
                    .setValue('unlock'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Kanal löschen')
                    .setDescription('Einen vorhandenen Kanal löschen')
                    .setEmoji('🗑️')
                    .setValue('delete')
            );

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.reply({
            embeds: [embed],
            components: [row],
        });
    },
};
```
