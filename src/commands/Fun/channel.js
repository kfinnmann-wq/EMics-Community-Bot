import {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
} from 'discord.js';

import {
    successEmbed,
    errorEmbed,
} from '../../utils/embeds.js';

import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Creates a new channel.')
        .setDMPermission(false)

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

        .addChannelOption(option =>
            option
                .setName('category')
                .setDescription('The category where the channel should be created.')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
        )

        .addStringOption(option =>
            option
                .setName('emoji')
                .setDescription('The emoji for the channel name.')
                .setRequired(true)
                .setMaxLength(10),
        )

        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The name of the channel.')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(90),
        ),

    category: 'Utility',

    async execute(interaction, config, client) {
        try {
            // Prüfen, ob der Benutzer Kanäle verwalten darf
            if (
                !interaction.member.permissions.has(
                    PermissionFlagsBits.ManageChannels,
                )
            ) {
                const embed = errorEmbed(
                    'Keine Berechtigung',
                    'Du benötigst die Berechtigung **Kanäle verwalten**, um diesen Befehl zu benutzen.',
                );

                return await InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    ephemeral: true,
                });
            }

            // Prüfen, ob der Bot Kanäle verwalten darf
            const botMember = interaction.guild.members.me;

            if (
                !botMember ||
                !botMember.permissions.has(
                    PermissionFlagsBits.ManageChannels,
                )
            ) {
                const embed = errorEmbed(
                    'Keine Berechtigung',
                    'Ich benötige die Berechtigung **Kanäle verwalten**, um einen Kanal erstellen zu können.',
                );

                return await InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    ephemeral: true,
                });
            }

            // Optionen auslesen
            const type = interaction.options.getString('type');
            const category = interaction.options.getChannel('category');
            const emoji = interaction.options.getString('emoji').trim();
            const name = interaction.options.getString('name').trim();

            // Kategorie überprüfen
            if (!category || category.type !== ChannelType.GuildCategory) {
                const embed = errorEmbed(
                    'Ungültige Kategorie',
                    'Die ausgewählte Kategorie ist ungültig.',
                );

                return await InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    ephemeral: true,
                });
            }

            // Unerlaubte Zeichen aus dem Namen entfernen
            let cleanName = name
                .replace(/[\/\\:*?"<>|#]/g, '')
                .replace(/\s+/g, '-')
                .trim();

            if (!cleanName) {
                const embed = errorEmbed(
                    'Ungültiger Name',
                    'Der eingegebene Kanalname ist ungültig.',
                );

                return await InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    ephemeral: true,
                });
            }

            /*
             * Der fertige Name sieht z. B. so aus:
             *
             * ⌊🎮⌉games
             * ⌊📢⌉news
             * ⌊💬⌉chat
             */
            const finalName = `⌊${emoji}⌉${cleanName}`.slice(0, 100);

            // Kanaltyp bestimmen
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
                    const embed = errorEmbed(
                        'Ungültiger Kanaltyp',
                        'Der ausgewählte Kanaltyp ist ungültig.',
                    );

                    return await InteractionHelper.safeReply(interaction, {
                        embeds: [embed],
                        ephemeral: true,
                    });
            }

            // Prüfen, ob bereits ein Kanal mit diesem Namen existiert
            const existingChannel = interaction.guild.channels.cache.find(
                channel => channel.name === finalName,
            );

            if (existingChannel) {
                const embed = errorEmbed(
                    'Kanal existiert bereits',
                    `Der Kanal **${finalName}** existiert bereits.`,
                );

                return await InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    ephemeral: true,
                });
            }

            // Kanal erstellen
            const newChannel = await interaction.guild.channels.create({
                name: finalName,
                type: channelType,
                parent: category.id,
                reason: `Channel created by ${interaction.user.tag}`,
            });

            // Erfolgsnachricht
            const embed = successEmbed(
                'Kanal erstellt',
                `Der Kanal <#${newChannel.id}> wurde erfolgreich erstellt.`,
            );

            await InteractionHelper.safeReply(interaction, {
                embeds: [embed],
                ephemeral: true,
            });

            logger.debug(
                `Channel ${newChannel.id} created by ${interaction.user.id} in guild ${interaction.guildId}`,
            );
        } catch (error) {
            console.error('[CHANNEL] Error:', error);

            const embed = errorEmbed(
                'Fehler',
                'Beim Erstellen des Kanals ist ein Fehler aufgetreten.',
            );

            await InteractionHelper.safeReply(interaction, {
                embeds: [embed],
                ephemeral: true,
            });
        }
    },
};