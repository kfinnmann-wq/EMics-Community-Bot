import {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
} from 'discord.js';

import {
    replyUserError,
    ErrorTypes,
} from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Create a new channel with a custom emoji.')
        .setDMPermission(false)

        // Kanalart
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('What type of channel should be created?')
                .setRequired(true)
                .addChoices(
                    {
                        name: 'Textkanal',
                        value: 'text',
                    },
                    {
                        name: 'Sprachkanal',
                        value: 'voice',
                    },
                    {
                        name: 'Ankündigungskanal',
                        value: 'announcement',
                    },
                    {
                        name: 'Forum',
                        value: 'forum',
                    },
                    {
                        name: 'Bühnenkanal',
                        value: 'stage',
                    },
                ),
        )

        // Kategorie
        .addChannelOption(option =>
            option
                .setName('category')
                .setDescription('In which category should the channel be created?')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
        )

        // Emoji
        .addStringOption(option =>
            option
                .setName('emoji')
                .setDescription('The emoji that should appear at the beginning of the channel name.')
                .setRequired(true)
                .setMaxLength(10),
        )

        // Kanalname
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The name of the channel without the emoji.')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(90),
        ),

    category: 'Utility',

    async execute(interaction, config, client) {
        try {
            /*
             * Prüfen, ob der Benutzer Kanäle verwalten darf.
             */
            if (
                !interaction.member.permissions.has(
                    PermissionFlagsBits.ManageChannels,
                )
            ) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.NO_PERMISSION,
                    message:
                        'Du benötigst die Berechtigung **Kanäle verwalten**, um diesen Befehl zu verwenden.',
                });
            }

            /*
             * Prüfen, ob der Bot Kanäle verwalten darf.
             */
            const botMember = interaction.guild.members.me;

            if (
                !botMember ||
                !botMember.permissions.has(
                    PermissionFlagsBits.ManageChannels,
                )
            ) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.NO_PERMISSION,
                    message:
                        'Ich benötige die Berechtigung **Kanäle verwalten**, um einen Kanal erstellen zu können.',
                });
            }

            /*
             * Optionen auslesen
             */
            const type = interaction.options.getString('type');
            const category = interaction.options.getChannel('category');
            const emoji = interaction.options.getString('emoji').trim();
            const inputName = interaction.options
                .getString('name')
                .trim();

            /*
             * Sicherheitsprüfung für die Kategorie
             */
            if (!category || category.type !== ChannelType.GuildCategory) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message:
                        'Die ausgewählte Kategorie ist ungültig.',
                });
            }

            /*
             * Kanalname bereinigen.
             *
             * Discord erlaubt keine:
             * # / \ : * ? " < > |
             */
            let channelName = inputName
                .replace(/[#/\\:*?"<>|]/g, '')
                .replace(/\s+/g, '-')
                .trim();

            if (!channelName) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message:
                        'Der eingegebene Kanalname ist ungültig.',
                });
            }

            /*
             * Der endgültige Name:
             *
             * ⌊EMOJI⌉NAME
             *
             * Beispiel:
             * ⌊🎮⌉games
             */
            const finalName = `⌊${emoji}⌉${channelName}`.slice(0, 100);

            /*
             * Discord ChannelType bestimmen
             */
            let channelType;

            switch (type) {
                case 'text':
                    channelType = ChannelType.GuildText;
                    break;

                case 'voice':
                    channelType = ChannelType.GuildVoice;
                    break;

                case 'announcement':
                    channelType = ChannelType.GuildAnnouncement;
                    break;

                case 'forum':
                    channelType = ChannelType.GuildForum;
                    break;

                case 'stage':
                    channelType = ChannelType.GuildStageVoice;
                    break;

                default:
                    return await replyUserError(interaction, {
                        type: ErrorTypes.UNKNOWN,
                        message:
                            'Die ausgewählte Kanalart ist ungültig.',
                    });
            }

            /*
             * Prüfen, ob der Kanalname bereits existiert.
             */
            const existingChannel = interaction.guild.channels.cache.find(
                channel => channel.name === finalName,
            );

            if (existingChannel) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message:
                        `Der Kanal **${finalName}** existiert bereits.`,
                });
            }

            /*
             * Kanal erstellen
             */
            const newChannel = await interaction.guild.channels.create({
                name: finalName,
                type: channelType,
                parent: category.id,
                reason: `Channel created by ${interaction.user.tag}`,
            });

            /*
             * Erfolgreiche Antwort
             */
            return await interaction.reply({
                content:
                    `✅ Der Kanal **${newChannel.name}** wurde erfolgreich erstellt!\n` +
                    `📁 Kategorie: **${category.name}**\n` +
                    `📌 Typ: **${getChannelTypeName(type)}**`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(
                '[CHANNEL COMMAND] Fehler beim Erstellen eines Kanals:',
                error,
            );

            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply({
                    content:
                        '❌ Beim Erstellen des Kanals ist ein Fehler aufgetreten.',
                });
            }

            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message:
                    'Beim Erstellen des Kanals ist ein unerwarteter Fehler aufgetreten.',
            });
        }
    },
};

/**
 * Gibt einen lesbaren Namen für die Kanalart zurück.
 */
function getChannelTypeName(type) {
    switch (type) {
        case 'text':
            return 'Textkanal';

        case 'voice':
            return 'Sprachkanal';

        case 'announcement':
            return 'Ankündigungskanal';

        case 'forum':
            return 'Forum';

        case 'stage':
            return 'Bühnenkanal';

        default:
            return 'Unbekannt';
    }
}
