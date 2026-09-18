
```js
import Parser from 'rss-parser';
import { EmbedBuilder } from 'discord.js';

const parser = new Parser();

// Hier werden die zuletzt bekannten Videos gespeichert.
// Dadurch wird dasselbe Video nicht mehrfach gepostet.
const lastVideos = new Map();

/**
 * Startet die Überwachung eines YouTube-Kanals.
 *
 * @param {object} client Discord Client
 * @param {string} guildId Discord Server ID
 * @param {string} channelId Discord Channel ID
 * @param {string} youtubeChannelId YouTube Channel ID
 */
export async function startYouTubeWatcher(
    client,
    guildId,
    channelId,
    youtubeChannelId
) {
    const feedUrl =
        `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelId}`;

    try {
        const feed = await parser.parseURL(feedUrl);

        if (!feed.items || feed.items.length === 0) {
            console.log(`[YouTube] Keine Videos gefunden: ${youtubeChannelId}`);
            return;
        }

        const latestVideo = feed.items[0];

        const lastVideoId = lastVideos.get(guildId);

        // Beim ersten Start nur speichern.
        // Dadurch wird nicht sofort ein altes Video gepostet.
        if (!lastVideoId) {
            lastVideos.set(guildId, latestVideo.id);
            console.log(`[YouTube] Überwachung gestartet für ${guildId}`);
            return;
        }

        // Kein neues Video
        if (latestVideo.id === lastVideoId) {
            return;
        }

        const discordChannel = await client.channels.fetch(channelId);

        if (!discordChannel) {
            console.log(`[YouTube] Discord-Kanal nicht gefunden: ${channelId}`);
            return;
        }

        const videoUrl = latestVideo.link;
        const videoTitle = latestVideo.title;
        const author = latestVideo.author || feed.title || 'YouTube';

        const embed = new EmbedBuilder()
            .setTitle(`🎬 Neues Video von ${author}`)
            .setDescription(`**${videoTitle}**`)
            .setURL(videoUrl)
            .setTimestamp();

        await discordChannel.send({
            embeds: [embed],
        });

        lastVideos.set(guildId, latestVideo.id);

        console.log(`[YouTube] Neues Video gepostet: ${videoTitle}`);
    } catch (error) {
        console.error('[YouTube] Fehler beim Abrufen des Feeds:', error);
    }
}

/**
 * Prüft alle eingerichteten YouTube-Kanäle.
 *
 * Diese Funktion wird später von deinem Bot regelmäßig aufgerufen.
 */
export async function checkYouTubeChannels(client, configurations) {
    for (const config of configurations) {
        await startYouTubeWatcher(
            client,
            config.guildId,
            config.channelId,
            config.youtubeChannelId
        );
    }
}
```
