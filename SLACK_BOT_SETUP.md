# Slack HR Bot Setup Guide

## Prerequisites

1. **OpenAI Account** with API access
2. **Slack Workspace** where you have admin permissions
3. **Whistler Server** (or your hosting environment)

## Step 1: OpenAI Setup

### 1.1 Create Assistant with File Search

The assistant will be created automatically on first use, but you need to upload the PDF file to OpenAI's Vector Store first.

#### Option A: Using OpenAI Dashboard
1. Go to https://platform.openai.com/assistants
2. Create a new Assistant
3. Enable "File Search" tool
4. Upload "People & Talent_v099.pdf" to the Vector Store
5. Copy the Assistant ID and set it as `OPENAI_ASSISTANT_ID` environment variable

#### Option B: Using OpenAI API (Recommended for automation)
```bash
# Upload file
curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F "file=@People & Talent_v099.pdf" \
  -F "purpose=assistants"

# Create vector store and add file
# (Use OpenAI SDK or API to create vector store and attach file)
```

### 1.2 Environment Variables
```bash
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_...  # Optional: will be created automatically if not provided
```

## Step 2: Slack App Setup

### 2.1 Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From Scratch"
3. Name your app (e.g., "HR Assistant")
4. Select your workspace

### 2.2 Configure OAuth & Permissions
1. Go to "OAuth & Permissions" in the sidebar
2. Under "Scopes" → "Bot Token Scopes", add:
   - `chat:write` - Send messages
   - `im:history` - Read direct messages
   - `app_mentions:read` - Read mentions in channels
3. Scroll up and click "Install to Workspace"
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 2.3 Enable Event Subscriptions
1. Go to "Event Subscriptions" in the sidebar
2. Enable "Event Subscriptions"
3. Set Request URL:
   - For Assistants API: `https://whistler.mn/api/slack/events/assistant`
   - For Chat API: `https://whistler.mn/api/slack/events/chat`
4. Under "Subscribe to bot events", add:
   - `message.im` - Direct messages
   - `app_mentions` - Mentions in channels
5. Save changes and reinstall the app if prompted

### 2.4 Get Signing Secret
1. Go to "Basic Information" in the sidebar
2. Under "App Credentials", copy "Signing Secret"

### 2.5 Environment Variables
```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

## Step 3: Database Setup

### 3.1 Run Prisma Migrations
```bash
cd packages/db
bun run prisma migrate dev --name add_bot_user
```

### 3.2 Generate Prisma Client
```bash
bun run prisma generate
```

## Step 4: Local Testing with ngrok

### 4.1 Setup ngrok (for local development)

1. **Sign up for ngrok account** (if you don't have one):
   - Go to https://dashboard.ngrok.com/signup
   - Create a free account

2. **Get your authtoken**:
   - Go to https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy your authtoken

3. **Configure ngrok**:
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```

4. **Start ngrok tunnel**:
   ```bash
   bun run ngrok
   # or directly: ngrok http 3000
   ```

5. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`):
   - Use this URL in Slack Event Subscriptions
   - Update Request URL to: `https://your-ngrok-url.ngrok.io/api/slack/events/assistant`
   - Or: `https://your-ngrok-url.ngrok.io/api/slack/events/chat`

**Note**: Free ngrok URLs change each time you restart ngrok. For a static URL, upgrade to a paid plan or use ngrok's reserved domains feature.

## Step 5: Deploy & Test

### 5.1 Set All Environment Variables
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_...  # Optional

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Database
DATABASE_URL=file:db.sqlite  # or your database URL
```

### 5.2 Start the Server
```bash
bun run dev
```

### 5.3 Test the Integration
1. Send a direct message to your bot in Slack
2. Or mention the bot in a channel: `@HR Assistant What is the leave policy?`
3. The bot should respond with "Бодож байна..." and then the answer

## Troubleshooting

### URL Verification Fails
- Make sure your server is publicly accessible
- Check that the Request URL in Slack matches exactly (including `/api/slack/events/assistant` or `/api/slack/events/chat`)
- Verify SSL certificate is valid

### Signature Verification Fails
- Double-check `SLACK_SIGNING_SECRET` matches the one in Slack dashboard
- Ensure the raw request body is used for verification (not parsed JSON)
- Check server logs for detailed error messages

### Bot Not Responding
- Verify bot is installed in your workspace
- Check bot has the required scopes
- Ensure events are subscribed correctly
- Check server logs for errors

### OpenAI Errors
- Verify `OPENAI_API_KEY` is correct and has credits
- Check that the assistant has file search enabled
- Ensure the PDF file is uploaded to the vector store
- Check OpenAI API status

## File Upload to Vector Store

To upload the PDF file programmatically:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1. Upload file
const file = await openai.files.create({
  file: fs.createReadStream("People & Talent_v099.pdf"),
  purpose: "assistants",
});

// 2. Create vector store
const vectorStore = await openai.beta.vectorStores.create({
  name: "HR Documents",
});

// 3. Add file to vector store
await openai.beta.vectorStores.files.create(vectorStore.id, {
  file_id: file.id,
});

// 4. Update assistant to use vector store
await openai.beta.assistants.update(assistantId, {
  tool_resources: {
    file_search: {
      vector_store_ids: [vectorStore.id],
    },
  },
});
```

## Notes

- The bot maintains conversation context using OpenAI threads (Assistants API)
- Each Slack user gets their own thread for context
- Threads are stored in the database to persist across server restarts
- Latency: Expect 0.5-1.5s for retrieval + 3-10s for generation
- The bot sends "Бодож байна..." immediately to acknowledge receipt

