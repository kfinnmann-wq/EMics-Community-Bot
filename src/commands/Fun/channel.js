```js
import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Erstellt und verwaltet Server-Channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    category: 'Utility',

    async execute(interaction, config, client) {

        // Berechtigung prüfen
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ Du benötigst die Berechtigung **Kanäle verwalten**.',
                ephemeral: true,
            });
        }

        // Hauptmenü
        const embed = new EmbedBuilder()
            .setTitle('🍫 EMics System • Channel Manager')
            .setDescription(
                'Hier kannst du deine Server-Channels verwalten.\n\n' +
                'Wähle eine Aktion aus dem Menü:'
            )
            .addFields(
                {
                    name: '➕ Erstellen',
                    value: 'Neue Text- oder Voice-Channels erstellen.',
                    inline: true,
                },
                {
                    name: '✏️ Bearbeiten',
                    value: 'Name und Emoji eines Channels ändern.',
                    inline: true,
                },
                {
                    name: '🔒 Verwaltung',
                    value: 'Channels sperren oder entsperren.',
                    inline: true,
                },
                {
                    name: '🗑️ Löschen',
                    value: 'Channels entfernen.',
                    inline: true,
                },
            )
            .setFooter({
                text: `${interaction.guild.name} • EMics System🍫`,
            })
            .setTimestamp();

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`channel_main_${interaction.user.id}`)
            .setPlaceholder('⚙️ Aktion auswählen...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel erstellen')
                    .setDescription('Einen neuen Channel erstellen')
                    .setEmoji('➕')
                    .setValue('create'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel bearbeiten')
                    .setDescription('Name und Emoji ändern')
                    .setEmoji('✏️')
                    .setValue('edit'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel sperren')
                    .setDescription('Textchannel für Mitglieder sperren')
                    .setEmoji('🔒')
                    .setValue('lock'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel entsperren')
                    .setDescription('Einen gesperrten Textchannel freigeben')
                    .setEmoji('🔓')
                    .setValue('unlock'),

                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel löschen')
                    .setDescription('Einen Channel dauerhaft löschen')
                    .setEmoji('🗑️')
                    .setValue('delete'),
            );

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.reply({
            embeds: [embed],
            components: [row],
        });

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            time: 10 * 60 * 1000,
        });

        collector.on('collect', async (menuInteraction) => {

            // Nur der Ersteller darf das Menü benutzen
            if (menuInteraction.user.id !== interaction.user.id) {
                return menuInteraction.reply({
                    content: '❌ Dieses Menü wurde von jemand anderem geöffnet.',
                    ephemeral: true,
                });
            }

            const action = menuInteraction.values[0];

            // ==========================================
            // CHANNEL ERSTELLEN
            // ==========================================

            if (action === 'create') {

                const typeMenu = new StringSelectMenuBuilder()
                    .setCustomId(`channel_type_${interaction.user.id}`)
                    .setPlaceholder('📂 Channel-Typ auswählen...')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Textchannel')
                            .setDescription('Normaler Textchannel')
                            .setEmoji('💬')
                            .setValue('text'),

                        new StringSelectMenuOptionBuilder()
                            .setLabel('Sprachchannel')
                            .setDescription('Voicechannel')
                            .setEmoji('🔊')
                            .setValue('voice'),
                    );

                const typeRow = new ActionRowBuilder().addComponents(typeMenu);

                await menuInteraction.reply({
                    content: '📂 **Welchen Channel möchtest du erstellen?**',
                    components: [typeRow],
                    ephemeral: true,
                });

                const typeMessage = await menuInteraction.fetchReply();

                const typeCollector = typeMessage.createMessageComponentCollector({
                    time: 120000,
                });

                typeCollector.on('collect', async (typeInteraction) => {

                    if (typeInteraction.user.id !== interaction.user.id) {
                        return;
                    }

                    const selectedType = typeInteraction.values[0];

                    // ==========================================
                    // MODAL
                    // ==========================================

                    const modal = new ModalBuilder()
                        .setCustomId(
                            `channel_create_${selectedType}_${interaction.user.id}`
                        )
                        .setTitle('🍫 Channel erstellen');

                    const nameInput = new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('Channel-Name')
                        .setPlaceholder('z. B. gaming')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(70);

                    const emojiInput = new TextInputBuilder()
                        .setCustomId('emoji')
                        .setLabel('Emoji')
                        .setPlaceholder('z. B. 🎮')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(10);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(nameInput),
                        new ActionRowBuilder().addComponents(emojiInput),
                    );

                    await typeInteraction.showModal(modal);

                    const modalInteraction =
                        await typeInteraction.awaitModalSubmit({
                            time: 120000,
                            filter: (i) =>
                                i.user.id === interaction.user.id,
                        }).catch(() => null);

                    if (!modalInteraction) return;

                    let name = modalInteraction.fields
                        .getTextInputValue('name')
                        .trim()
                        .toLowerCase();

                    const emoji = modalInteraction.fields
                        .getTextInputValue('emoji')
                        .trim();

                    if (!name || !emoji) {
                        return modalInteraction.reply({
                            content: '❌ Name und Emoji müssen angegeben werden.',
                            ephemeral: true,
                        });
                    }

                    // Discord-konformer Name
                    name = name
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9äöüß\-_]/gi, '');

                    if (!name) {
                        return modalInteraction.reply({
                            content: '❌ Der Channel-Name ist ungültig.',
                            ephemeral: true,
                        });
                    }

                    // Deine feste Formatierung
                    const finalName = `⌊${emoji}⌉${name}`;

                    // ==========================================
                    // KATEGORIE
                    // ==========================================

                    const categories = interaction.guild.channels.cache
                        .filter(
                            (channel) =>
                                channel.type === ChannelType.GuildCategory
                        )
                        .first(25);

                    const options = [
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Keine Kategorie')
                            .setDescription('Channel ohne Kategorie erstellen')
                            .setEmoji('📂')
                            .setValue('none'),
                    ];

                    for (const category of categories) {
                        options.push(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(category.name.slice(0, 100))
                                .setDescription('Channel in dieser Kategorie')
                                .setEmoji('📁')
                                .setValue(category.id),
                        );
                    }

                    const categoryMenu = new StringSelectMenuBuilder()
                        .setCustomId(`channel_category_${interaction.user.id}`)
                        .setPlaceholder('📁 Kategorie auswählen...')
                        .addOptions(options);

                    const categoryRow = new ActionRowBuilder()
                        .addComponents(categoryMenu);

                    await modalInteraction.reply({
                        content:
                            `✅ **Channel-Einstellungen gespeichert!**\n\n` +
                            `🏷️ Name: \`${finalName}\`\n` +
                            `📂 Typ: ${
                                selectedType === 'text'
                                    ? '💬 Textchannel'
                                    : '🔊 Sprachchannel'
                            }\n\n` +
                            `Wähle jetzt die Kategorie:`,
                        components: [categoryRow],
                        ephemeral: true,
                    });

                    const categoryMessage =
                        await modalInteraction.fetchReply();

                    const categoryCollector =
                        categoryMessage.createMessageComponentCollector({
                            time: 120000,
                        });

                    categoryCollector.on(
                        'collect',
                        async (categoryInteraction) => {

                            if (
                                categoryInteraction.user.id !==
                                interaction.user.id
                            ) {
                                return;
                            }

                            const categoryId =
                                categoryInteraction.values[0];

                            const parent =
                                categoryId === 'none'
                                    ? null
                                    : interaction.guild.channels.cache.get(
                                          categoryId
                                      );

                            try {

                                const channel =
                                    await interaction.guild.channels.create({
                                        name: finalName,

                                        type:
                                            selectedType === 'text'
                                                ? ChannelType.GuildText
                                                : ChannelType.GuildVoice,

                                        parent: parent?.id ?? null,

                                        reason:
                                            `Channel erstellt von ${interaction.user.tag}`,
                                    });

                                const successEmbed = new EmbedBuilder()
                                    .setTitle('✅ Channel erstellt')
                                    .setDescription(
                                        `Der Channel wurde erfolgreich erstellt!\n\n` +
                                        `📌 **Channel:** ${channel}\n` +
                                        `🏷️ **Name:** \`${finalName}\`\n` +
                                        `📁 **Kategorie:** ${
                                            parent
                                                ? parent.name
                                                : 'Keine Kategorie'
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

                                console.error(
                                    'Channel creation error:',
                                    error
                                );

                                await categoryInteraction.update({
                                    content:
                                        '❌ **Channel konnte nicht erstellt werden.**\n\n' +
                                        'Der Bot benötigt die Berechtigung **Kanäle verwalten**.',
                                    components: [],
                                });
                            }
                        }
                    );

                    typeCollector.stop();
                });

                return;
            }

            // ==========================================
            // NOCH NICHT IMPLEMENTIERTE FUNKTIONEN
            // ==========================================

            const names = {
                edit: '✏️ Channel bearbeiten',
                lock: '🔒 Channel sperren',
                unlock: '🔓 Channel entsperren',
                delete: '🗑️ Channel löschen',
            };

            await menuInteraction.reply({
                content:
                    `${names[action]}\n\n🛠️ Diese Funktion kommt als nächster Schritt.`,
                ephemeral: true,
            });
        });

        collector.on('end', async () => {
            try {
                await interaction.editReply({
                    components: [],
                });
            } catch {
                // Nachricht existiert eventuell nicht mehr.
            }
        });
    },
};
```
