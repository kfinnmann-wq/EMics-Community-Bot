from pathlib import Path

code = r'''import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";

const ALLOWED_TYPES = {
  text: {
    channelType: ChannelType.GuildText,
    label: "Textkanal",
  },
  voice: {
    channelType: ChannelType.GuildVoice,
    label: "Sprachkanal",
  },
  announcement: {
    channelType: ChannelType.GuildAnnouncement,
    label: "Ankündigungskanal",
  },
  forum: {
    channelType: ChannelType.GuildForum,
    label: "Forum",
  },
  stage: {
    channelType: ChannelType.GuildStageVoice,
    label: "Bühnenkanal",
  },
};

function cleanEmoji(emoji) {
  return String(emoji || "").trim().replace(/\s+/g, " ");
}

function cleanChannelName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    // Discord channel names should not contain spaces.
    .replace(/\s+/g, "-")
    // Keep letters, numbers, Unicode characters, emojis and common separators.
    .replace(/[#@:`"']/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function buildChannelName(emoji, name) {
  const safeEmoji = cleanEmoji(emoji);
  const safeName = cleanChannelName(name);

  // Requested format: ⌊🦶⌉ᴇᴜʀᴇ-ꜰüßᴇ
  const result = `⌊${safeEmoji}⌉${safeName}`;

  // Discord channel names have a maximum length of 100 characters.
  return result.slice(0, 100);
}

export const data = new SlashCommandBuilder()
  .setName("channel")
  .setDescription("Erstellt einen neuen Kanal mit einem einheitlichen Namen.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false)

  // First selection: what kind of channel should be created?
  .addStringOption((option) =>
    option
      .setName("typ")
      .setDescription("Welche Art von Kanal möchtest du erstellen?")
      .setRequired(true)
      .addChoices(
        { name: "📝 Textkanal", value: "text" },
        { name: "🔊 Sprachkanal", value: "voice" },
        { name: "📢 Ankündigungskanal", value: "announcement" },
        { name: "💬 Forum", value: "forum" },
        { name: "🎙️ Bühnenkanal", value: "stage" },
      ),
  )

  // Discord automatically shows the server's categories here.
  .addChannelOption((option) =>
    option
      .setName("kategorie")
      .setDescription("Unter welcher Kategorie soll der Kanal erstellt werden?")
      .addChannelTypes(ChannelType.GuildCategory)
      .setRequired(true),
  )

  .addStringOption((option) =>
    option
      .setName("emoji")
      .setDescription("Emoji für den Kanal, z. B. 🦶")
      .setRequired(true)
      .setMaxLength(32),
  )

  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("Der Name hinter dem Emoji, z. B. eure-füße")
      .setRequired(true)
      .setMaxLength(90),
  );

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({
      content: "❌ Dieser Befehl kann nur auf einem Server verwendet werden.",
      ephemeral: true,
    });
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({
      content: "❌ Du brauchst die Berechtigung **Kanäle verwalten**.",
      ephemeral: true,
    });
  }

  const typeKey = interaction.options.getString("typ", true);
  const category = interaction.options.getChannel("kategorie", true);
  const emoji = interaction.options.getString("emoji", true);
  const requestedName = interaction.options.getString("name", true);

  const typeConfig = ALLOWED_TYPES[typeKey];

  if (!typeConfig) {
    return interaction.reply({
      content: "❌ Dieser Kanaltyp wird nicht unterstützt.",
      ephemeral: true,
    });
  }

  if (category.type !== ChannelType.GuildCategory) {
    return interaction.reply({
      content: "❌ Bitte wähle eine gültige Kategorie aus.",
      ephemeral: true,
    });
  }

  const channelName = buildChannelName(emoji, requestedName);

  if (!cleanEmoji(emoji)) {
    return interaction.reply({
      content: "❌ Bitte gib ein Emoji ein.",
      ephemeral: true,
    });
  }

  if (!cleanChannelName(requestedName)) {
    return interaction.reply({
      content: "❌ Bitte gib einen gültigen Kanalnamen ein.",
      ephemeral: true,
    });
  }

  // Make sure the bot can actually create/manage channels.
  const me = interaction.guild.members.me;

  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({
      content:
        "❌ Mir fehlt die Berechtigung **Kanäle verwalten**. Gib dem Bot diese Berechtigung und versuche es erneut.",
      ephemeral: true,
    });
  }

  try {
    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: typeConfig.channelType,
      parent: category.id,
      reason: `Kanal über /channel erstellt von ${interaction.user.tag}`,
    });

    return interaction.reply({
      content:
        `✅ **Kanal erstellt!**\n` +
        `> Typ: **${typeConfig.label}**\n` +
        `> Kategorie: ${category}\n` +
        `> Name: ${channel}\n\n` +
        `📋 Kanalname: \`${channelName}\``,
      ephemeral: false,
    });
  } catch (error) {
    console.error("Fehler beim Erstellen eines Kanals:", error);

    return interaction.reply({
      content:
        "❌ Der Kanal konnte nicht erstellt werden. Prüfe, ob der Bot **Kanäle verwalten** darf und ob seine Rolle hoch genug steht.",
      ephemeral: true,
    });
  }
}

export default {
  data,
  execute,
};
'''

path = Path("/mnt/data/channel.js")
path.write_text(code, encoding="utf-8")
print(f"Erstellt: {path}")