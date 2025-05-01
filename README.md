# Media Management System with Discord Bot

This project is a full-stack system that includes a Discord bot and a web-based admin panel for managing movies and TV series. The system allows users to search for media content via Discord and receive stream/download links via DM.

## Features

### Admin Panel
- User authentication
- Add, edit, and delete movies and TV series
- Upload poster images and screenshots
- Manage episodes for TV series

### Discord Bot
- Search for movies and TV series
- View details and screenshots
- Receive stream and download links via DM

## Tech Stack

- **Frontend**: Next.js, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Discord Bot**: discord.js v14

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at [https://supabase.com](https://supabase.com)
2. Set up the database schema by running the following SQL in the Supabase SQL Editor:

\`\`\`sql
-- Create tables
CREATE TABLE movies (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  stream_link TEXT,
  download_link TEXT,
  screenshots TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE series (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE episodes (
  id UUID PRIMARY KEY,
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  episode INTEGER NOT NULL,
  title TEXT NOT NULL,
  stream_link TEXT,
  download_link TEXT,
  screenshots TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

-- Set up storage policies to allow authenticated access
CREATE POLICY "Media Storage Policy" ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'media');
\`\`\`

3. Create a user account in Supabase Authentication (Email/Password or OAuth)
4. Get your Supabase URL and API keys from the Supabase dashboard

### 2. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to the "Bot" tab and click "Add Bot"
4. Under the "Privileged Gateway Intents" section, enable:
   - Server Members Intent
   - Message Content Intent
5. Copy the bot token
6. Navigate to the "OAuth2" tab, select the "bot" scope and the following permissions:
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Use Slash Commands
7. Use the generated URL to invite the bot to your server

### 3. VPS Setup

1. Set up a VPS with Ubuntu (or your preferred Linux distribution)
2. Install Node.js (v16 or higher) and npm:
   \`\`\`bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   \`\`\`
3. Install PM2 for process management:
   \`\`\`bash
   npm install -g pm2
   \`\`\`
4. Clone this repository to your VPS:
   \`\`\`bash
   git clone <repository-url>
   cd <repository-directory>
   \`\`\`

### 4. Environment Variables

Create a `.env` file in the root directory with the following variables:

\`\`\`
# Next.js Admin Panel
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
\`\`\`

### 5. Running the Application

#### Admin Panel

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Build the Next.js application:
   \`\`\`bash
   npm run build
   \`\`\`

3. Start the application with PM2:
   \`\`\`bash
   pm2 start npm --name "admin-panel" -- start
   \`\`\`

#### Discord Bot

1. Navigate to the bot directory:
   \`\`\`bash
   cd bot
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Start the bot with PM2:
   \`\`\`bash
   pm2 start index.js --name "discord-bot"
   \`\`\`

4. Set up PM2 to start on system boot:
   \`\`\`bash
   pm2 startup
   pm2 save
   \`\`\`

## Example Data

Here's how to add example data to test the system:

### Example Movie

1. Log in to the admin panel
2. Navigate to "Movies" and click "Add Movie"
3. Fill in the following details:
   - Title: "The Matrix"
   - Description: "A computer hacker learns about the true nature of reality and his role in the war against its controllers."
   - Stream Link: "https://example.com/stream/matrix"
   - Download Link: "https://example.com/download/matrix"
   - Upload a poster image and some screenshots

### Example Series with Episodes

1. Log in to the admin panel
2. Navigate to "Series" and click "Add Series"
3. Fill in the following details:
   - Title: "Stranger Things"
   - Description: "When a young boy disappears, his mother, a police chief, and his friends must confront terrifying supernatural forces in order to get him back."
   - Upload a poster image
4. After creating the series, click on "Episodes" for the series
5. Add two episodes:
   - Season: 1, Episode: 1, Title: "The Vanishing of Will Byers"
   - Season: 1, Episode: 2, Title: "The Weirdo on Maple Street"
   - Add stream/download links and screenshots for each episode

## Usage

### Admin Panel

Access the admin panel at `http://your-vps-ip:3000` and log in with your Supabase credentials.

### Discord Bot

In your Discord server, use the following slash commands:
- `/movie [title]` - Search for a movie
- `/series [title]` - Search for a TV series

## Maintenance

- Monitor the application and bot using PM2:
  \`\`\`bash
  pm2 status
  pm2 logs
  \`\`\`

- Update the application:
  \`\`\`bash
  git pull
  npm install
  npm run build
  pm2 restart all
