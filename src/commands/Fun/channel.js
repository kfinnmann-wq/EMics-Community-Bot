```js
import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
} from 'discord.js';

const PREFIX_LEFT = '⌊';
const PREFIX_RIGHT = '⌉';

function channelName(emoji, name) {
    return `${PREFIX_LEFT}${emoji}${PREFIX_RIGHT}${name}`;
}

function mainEmbed(guild) {
    return new EmbedBuilder()
        .setTitle('🍫 EMics System • Channel Manager')
        .setDescription(
            '**Verwalte deine Server-Kanäle über dieses Panel.**\n\n' +
            'Wähle eine Aktion aus dem Menü aus.\n\n' +
            '➕ **Erstellen** — Einen neuen Channel erstellen\n' +
            '✏️ **Umbenennen** — Einen bestehenden Channel umbenennen\n' +
            '🔒 **Sperren** — Einen Channel sperren\n' +
            '🔓 **Entsperren** — Einen Channel freigeben\n' +
            '🗑️ **Löschen** — Einen Channel löschen'
        )
        .setFooter({
            text: `${guild.name} • EMics System🍫`,
        })
        .setTimestamp();
}

export default {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Verwalte die Server-Channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    category: 'Utility',

    async execute(interaction, config, client) {
        if (!interaction.guild) {
            return interaction.reply({
                content: '❌ Dieser Befehl kann nur auf einem Server verwendet werden.',
                ephemeral: true,
            });
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ Du benötigst die Berechtigung **Kanäle verwalten**.',
                ephemeral: true,
            });
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`channel_action_${interaction.user.id}`)
            .setPlaceholder('⚙️ Aktion auswählen...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel erstellen')
                    .setDescription('Einen komplett neuen Channel erstellen')
                    .setEmoji('➕')
                    .setValue('create'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel umbenennen')
                    .setDescription('Emoji und Namen eines Channels ändern')
                    .setEmoji('✏️')
                    .setValue('rename'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel sperren')
                    .setDescription('Nachrichten in einem Textchannel sperren')
                    .setEmoji('🔒')
                    .setValue('lock'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel entsperren')
                    .setDescription('Einen gesperrten Textchannel wieder freigeben')
                    .setEmoji('🔓')
                    .setValue('unlock'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel löschen')
                    .setDescription('Einen Channel dauerhaft löschen')
                    .setEmoji('🗑️')
                    .setValue('delete')
            );

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.reply({
            embeds: [mainEmbed(interaction.guild)],
            components: [row],
        });

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            time: 15 * 60 * 1000,
        });

        collector.on('collect', async (componentInteraction) => {
            if (componentInteraction.user.id !== interaction.user.id) {
                return componentInteraction.reply({
                    content: '❌ Dieses Channel-Menü gehört jemand anderem.',
                    ephemeral: true,
                });
            }

            try {
                const action = componentInteraction.values?.[0];

                // =========================
                // CHANNEL ERSTELLEN
                // =========================
                if (action === 'create') {
                    const typeMenu = new StringSelectMenuBuilder()
                        .setCustomId(`channel_type_${interaction.user.id}`)
                        .setPlaceholder('📂 Channel-Typ auswählen...')
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Textchannel')
                                .setDescription('Einen normalen Textchannel erstellen')
                                .setEmoji('💬')
                                .setValue('text'),

                            new StringSelectMenuOptionBuilder()
                                .setLabel('Sprachchannel')
                                .setDescription('Einen Voicechannel erstellen')
                                .setEmoji('🔊')
                                .setValue('voice')
                        );

                    const typeRow = new ActionRowBuilder().addComponents(typeMenu);

                    await componentInteraction.reply({
                        content: '📂 **Welchen Channel-Typ möchtest du erstellen?**',
                        components: [typeRow],
                        ephemeral: true,
                    });

                    const typeMessage = await componentInteraction.fetchReply();

                    const typeCollector = typeMessage.createMessageComponentCollector({
                        time: 120000,
                    });

                    typeCollector.on('collect', async (typeInteraction) => {
                        if (typeInteraction.user.id !== interaction.user.id) {
                            return typeInteraction.reply({
                                content: '❌ Dieses Menü gehört jemand anderem.',
                                ephemeral: true,
                            });
                        }

                        const channelType = typeInteraction.values[0];

                        const modal = new ModalBuilder()
                            .setCustomId(`channel_create_modal_${channelType}_${interaction.user.id}`)
                            .setTitle('🍫 Channel erstellen');

                        const nameInput = new TextInputBuilder()
                            .setCustomId('channel_name')
                            .setLabel('Channel-Name')
                            .setPlaceholder('z. B. gaming')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(90);

                        const emojiInput = new TextInputBuilder()
                            .setCustomId('channel_emoji')
                            .setLabel('Emoji')
                            .setPlaceholder('z. B. 🎮')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(10);

                        modal.addComponents(
                            new ActionRowBuilder().addComponents(nameInput),
                            new ActionRowBuilder().addComponents(emojiInput)
                        );

                        await typeInteraction.showModal(modal);

                        const modalInteraction = await typeInteraction.awaitModalSubmit({
                            time: 120000,
                            filter: (i) => i.user.id === interaction.user.id,
                        }).catch(() => null);

                        if (!modalInteraction) return;

                        const rawName = modalInteraction.fields
                            .getTextInputValue('channel_name')
                            .trim();

                        const emoji = modalInteraction.fields
                            .getTextInputValue('channel_emoji')
                            .trim();

                        if (!rawName) {
                            return modalInteraction.reply({
                                content: '❌ Der Channel-Name darf nicht leer sein.',
                                ephemeral: true,
                            });
                        }

                        if (!emoji) {
                            return modalInteraction.reply({
                                content: '❌ Bitte gib ein Emoji ein.',
                                ephemeral: true,
                            });
                        }

                        // Discord Channelnamen dürfen keine Leerzeichen enthalten
                        const cleanName = rawName
                            .toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/[^a-z0-9äöüß\-_]/gi, '');

                        if (!cleanName) {
                            return modalInteraction.reply({
                                content: '❌ Der Channel-Name enthält keine gültigen Zeichen.',
                                ephemeral: true,
                            });
                        }

                        const finalName = channelName(emoji, cleanName);

                        // Kategorie auswählen
                        const categories = interaction.guild.channels.cache
                            .filter((channel) => channel.type === ChannelType.GuildCategory)
                            .first(25);

                        const categoryOptions = [];

                        categoryOptions.push(
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Keine Kategorie')
                                .setDescription('Channel direkt auf dem Server erstellen')
                                .setEmoji('📂')
                                .setValue('none')
                        );

                        for (const category of categories) {
                            categoryOptions.push(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(category.name.slice(0, 100))
                                    .setDescription('Channel in dieser Kategorie erstellen')
                                    .setEmoji('📁')
                                    .setValue(category.id)
                            );
                        }

                        const categoryMenu = new StringSelectMenuBuilder()
                            .setCustomId(`channel_category_${interaction.user.id}`)
                            .setPlaceholder('📁 Kategorie auswählen...')
                            .addOptions(categoryOptions);

                        const categoryRow = new ActionRowBuilder()
                            .addComponents(categoryMenu);

                        await modalInteraction.reply({
                            content:
                                `✅ **Einstellungen übernommen!**\n\n` +
                                `**Name:** \`${finalName}\`\n` +
                                `**Typ:** ${channelType === 'text' ? '💬 Textchannel' : '🔊 Sprachchannel'}\n\n` +
                                `📁 Wähle jetzt die Kategorie:`,
                            components: [categoryRow],
                            ephemeral: true,
                        });

                        const categoryMessage = await modalInteraction.fetchReply();

                        const categoryCollector = categoryMessage.createMessageComponentCollector({
                            time: 120000,
                        });

                        categoryCollector.on('collect', async (categoryInteraction) => {
                            if (categoryInteraction.user.id !== interaction.user.id) {
                                return categoryInteraction.reply({
                                    content: '❌ Dieses Menü gehört jemand anderem.',
                                    ephemeral: true,
                                });
                            }

                            const categoryId = categoryInteraction.values[0];

                            const category =
                                categoryId === 'none'
                                    ? null
                                    : interaction.guild.channels.cache.get(categoryId);

                            try {
                                const createdChannel =
                                    await interaction.guild.channels.create({
                                        name: finalName,
                                        type:
                                            channelType === 'text'
                                                ? ChannelType.GuildText
                                                : ChannelType.GuildVoice,
                                        parent: category?.id ?? null,
                                        reason: `Channel erstellt von ${interaction.user.tag}`,
                                    });

                                const successEmbed = new EmbedBuilder()
                                    .setTitle('✅ Channel erfolgreich erstellt')
                                    .setDescription(
                                        `Der Channel wurde erfolgreich erstellt.\n\n` +
                                        `📌 **Name:** ${createdChannel}\n` +
                                        `🏷️ **Anzeigename:** \`${finalName}\`\n` +
                                        `📂 **Typ:** ${
                                            channelType === 'text'
                                                ? '💬 Textchannel'
                                                : '🔊 Sprachchannel'
                                        }\n` +
                                        `📁 **Kategorie:** ${
                                            category ? category.name : 'Keine'
                                        }`
                                    )
                                    .setFooter({
                                        text: 'EMics System🍫 • Channel Manager',
                                    })
                                    .setTimestamp();

                                await categoryInteraction.update({
                                    content: '',
                                    embeds: [successEmbed],
                                    components: [],
                                });

                                categoryCollector.stop();
                            } catch (error) {
                                console.error('Channel create error:', error);

                                await categoryInteraction.update({
                                    content:
                                        '❌ **Der Channel konnte nicht erstellt werden.**\n\n' +
                                        'Bitte überprüfe, ob der Bot die Berechtigung **Kanäle verwalten** besitzt.',
                                    components: [],
                                });
                            }
                        });

                        typeCollector.stop();
                    });

                    return;
                }

                // =========================
                // CHANNEL AUSWÄHLEN
                // =========================

                const channelMenu = new StringSelectMenuBuilder()
                    .setCustomId(`channel_select_${action}_${interaction.user.id}`)
                    .setPlaceholder('📌 Channel auswählen...');

                const channels = interaction.guild.channels.cache
                    .filter(
                        (channel) =>
                            channel.type === ChannelType.GuildText ||
                            channel.type === ChannelType.GuildVoice
                    )
                    .first(25);

                for (const channel of channels) {
                    channelMenu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(channel.name.slice(0, 100))
                            .setDescription(
                                channel.type === ChannelType.GuildText
                                    ? '💬 Textchannel'
                                    : '🔊 Sprachchannel'
                            )
                            .setEmoji(
                                channel.type === ChannelType.GuildText
                                    ? '💬'
                                    : '🔊'
                            )
                            .setValue(channel.id)
                    );
                }

                const channelRow = new ActionRowBuilder().addComponents(channelMenu);

                await componentInteraction.reply({
                    content: '📌 **Welchen Channel möchtest du bearbeiten?**',
                    components: [channelRow],
                    ephemeral: true,
                });

                const selectMessage = await componentInteraction.fetchReply();

                const selectCollector = selectMessage.createMessageComponentCollector({
                    time: 120000,
                });

                selectCollector.on('collect', async (selectInteraction) => {
                    if (selectInteraction.user.id !== interaction.user.id) {
                        return;
                    }

                    const selectedChannel =
                        interaction.guild.channels.cache.get(
                            selectInteraction.values[0]
                        );

                    if (!selectedChannel) {
                        return selectInteraction.update({
                            content: '❌ Dieser Channel existiert nicht mehr.',
                            components: [],
                        });
                    }

                    // =========================
                    // LÖSCHEN
                    // =========================

                    if (action === 'delete') {
                        await selectedChannel.delete(
                            `Gelöscht von ${interaction.user.tag}`
                        );

                        return selectInteraction.update({
                            content: `🗑️ **${selectedChannel.name}** wurde erfolgreich gelöscht.`,
                            components: [],
                        });
                    }

                    // =========================
                    // LOCK
                    // =========================

                    if (action === 'lock') {
                        if (selectedChannel.type !== ChannelType.GuildText) {
                            return selectInteraction.update({
                                content: '❌ Nur Textchannels können gesperrt werden.',
                                components: [],
                            });
                        }

                        await selectedChannel.permissionOverwrites.edit(
                            interaction.guild.roles.everyone,
                            {
                                SendMessages: false,
                            }
                        );

                        return selectInteraction.update({
                            content: `🔒 **${selectedChannel.name}** wurde gesperrt.`,
                            components: [],
                        });
                    }

                    // =========================
                    // UNLOCK
                    // =========================

                    if (action === 'unlock') {
                        if (selectedChannel.type !== ChannelType.GuildText) {
                            return selectInteraction.update({
                                content: '❌ Nur Textchannels können entsperrt werden.',
                                components: [],
                            });
                        }

                        await selectedChannel.permissionOverwrites.edit(
                            interaction.guild.roles.everyone,
                            {
                                SendMessages: null,
                            }
                        );

                        return selectInteraction.update({
                            content: `🔓 **${selectedChannel.name}** wurde entsperrt.`,
                            components: [],
                        });
                    }

                    // =========================
                    // UMBENENNEN
                    // =========================

                    if (action === 'rename') {
                        const modal = new ModalBuilder()
                            .setCustomId(`channel_rename_${selectedChannel.id}_${interaction.user.id}`)
                            .setTitle('✏️ Channel bearbeiten');

                        const nameInput = new TextInputBuilder()
                            .setCustomId('new_name')
                            .setLabel('Neuer Channel-Name')
                            .setPlaceholder('z. B. gaming')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(90);

                        const emojiInput = new TextInputBuilder()
                            .setCustomId('new_emoji')
                            .setLabel('Neues Emoji')
                            .setPlaceholder('z. B. 🎮')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(10);

                        modal.addComponents(
                            new ActionRowBuilder().addComponents(nameInput),
                            new ActionRowBuilder().addComponents(emojiInput)
                        );

                        await selectInteraction.showModal(modal);

                        const renameModal =
                            await selectInteraction.awaitModalSubmit({
                                time: 120000,
                                filter: (i) =>
                                    i.user.id === interaction.user.id,
                            }).catch(() => null);

                        if (!renameModal) return;

                        const newName = renameModal.fields
                            .getTextInputValue('new_name')
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/[^a-z0-9äöüß\-_]/gi, '');

                        const newEmoji = renameModal.fields
                            .getTextInputValue('new_emoji')
                            .trim();

                        if (!newName || !newEmoji) {
                            return renameModal.reply({
                                content:
                                    '❌ Name und Emoji müssen ausgefüllt werden.',
                                ephemeral: true,
                            });
                        }

                        const finalName = channelName(newEmoji, newName);

                        await selectedChannel.setName(
                            finalName,
                            `Umbenannt von ${interaction.user.tag}`
                        );

                        return renameModal.reply({
                            content:
                                `✅ Channel erfolgreich geändert!\n\n` +
                                `📌 Neuer Name: \`${finalName}\``,
                            ephemeral: true,
                        });
                    }
                });

                selectCollector.on('end', () => {
                    // Menü läuft automatisch ab.
                });
            } catch (error) {
                console.error('Channel manager error:', error);

                if (!componentInteraction.replied) {
                    await componentInteraction.reply({
                        content:
                            '❌ Es ist ein unerwarteter Fehler aufgetreten.',
                        ephemeral: true,
                    });
                }
            }
        });

        collector.on('end', async () => {
            try {
                await interaction.editReply({
                    components: [],
                });
            } catch {
                // Nachricht wurde möglicherweise bereits gelöscht.
            }
        });
    },
};
```
