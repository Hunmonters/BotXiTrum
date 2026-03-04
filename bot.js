require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  Events
} = require('discord.js');
const axios = require('axios');
const translate = require('google-translate-api-x');
const YouTube = require('youtube-sr').default;

// Hàm dịch sang tiếng Việt
async function toVietnamese(text) {
  try {
    const res = await translate(text, { from: 'en', to: 'vi' });
    return res.text;
  } catch {
    return text; // nếu dịch lỗi thì giữ nguyên
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ─── ERROR HANDLERS ───────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// ─── GRACEFUL SHUTDOWN cho Railway ──────────────────────────────
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received. Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received. Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// ─── Đăng ký Slash Commands ───────────────────────────────────────
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot đã online: ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Kiểm tra bot còn sống không'),
    new SlashCommandBuilder()
      .setName('steam')
      .setDescription('Tìm game trên Steam — hiện ảnh, giá, giảm giá, mô tả, trailer')
      .addStringOption(opt =>
        opt.setName('game')
          .setDescription('Tên game cần tìm')
          .setRequired(true)
      )
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands.map(c => c.toJSON())
    });
    console.log('✅ Đã đăng ký slash commands');
  } catch (err) {
    console.error('❌ Lỗi đăng ký slash commands:', err);
  }
});

// ─── Xử lý Slash Commands ────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // /ping
    if (interaction.commandName === 'ping') {
      const sent = await interaction.reply({ content: '🏓 Đang đo...', fetchReply: true });
      const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
      const ws = client.ws.ping;
      return interaction.editReply(`🏓 Pong! **${roundtrip}ms** (API) | **${ws}ms** (WebSocket)`);
    }

    // /steam <game>
    if (interaction.commandName === 'steam') {
      const game = interaction.options.getString('game');
      await interaction.deferReply(); // chờ fetch API

      try {
        // 1️⃣ Tìm game qua Steam Store Search
        const search = await axios.get(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(game)}&l=vietnamese&cc=vn`,
          { timeout: 10000 }
        );

        if (!search.data.items || !search.data.items.length) {
          return interaction.editReply('❌ Không tìm thấy game nào khớp.');
        }

        const appId = search.data.items[0].id;

        // 2️⃣ Lấy chi tiết game (giá, mô tả, ảnh, trailer…)
        const detail = await axios.get(
          `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=vn&l=vietnamese`,
          { timeout: 10000 }
        );

        const info = detail.data[appId];
        if (!info || !info.success) {
          return interaction.editReply('❌ Không lấy được thông tin game.');
        }

        const data = info.data;

        // ── Giá & giảm giá ──
        let priceText = '🆓 **Free to Play**';
        let discountText = '';
        if (data.price_overview) {
          const p = data.price_overview;
          if (p.discount_percent > 0) {
            discountText = `~~${p.initial_formatted}~~ → **${p.final_formatted}**`;
            priceText = `🔥 **-${p.discount_percent}%**  ${discountText}`;
          } else {
            priceText = `💵 **${p.final_formatted}**`;
          }
        }

        // ── Mô tả ngắn (dịch sang tiếng Việt) ──
        let descRaw = data.short_description || 'Không có mô tả.';
        if (descRaw.length > 300) descRaw = descRaw.slice(0, 297) + '...';
        const desc = await toVietnamese(descRaw);

        // ── Thể loại (dịch sang tiếng Việt) ──
        const genresRaw = (data.genres || []).map(g => g.description).join(', ') || 'N/A';
        const genres = await toVietnamese(genresRaw);

        // ── Nhà phát triển ──
        const devs = (data.developers || []).join(', ') || 'N/A';

        // ── Ngày phát hành ──
        const release = data.release_date?.date || 'TBA';

        // ── Đánh giá (Metacritic) ──
        const meta = data.metacritic
          ? `⭐ **${data.metacritic.score}/100** [Metacritic](${data.metacritic.url})`
          : '⭐ Chưa có đánh giá Metacritic';

        // ── Ảnh header ──
        const headerImg = data.header_image || '';

        // ── Screenshot ──
        const screenshot = data.screenshots?.[0]?.path_full || '';

        // ── Build Embed ──
        const embed = new EmbedBuilder()
          .setTitle(data.name || 'Unknown Game')
          .setDescription(desc)
          .setColor('#0099ff')
          .addFields(
            { name: '💰 Giá', value: priceText, inline: true },
            { name: '🎮 Thể loại', value: genres, inline: true },
            { name: '👨‍💻 Nhà phát triển', value: devs, inline: true },
            { name: '📅 Ngày phát hành', value: release, inline: true },
            { name: '📊 Đánh giá', value: meta, inline: true },
            { name: '🔗 Link Steam', value: `[Xem trên Steam](https://store.steampowered.com/app/${appId})`, inline: true }
          )
          .setImage(screenshot || headerImg)
          .setThumbnail(headerImg)
          .setFooter({ text: `Steam App ID: ${appId}` })
          .setTimestamp();

        // ── Buttons ──
        const buttons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel('🛒 Mở Steam')
              .setURL(`https://store.steampowered.com/app/${appId}`),
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel('📊 SteamDB')
              .setURL(`https://steamdb.info/app/${appId}`)
          );

        // Gửi embed chính
        await interaction.editReply({
          embeds: [embed],
          components: [buttons]
        });

        // Tìm trailer YouTube và gửi tách riêng để Discord tự embed video
        try {
          const ytResults = await YouTube.search(`${data.name} official trailer`, { limit: 1, type: 'video' });
          if (ytResults.length > 0) {
            const videoUrl = `https://www.youtube.com/watch?v=${ytResults[0].id}`;
            await interaction.followUp({
              content: `**Trailer — ${data.name}**\n${videoUrl}`
            });
          }
        } catch (ytError) {
          console.error('YouTube search error:', ytError.message);
        }

      } catch (steamError) {
        console.error('Steam API Error:', steamError.message);
        return interaction.editReply('❌ Lỗi khi truy cập Steam API. Vui lòng thử lại sau.');
      }
    }
  } catch (error) {
    console.error('Interaction Error:', error);
    const errorMsg = '❌ Đã có lỗi xảy ra khi xử lý lệnh.';
    
    if (interaction.deferred) {
      await interaction.editReply(errorMsg).catch(console.error);
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true }).catch(console.error);
    }
  }
});

// ─── ERROR HANDLERS cho Discord client ─────────────────────────
client.on('error', (error) => {
  console.error('Discord Client Error:', error);
});

client.on('warn', (info) => {
  console.warn('Discord Client Warning:', info);
});

client.on('disconnect', () => {
  console.log('Discord client disconnected');
});

client.on('reconnecting', () => {
  console.log('Discord client reconnecting...');
});

// ─── LOGIN ─────────────────────────────────────────────────────
async function startBot() {
  try {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN không tồn tại trong biến môi trường');
    }
    
    console.log('🔄 Đang khởi động bot...');
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Không thể khởi động bot:', error.message);
    process.exit(1);
  }
}

// ─── Khởi động bot ──────────────────────────────────────────────
startBot();

// ─── Keep alive cho Railway (optional) ────────────────────────
const keepAlive = () => {
  console.log('🔄 Bot vẫn hoạt động...');
};

// Log mỗi 30 phút để Railway biết bot còn sống
setInterval(keepAlive, 1800000); // 30 minutes