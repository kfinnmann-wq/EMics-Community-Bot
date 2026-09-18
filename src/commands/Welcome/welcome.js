import { getColor } from '../../config/bot.js';
import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} from 'discord.js';

import {
    getWelcomeConfig,
    updateWelcomeConfig
} from '../../utils/database.js';

import {
    formatWelcomeMessage,
    truncateForEmbedField
} from '../../utils/welcome.js';

import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
    ErrorTypes,
    replyUserError
} from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure the welcome system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        // =========================
        // /welcome setup
        // =========================
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the welcome message')

                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to send welcome messages to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription(
                            'Welcome message. Variables: {user}, {username}, {server}, {memberCount}'
                        )
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('URL of the image to include in the welcome message')
                        .setRequired(false)
                )

                .addBooleanOption(option =>
                    option
                        .setName('ping')
                        .setDescription('Whether to ping the user in the welcome message')
                        .setRequired(false)
                )
        )

        // =========================
        // /welcome disable
        // =========================
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable the welcome system')
        )

        // =========================
        // /welcome enable
        // =========================
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable the welcome system again')
        ),

    async execute(interaction) {
        try {
            const deferSuccess = await InteractionHelper.safeDefer(interaction);

            if (!deferSuccess) {
                logger.warn('[Welcome] Interaction defer failed', {
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'welcome'
                });

                return;
            }
        } catch (deferError) {
            logger.error('[Welcome] Defer error', {
                error: deferError.message
            });

            return;
        }

        const { options, guild, client } = interaction;

        // =========================
        // Permission check
        // =========================
        if (
            !interaction.memberPermissions?.has(
                PermissionFlagsBits.ManageGuild
            )
        ) {
            return await replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message:
                    'You need the **Manage Server** permission to use `/welcome`.'
            });
        }

        const subcommand = options.getSubcommand();

        // =========================
        // /welcome disable
        // =========================
        if (subcommand === 'disable') {
            try {
                const existingConfig = await getWelcomeConfig(
                    client,
                    guild.id
                );

                if (!existingConfig?.channelId) {
                    return await replyUserError(interaction, {
                        type: ErrorTypes.UNKNOWN,
                        message:
                            'Das Welcome-System ist noch nicht eingerichtet.'
                    });
                }

                await updateWelcomeConfig(client, guild.id, {
                    enabled: false
                });

                logger.info(
                    `[Welcome] Disabled by ${interaction.user.tag} for guild ${guild.name} (${guild.id})`
                );

                const embed = new EmbedBuilder()
                    .setColor(getColor('success'))
                    .setTitle('✅ Welcome-System deaktiviert')
                    .setDescription(
                        'Die Willkommensnachrichten wurden erfolgreich deaktiviert.'
                    )
                    .addFields(
                        {
                            name: '📢 Kanal',
                            value: `<#${existingConfig.channelId}>`,
                            inline: true
                        },
                        {
                            name: '📊 Status',
                            value: 'Deaktiviert',
                            inline: true
                        }
                    )
                    .setFooter({
                        text: 'Mit /welcome enable kannst du es wieder aktivieren.'
                    });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [embed]
                });

                return;
            } catch (error) {
                logger.error(
                    `[Welcome] Failed to disable welcome system for guild ${guild.id}:`,
                    error
                );

                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message:
                        'Das Welcome-System konnte nicht deaktiviert werden.'
                });
            }
        }

        // =========================
        // /welcome enable
        // =========================
        if (subcommand === 'enable') {
            try {
                const existingConfig = await getWelcomeConfig(
                    client,
                    guild.id
                );

                if (!existingConfig?.channelId) {
                    return await replyUserError(interaction, {
                        type: ErrorTypes.UNKNOWN,
                        message:
                            'Das Welcome-System wurde noch nicht eingerichtet. Nutze zuerst `/welcome setup`.'
                    });
                }

                await updateWelcomeConfig(client, guild.id, {
                    enabled: true
                });

                logger.info(
                    `[Welcome] Enabled by ${interaction.user.tag} for guild ${guild.name} (${guild.id})`
                );

                const embed = new EmbedBuilder()
                    .setColor(getColor('success'))
                    .setTitle('✅ Welcome-System aktiviert')
                    .setDescription(
                        'Die Willkommensnachrichten sind wieder aktiviert.'
                    )
                    .addFields(
                        {
                            name: '📢 Kanal',
                            value: `<#${existingConfig.channelId}>`,
                            inline: true
                        },
                        {
                            name: '📊 Status',
                            value: 'Aktiviert',
                            inline: true
                        }
                    )
                    .setFooter({
                        text: 'Mit /welcome disable kannst du es wieder deaktivieren.'
                    });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [embed]
                });

                return;
            } catch (error) {
                logger.error(
                    `[Welcome] Failed to enable welcome system for guild ${guild.id}:`,
                    error
                );

                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message:
                        'Das Welcome-System konnte nicht aktiviert werden.'
                });
            }
        }

        // =========================
        // /welcome setup
        // =========================
        if (subcommand === 'setup') {
            const channel = options.getChannel('channel');
            const message = options.getString('message');
            const image = options.getString('image');
            const ping = options.getBoolean('ping') ?? false;

            // =========================
            // Validate message
            // =========================
            if (!message || message.trim().length === 0) {
                logger.warn(
                    `[Welcome] Empty message provided by ${interaction.user.tag} in ${guild.name}`
                );

                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: 'Welcome message cannot be empty.'
                });
            }

            // =========================
            // Validate image URL
            // =========================
            if (image) {
                try {
                    new URL(image);
                } catch (error) {
                    logger.warn(
                        `[Welcome] Invalid image URL provided by ${interaction.user.tag}: ${image}`
                    );

                    return await replyUserError(interaction, {
                        type: ErrorTypes.VALIDATION,
                        message:
                            'Please provide a valid image URL starting with http:// or https://.'
                    });
                }
            }

            try {
                const existingConfig = await getWelcomeConfig(
                    client,
                    guild.id
                );

                // Nur blockieren, wenn das System momentan wirklich aktiv ist
                if (existingConfig?.channelId && existingConfig.enabled) {
                    logger.info(
                        `[Welcome] Setup blocked because config already exists in channel ${existingConfig.channelId} for guild ${guild.id}`
                    );

                    return await replyUserError(interaction, {
                        type: ErrorTypes.UNKNOWN,
                        message:
                            `Welcome is already configured for <#${existingConfig.channelId}>. Use \`/welcome disable\` first or use your dashboard to customize the settings.`
                    });
                }

                // =========================
                // Save configuration
                // =========================
                await updateWelcomeConfig(client, guild.id, {
                    enabled: true,
                    channelId: channel.id,
                    welcomeMessage: message,
                    welcomeImage: image || undefined,
                    welcomePing: ping
                });

                logger.info(
                    `[Welcome] Setup configured by ${interaction.user.tag} for guild ${guild.name} (${guild.id})`
                );

                // =========================
                // Create preview
                // =========================
                const previewMessage = formatWelcomeMessage(message, {
                    user: interaction.user,
                    guild
                });

                const embed = new EmbedBuilder()
                    .setColor(getColor('success'))
                    .setTitle('✅ Welcome-System eingerichtet')
                    .setDescription(
                        `Willkommensnachrichten werden ab jetzt in ${channel} gesendet.`
                    )
                    .addFields(
                        {
                            name: '📝 Message Preview',
                            value: truncateForEmbedField(previewMessage)
                        },
                        {
                            name: '🔔 User pingen',
                            value: ping ? 'Ja' : 'Nein',
                            inline: true
                        },
                        {
                            name: '📊 Status',
                            value: 'Aktiviert',
                            inline: true
                        },
                        {
                            name: '📢 Kanal',
                            value: `${channel}`,
                            inline: true
                        }
                    )
                    .setFooter({
                        text: 'Mit /welcome disable kannst du das System deaktivieren.'
                    });

                if (image) {
                    embed.setImage(image);
                }

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [embed]
                });

                return;
            } catch (error) {
                logger.error(
                    `[Welcome] Failed to setup welcome system for guild ${guild.id}:`,
                    error
                );

                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message:
                        'An error occurred while configuring the welcome system. Please try again.'
                });
            }
        }
    }
};
