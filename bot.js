import { Client, GatewayIntentBits, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import axios from 'axios';
import { storage } from './storage';
import { OpenAI } from "openai";
import QuickChart from 'quickchart-js';

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = "1446846255572451399";
const ADMIN_ID = "689301671758528512";

// Initialize OpenAI client using Replit AI integration
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Global client instance
let client: Client | null = null;
let lastMessageIds: string[] = [];

export async function initBot() {
  if (client) return client;

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ]
  });

  client.once('ready', async () => {
    console.log(`Logged in as ${client?.user?.tag}!`);
    // Ensure admin is whitelisted
    await storage.whitelistUser({ userId: ADMIN_ID, addedBy: "SYSTEM" });
    fetchAndPostStatus(true);
    setInterval(() => fetchAndPostStatus(), 5 * 60 * 1000);
    
    // Log member stats more frequently for testing and better resolution
    setInterval(async () => {
      if (!client) return;
      for (const [id, guild] of client.guilds.cache) {
        try {
          const latestStats = await storage.getMemberStats(id, new Date(Date.now() - 60 * 60 * 1000));
          const lastCount = latestStats.length > 0 ? latestStats[latestStats.length - 1].memberCount : -1;
          
          if (guild.memberCount !== lastCount) {
            await storage.logMemberCount({
              guildId: id,
              memberCount: guild.memberCount
            });
            console.log(`Logged new member count for ${guild.name}: ${guild.memberCount}`);
          }
        } catch (e) {
          console.error(`Failed to log member count for guild ${id}:`, e);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Whitelist check
    const isWhitelisted = await storage.isWhitelisted(message.author.id);
    const isAdmin = message.author.id === ADMIN_ID;

    if (message.content.startsWith('!whitelist')) {
      if (!isAdmin) return message.reply("Only the bot admin can manage the whitelist.");
      const args = message.content.split(' ');
      if (args.length < 2) return message.reply("Usage: !whitelist (user_id)");
      const targetId = args[1].replace(/[<@!>]/g, '');
      await storage.whitelistUser({ userId: targetId, addedBy: message.author.id });
      return message.reply(`User <@${targetId}> has been whitelisted.`);
    }

    if (message.content.startsWith('!unwhitelist')) {
      if (!isAdmin) return message.reply("Only the bot admin can manage the whitelist.");
      const args = message.content.split(' ');
      if (args.length < 2) return message.reply("Usage: !unwhitelist (user_id)");
      const targetId = args[1].replace(/[<@!>]/g, '');
      if (targetId === ADMIN_ID) return message.reply("You cannot unwhitelist the admin.");
      await storage.unwhitelistUser(targetId);
      return message.reply(`User <@${targetId}> has been removed from the whitelist.`);
    }

    if (!isWhitelisted && !isAdmin) return;
    
    if (message.content === '!reloadets') {
      const reply = await message.reply("Scanning for latest executor information...");
      await fetchAndPostStatus(true);
      await reply.edit("Data reloaded!");
      setTimeout(() => reply.delete().catch(() => {}), 3000);
    }

    if (message.content === '!loader') {
      const loaderEmbed = new EmbedBuilder()
        .setTitle('Carbon Studios Loader')
        .setColor(0xFF0000)
        .setDescription('```lua\nloadstring(game:HttpGet("https://raw.githubusercontent.com/CStudios-Dev/csLoader.lua/main/CSLoader.lua"))()\n```\n\n**Mobile Copy**\n\n• The \'Mobile Copy\' button makes it easier to copy your key on mobile devices.\n\n**Supported Games**\n• 99 Nights\n• MM2\n• Blox Fruits\n• The Forge\n• Forsaken')
        .setThumbnail('https://cdn.discordapp.com/attachments/1424784310418014360/1456699055244710094/Screenshot_2026-01-03-01-19-35-95_680d03679600f7af0b4c700c6b270fe7.jpg');

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('mobile_copy')
            .setLabel('Mobile Copy')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📞')
        );

      await message.reply({ embeds: [loaderEmbed], components: [row] });
    }

    if (message.content === '!membergt') {
      if (!message.guild) return;
      const stats = await storage.getMemberStats(message.guild.id, new Date(Date.now() - 24 * 60 * 60 * 1000));
      
      if (stats.length < 2) {
        await storage.logMemberCount({ guildId: message.guild.id, memberCount: message.guild.memberCount });
        return message.reply("Wait for more data points!");
      }

      try {
        const chart = new QuickChart();
        chart.setConfig({
          type: 'line',
          data: {
            labels: stats.map(s => s.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
            datasets: [{
              label: 'Member Count',
              data: stats.map(s => s.memberCount),
              fill: true,
              backgroundColor: 'rgba(128, 0, 128, 0.1)',
              borderColor: 'rgb(128, 0, 128)',
              tension: 0.1,
              pointRadius: 2
            }]
          },
          options: {
            title: { display: true, text: `${message.guild.name} Member Growth (Last 24h)` },
            scales: { yAxes: [{ ticks: { beginAtZero: false, precision: 0 } }] }
          }
        });

        const url = await chart.getShortUrl();
        const embed = new EmbedBuilder()
          .setTitle('📈 Member Growth Tracker')
          .setDescription(`Current members: **${message.guild.memberCount}**`)
          .setImage(url)
          .setColor(0x800080)
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (e) {
        await message.reply("Failed to generate the growth chart.");
      }
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'mobile_copy') {
      await interaction.reply({
        content: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/CStudios-Dev/csLoader.lua/main/CSLoader.lua"))()',
        ephemeral: true
      });
    }
  });

  try {
    await client.login(TOKEN);
  } catch (error) {
    console.error("Failed to login to Discord:", error);
  }

  return client;
}

export async function fetchAndPostStatus(force = false) {
  if (!client) return;
  // (Rest of the status fetching and formatting logic...)
}

function formatVerifiedList(items: any[]) {
    return items.map((x: any) => {
      let emoji = "⚪";
      if (x.status === "Updated") emoji = "🟢";
      if (x.status === "Down/Updating") emoji = "⚫";
      const link = x.discordlink ? ` [Discord](${x.discordlink})` : "";
      return `${emoji} **${x.title}**${link}\n`;
    }).join('\n').slice(0, 1024) || "None";
}

function determineStatus(item: any): string {
    if (item.updateStatus === false) return "Down/Updating";
    return "Updated";
}
