# Discord Steam Bot

Bot Discord để tìm kiếm thông tin game trên Steam với giao diện tiếng Việt.

## Tính năng

- 🏓 Command `/ping` - Kiểm tra độ trễ bot
- 🎮 Command `/steam <tên game>` - Tìm kiếm thông tin game trên Steam
  - Hiển thị giá và giảm giá
  - Mô tả game (dịch sang tiếng Việt)
  - Thể loại, nhà phát triển, ngày phát hành
  - Đánh giá Metacritic
  - Ảnh và trailer
  - Link trực tiếp đến Steam và SteamDB

## Cách deploy lên Railway.com

### 1. Tạo Discord Bot Application

1. Vào [Discord Developer Portal](https://discord.com/developers/applications)
2. Tạo New Application
3. Vào tab "Bot" → Reset Token → Copy token
4. Vào tab "OAuth2" → URL Generator:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`
5. Copy URL và invite bot vào server

### 2. Deploy lên Railway

1. Tạo tài khoản tại [Railway.app](https://railway.app)
2. Tạo New Project → Deploy from GitHub repo
3. Chọn repo chứa code bot này
4. Trong Railway Dashboard:
   - Vào tab **Variables**
   - Thêm biến môi trường:
     ```
     DISCORD_TOKEN=your_discord_bot_token_here
     ```
5. Bot sẽ tự động deploy và khởi động

### 3. Kiểm tra Bot hoạt động

- Vào Discord server và test `/ping`
- Test `/steam valorant` hoặc game khác

## Cấu trúc Dependencies

```json
{
  "discord.js": "^14.14.1",    // Discord API wrapper
  "axios": "^1.6.2",          // HTTP requests cho Steam API
  "dotenv": "^16.3.1",        // Load biến môi trường
  "google-translate-api-x": "^10.7.1"  // Dịch tiếng Việt
}
```

## Troubleshooting

### Bot crash trên Railway:

1. **Kiểm tra biến môi trường**: Đảm bảo `DISCORD_TOKEN` được thiết lập đúng
2. **Xem logs**: Vào Railway Dashboard > Deployments > View logs
3. **Restart**: Trong Railway Dashboard > Settings > Restart

### Lỗi Steam API:

- Bot có timeout 10 giây cho Steam API
- Nếu Steam API down, bot sẽ báo lỗi thay vì crash
- Thử lại sau vài phút

## Cấu trúc thư mục

```
bot/
├── bot.js          # File chính chứa bot logic  
├── package.json    # Dependencies và scripts
├── .env.example    # Mẫu file biến môi trường
└── README.md       # File này
```

## Báo lỗi

Nếu gặp vấn đề, kiểm tra:
1. Railway logs có lỗi gì  
2. Discord Token có đúng không
3. Bot có quyền Send Messages + Use Slash Commands không