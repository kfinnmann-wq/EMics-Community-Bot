import {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
} from 'discord.js';

import {
    replyUserError,
    ErrorTypes,
} from '../../utils/errorHandler.js';

import {
    getGuildConfig,
    updateGuildConfig,
} from '../../services/config/guildConfig.js';

export default {
    data: new SlashCommandBuilder()
        .setName('youtube')
        .setDescription('YouTube-Benachrichtigungen verwalten.')
        .setDMPermission(false)

        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('YouTube-Benachrichtigungen einrichten.')
                .addStringOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Die YouTube Channel-ID.')
                        .setRequired(true),
                )
                .addChannelOption(option =>
                    option
                        .setName('discord_channel')
                        .setDescription('Discord-Kanal für neue Videos.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                ),
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Zeigt die aktuelle YouTube-Einstellung.'),
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Deaktiviert YouTube-Benachrichtigungen.'),
        ),

    category: 'Selfmade',

    async execute(interaction, config, client) {
        try {
            if (
                !interaction.member.permissions.has(
                    PermissionFlagsBits.ManageGuild,
                )
            ) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.NO_PERMISSION,
                    message:
                        'Du benötigst die Berechtigung **Server verwalten**, um diesen Befehl zu verwenden.',
                });
            }

            const subcommand = interaction.options.getSubcommand();

            const currentConfig = await getGuildConfig(
                client,
                interaction.guild.id,
            );

            if (subcommand === 'setup') {
                const youtubeChannelId =
                    interaction.options.getString('channel').trim();

                const discordChannel =
                    interaction.options.getChannel('discord_channel');

                if (!discordChannel) {
                    return await replyUserError(interaction, {
                        type: ErrorTypes.UNKNOWN,
                        message: 'Der ausgewählte Discord-Kanal ist ungültig.',
                    });
                }

                if (discordChannel.type !== ChannelType.GuildText) {
                    return await replyUserError(interaction, {
                        type: ErrorTypes.UNKNOWN,
                        message:
                            'Bitte wähle einen normalen Textkanal aus.',
                    });
                }

                if (!youtubeChannelId) {
                    return await replyUserError(interaction, {
                        type: ErrorTypes.UNKNOWN,
                        message:
                            'Bitte gib eine gültige YouTube Channel-ID ein.',
                    });
                }

                await updateGuildConfig(client, interaction.guild.id, {
                    youtube: {
                        enabled: true,
                        channelId: youtubeChannelId,
                        discordChannelId: discordChannel.id,
                    },
                });

                return await interaction.reply({
                    content:
                        '✅ **YouTube-Benachrichtigungen wurden eingerichtet!**\n\n' +
                        `📺 YouTube Channel-ID: \`${youtubeChannelId}\`\n` +
                        `📢 Discord-Kanal: <#${discordChannel.id}>\n\n` +
                        'Neue Videos werden automatisch geprüft.',
                    ephemeral: true,
                });
            }

            if (subcommand === 'status') {
                const youtube = currentConfig.youtube;

                if (
                    !youtube ||
                    !youtube.enabled ||
                    !youtube.channelId ||
                    !youtube.discordChannelId
                ) {
                    return await interaction.reply({
                        content:
                            'ℹ️ **YouTube-Benachrichtigungen sind deaktiviert.**',
                        ephemeral: true,
                    });
                }

                return await interaction.reply({
                    content:
                        '📺 **YouTube-Status**\n\n' +
                        `Channel-ID: \`${youtube.channelId}\`\n` +
                        `Discord-Kanal: <#${youtube.discordChannelId}>\n` +
                        'Status: 🟢 Aktiv',
                    ephemeral: true,
                });
            }

            if (subcommand === 'disable') {
                await updateGuildConfig(client, interaction.guild.id, {
                    youtube: {
                        ...(currentConfig.youtube || {}),
                        enabled: false,
                    },
                });

                return await interaction.reply({
                    content:
                        '✅ **YouTube-Benachrichtigungen wurden deaktiviert.**',
                    ephemeral: true,
                });
            }

            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'Unbekannter YouTube-Befehl.',
            });
        } catch (error) {
            console.error(
                '[YOUTUBE COMMAND] Fehler:',
                error,
            );

            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply({
                    content:
                        '❌ Beim Ausführen des YouTube-Befehls ist ein Fehler aufgetreten.',
                });
            }

            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message:
                    'Beim Ausführen des YouTube-Befehls ist ein unerwarteter Fehler aufgetreten.',
            });
        }
    },
};
