# Timetable Cal
Convert any college timetable photo into calendar events instantly.

## What it does
Upload a photo of your college timetable → AI parses it → Export to Google Calendar, Apple Calendar, or Outlook in one click.

## Features
- AI-powered timetable parsing (OpenAI GPT-4o vision)
- Weekly calendar grid preview with editable events
- Export as .ics file (works with all calendar apps)
- Per-event Google Calendar links (no auth required)
- Webcal subscription URL for auto-syncing

## Setup
1. Clone the repo
   ```bash
   git clone https://github.com/yourusername/timetable-cal
   cd timetable-cal
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Add your API key
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your OpenAI API key
   ```

4. Run locally
   ```bash
   npm run dev
   ```

## Environment Variables
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Deploy
Deploy to Vercel in one click. Add `OPENAI_API_KEY` in Vercel environment variables.

## Built with
Next.js 14, TypeScript, Tailwind CSS, OpenAI GPT-4o
