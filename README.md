# Unified Inbox

A multi-channel customer outreach platform built with Next.js that aggregates messages from SMS, WhatsApp, email, and social media into a single unified inbox.

## Features

- 📱 **Multi-Channel Support**: SMS, WhatsApp, Email, Twitter DMs, Facebook Messenger
- 💬 **Real-time Collaboration**: Team notes, @mentions, presence indicators
- 📊 **Analytics Dashboard**: Response times, channel performance, engagement metrics
- 🔄 **Message Scheduling**: Automated follow-ups and template messages
- 👥 **Team Management**: Role-based access control (Viewer, Editor, Admin)
- 🔒 **Secure**: OAuth integration, webhook validation, audit logging

## Tech Stack

- **Frontend/Backend**: Next.js 16 with App Router and TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth with Google OAuth
- **Styling**: Tailwind CSS v4
- **Real-time**: WebSockets for live updates
- **Integrations**: Twilio (SMS/WhatsApp), Resend (Email), Social Media APIs

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Twilio account (for SMS/WhatsApp)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd unified-inbox
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run precheck` - Runs all quality checks without making changes
- `npm run precheck:fix` - Runs all quality checks and automatically fixes issues

## Project Structure

```
unified-inbox/
├── app/                 # Next.js App Router pages and API routes
├── components/          # Reusable React components
├── lib/                 # Utilities, services, and integrations
├── prisma/              # Database schema and migrations
├── styles/              # Global styles and Tailwind config
└── tests/               # Test files
```
