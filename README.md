```mermaid
erDiagram
  User ||--o{ Account : "owns"
  User ||--o{ Session : "has"
  User ||--o{ Note : "authors"
  Message }o--o| User : "sent by"
  Conversation }o--o| User : "assigned to"
  Call }o--o| User : "initiated by"

  Contact ||--o{ Conversation : "has"
  Contact ||--o{ Message : "receives"
  Contact ||--o{ Call : "participates in"

  Conversation ||--o{ Message : "contains"
  Conversation ||--o{ Note : "includes"

  Message ||--o| ScheduledMessage : "scheduled as"
  ScheduledMessage }o--o| MessageTemplate : "uses template"

  Verification {
    string id PK
    string identifier
    string value
    datetime expiresAt
  }

  User {
    string id PK
    string email UK
    string name
    string image
    enum role
    datetime createdAt
    datetime updatedAt
  }
```
- **Collaboration**: Yjs with TipTap for conflict-free collaborative editing
- **State Management**: React Query (TanStack Query) for server state
- **Integrations**: Twilio (SMS/WhatsApp/VoIP)
- **Validation**: Zod for runtime type validation
- **Testing**: Jest with React Testing Library

## Prerequisites

Before you begin, ensure you have the following installed and configured:

- **Node.js** 18.x or higher
- **npm** or **yarn** package manager
- **PostgreSQL** 14.x or higher
- **Twilio Account** with:
  - Account SID and Auth Token
  - Phone number (trial or purchased)
  - WhatsApp sandbox configured (for WhatsApp messaging)
- **Google OAuth Credentials** (for authentication)
- **Git** for version control

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd unified-inbox
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and configure it with your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration (see [Environment Configuration](#environment-configuration) below).

### 4. Set Up the Database

Create a PostgreSQL database and run migrations:

```bash
# Create database (if not exists)
createdb unified_inbox

# Run Prisma migrations
npx prisma migrate dev

# (Optional) Seed the database with sample data
npx prisma db seed
```

### 5. Set Up Google OAuth

Follow the detailed instructions in [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) to configure Google OAuth for authentication.

### 6. Configure Twilio

1. Sign up for a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number or use the trial number
4. Configure WhatsApp sandbox at https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
5. Set up webhook URLs (see [Webhook Configuration](#webhook-configuration))

## Environment Configuration

Your `.env.local` file should contain the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/unified_inbox"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here-min-32-characters"
BETTER_AUTH_URL="http://localhost:3000"

# Application
NODE_ENV="development"

# Supabase Configuration (if using Supabase)
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-supabase-publishable-key"
SUPABASE_SECRET_KEY="your-supabase-secret-key"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Twilio Configuration
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_WEBHOOK_URL="http://localhost:3000/api/webhooks/twilio"
TWILIO_FROM_NUMBER="+1234567890"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# Twilio VoIP Configuration (for Voice SDK)
TWILIO_API_KEY="your-twilio-api-key"
TWILIO_API_SECRET="your-twilio-api-secret"
# TWILIO_APP_SID="your-twilio-app-sid" # Optional - uncomment when configured

# WebSocket Configuration
NEXT_PUBLIC_WS_URL="ws://localhost:3000"
```

## Database Setup

### Running Migrations

```bash
# Apply all pending migrations
npx prisma migrate dev

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

### Viewing the Database

```bash
# Open Prisma Studio to view/edit data
npx prisma studio
```

## Running the Application

### Development Mode

You need to run both the Next.js server and the WebSocket server:

```bash
# Terminal 1: Start Next.js development server
npm run dev

# Terminal 2: Start WebSocket server
npm run dev:ws
```

The application will be available at:
- **Web App**: http://localhost:3000
- **WebSocket Server**: ws://localhost:3001

### Production Mode

```bash
# Build the application
npm run build
npm run build:server

# Start production servers
npm run start        # Next.js server
npm run start:ws     # WebSocket server
```

### Webhook Configuration

For Twilio webhooks to work in development, you'll need to expose your local server using a tool like ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000
```

Then configure your Twilio webhook URLs in the Twilio Console:
- **SMS Webhook**: `https://your-ngrok-url.ngrok.io/api/webhooks/twilio`
- **WhatsApp Webhook**: `https://your-ngrok-url.ngrok.io/api/webhooks/twilio`

## Integration Comparison

| Channel | Latency | Cost | Reliability | Features | Notes |
|---------|---------|------|-------------|----------|-------|
| **SMS** | ~1-3s | $0.0075/msg (US) | 99.95% | Text, MMS, delivery receipts | Best for urgent notifications, universal reach |
| **WhatsApp** | ~1-2s | $0.005/msg (US) | 99.9% | Text, media, rich formatting, read receipts | Requires opt-in, higher engagement rates |
| **Email** | ~5-30s | $0.001/email | 99% | Rich HTML, attachments, threading | Best for detailed communications, async |
| **Twitter DM** | ~2-5s | Free | 98% | Text, media, quick replies | Requires mutual follow or opt-in |
| **Facebook Messenger** | ~2-4s | Free | 98.5% | Text, media, templates, buttons | High engagement, requires page setup |

### Integration Status

- ✅ **SMS (Twilio)**: Fully implemented with delivery tracking
- ✅ **WhatsApp (Twilio)**: Fully implemented with media support
- ✅ **VoIP (Twilio Client SDK)**: In-app calling with call history
- ⚠️ **Email (Resend)**: Optional integration available
- ⚠️ **Twitter DM**: Optional integration available
- ⚠️ **Facebook Messenger**: Optional integration available

### Channel Selection Guidelines

**Use SMS when:**
- Immediate delivery is critical
- Recipient may not have internet access
- Simple text-based communication is sufficient
- Universal reach is required

**Use WhatsApp when:**
- Rich media sharing is needed
- Higher engagement rates are desired
- International messaging (lower costs)
- Read receipts are important

**Use Email when:**
- Detailed information needs to be shared
- Attachments are required
- Formal communication is needed
- Async communication is acceptable

**Use Social Media DMs when:**
- Already engaging on the platform
- Quick, casual communication
- Leveraging existing social relationships

## Architecture

### High-Level Architecture

```mermaid
graph TB
  subgraph "Client Layer"
    UI[Next.js UI]
    RQ[React Query Cache]
    WS_CLIENT[WebSocket Client]
    YJS_CLIENT[Yjs Collaboration Client]
  end

  subgraph "API Layer"
    API[Next.js API Routes]
    AUTH[Better Auth]
    WH[Webhook Handlers]
  end

  subgraph "Business Logic"
    MS[Message Service]
    MN[Message Normalization]
    SS[Scheduling Service]
    AS[Analytics Service]
    PRS[Presence Service]
    CLS[Call Service]
    FACTORY[Integration Factory]
  end

  subgraph "Real-time Layer"
    WS_SERVER[WebSocket Server]
    YJS_SERVER[Yjs WebSocket Server]
  end

  subgraph "Data Layer"
    PRISMA[Prisma Client]
    DB[(PostgreSQL)]
  end

  subgraph "External Services"
    TWILIO_MSG[Twilio Messaging API]
    TWILIO_VOICE[Twilio Voice Platform]
    TWILIO_WH[Twilio Webhooks]
  end

  UI --> API
  UI --> RQ
  UI --> WS_CLIENT
  UI --> YJS_CLIENT
  RQ --> API
  WS_CLIENT --> RQ
  WS_CLIENT --> WS_SERVER
  YJS_CLIENT --> YJS_SERVER

  API --> AUTH
  API --> MS
  API --> SS
  API --> AS
  API --> CLS
  API --> PRS

  WH --> MN
  MN --> MS
  TWILIO_WH --> WH

  MS --> FACTORY
  FACTORY --> TWILIO_MSG
  CLS --> TWILIO_VOICE

  MS --> PRISMA
  SS --> PRISMA
  AS --> PRISMA
  CLS --> PRISMA
  SS --> MS
  MS --> WS_SERVER

  PRISMA --> DB

  WS_SERVER --> PRS
```


### Integration Factory Pattern

The system uses a factory pattern for channel integrations, making it easy to add new communication channels:

```typescript
// Factory creates channel-specific senders
const sender = createSender(ChannelType.SMS);
await sender.send(message);

// Each sender implements the same interface
interface ChannelSender {
  send(message: OutboundMessage): Promise<SendResult>;
  validateRecipient(contact: Contact): boolean;
  getSupportedFeatures(): ChannelFeatures;
}
```

This pattern is implemented in `/lib/integrations/factory.ts` and allows for:
- Consistent message sending across all channels
- Easy addition of new channels
- Channel-specific validation and features
- Centralized error handling

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Session : has
    User ||--o{ Account : has
    User ||--o{ Message : sends
    User ||--o{ Note : authors
    User ||--o{ Conversation : "assigned to"
    User ||--o{ Call : initiates
    
    Verification {
        string id PK
        string identifier
        string value
        datetime expiresAt
        datetime createdAt
        datetime updatedAt
    }
    
    Contact ||--o{ Conversation : has
    Contact ||--o{ Message : receives
    Contact ||--o{ Call : "participates in"
    
    Conversation ||--o{ Message : contains
    Conversation ||--o{ Note : has
    Conversation }o--|| Contact : "belongs to"
    Conversation }o--o| User : "assigned to"
    
    Message ||--o| ScheduledMessage : "can be scheduled"
    Message }o--|| Contact : "sent to"
    Message }o--|| Conversation : "part of"
    Message }o--o| User : "sent by"
    
    Note }o--|| User : "authored by"
    Note }o--|| Conversation : "attached to"
    
    ScheduledMessage }o--|| Message : schedules
    ScheduledMessage }o--o| MessageTemplate : "uses template"
    
    Call }o--|| Contact : "with contact"
    Call }o--o| User : "initiated by"
    
    User {
        string id PK
        string email UK
        boolean emailVerified
        string name
        string image
        enum role
        datetime createdAt
        datetime updatedAt
    }
    
    Contact {
        string id PK
        string name
        string phone
        string email
        json socialHandles
        string[] tags
        json customFields
        datetime createdAt
        datetime updatedAt
    }
    
    Conversation {
        string id PK
        string contactId FK
        enum status
        enum priority
        string assignedTo FK
        datetime createdAt
        datetime updatedAt
    }
    
    Message {
        string id PK
        string conversationId FK
        string contactId FK
        string senderId FK
        enum channel
        enum direction
        string content
        json metadata
        json attachments
        enum status
        datetime scheduledFor
        datetime sentAt
        datetime createdAt
        datetime updatedAt
    }
    
    Note {
        string id PK
        string conversationId FK
        string authorId FK
        string content
        boolean isPrivate
        string[] mentions
        string encryptedData
        datetime createdAt
        datetime updatedAt
    }
    
    ScheduledMessage {
        string id PK
        string messageId FK
        datetime scheduledFor
        enum status
        string templateId FK
        json variables
        datetime createdAt
        datetime updatedAt
    }
    
    MessageTemplate {
        string id PK
        string name
        string content
        string description
        string[] variables
        string category
        boolean isActive
        string createdBy
        datetime createdAt
        datetime updatedAt
    }
    
    Call {
        string id PK
        string contactId FK
        string initiatorId FK
        string twilioCallSid UK
        enum direction
        enum status
        int duration
        datetime startedAt
        datetime endedAt
        datetime createdAt
        datetime updatedAt
    }
    
    Session {
        string id PK
        string userId FK
        string token UK
        datetime expiresAt
        string ipAddress
        string userAgent
        datetime createdAt
        datetime updatedAt
    }
    
    Account {
        string id PK
        string accountId UK
        string providerId
        string userId FK
        string accessToken
        string refreshToken
        string idToken
        datetime accessTokenExpiresAt
        datetime refreshTokenExpiresAt
        string scope
        string password
        datetime createdAt
        datetime updatedAt
    }
```

## Key Architectural Decisions

### 1. Integration Factory Pattern

**Decision**: Use a factory pattern for channel integrations instead of direct service implementations.

**Rationale**: 
- Provides a consistent interface for all communication channels
- Makes it easy to add new channels without modifying existing code
- Centralizes channel-specific logic and validation
- Enables better testing through interface mocking

**Implementation**: `/lib/integrations/factory.ts` exports `createSender(channelType)` function that returns channel-specific implementations.

### 2. Message Normalization Pipeline

**Decision**: Normalize all inbound messages into a unified format before storage.

**Rationale**:
- Simplifies database schema and queries
- Enables cross-channel conversation threading
- Makes analytics and reporting consistent
- Reduces code duplication in UI components

**Implementation**: Message processor in `/lib/services/message-service.ts` handles normalization from webhook payloads.

### 3. Real-time Collaboration with Yjs

**Decision**: Use Yjs for collaborative note editing instead of operational transforms or custom CRDT.

**Rationale**:
- Proven conflict-free replicated data type (CRDT) implementation
- Excellent performance with large documents
- Built-in undo/redo support
- Strong ecosystem with TipTap integration
- Handles network partitions gracefully

**Implementation**: Yjs WebSocket provider in `/lib/websocket/yjs-provider.ts` with TipTap editor integration.

### 4. React Query for State Management

**Decision**: Use React Query for server state instead of Redux or Zustand.

**Rationale**:
- Built-in caching and invalidation strategies
- Optimistic updates for better UX
- Automatic background refetching
- Reduces boilerplate code significantly
- Perfect fit for data-heavy applications

**Implementation**: Custom hooks in `/lib/hooks/` wrap React Query for conversations, messages, and contacts.

### 5. PostgreSQL as Primary Database

**Decision**: Use PostgreSQL instead of MongoDB or other NoSQL databases.

**Rationale**:
- Strong ACID guarantees for message integrity
- Excellent support for complex queries and joins
- JSON columns for flexible metadata storage
- Mature ecosystem and tooling
- Better fit for relational data (conversations, contacts, messages)

**Implementation**: Prisma ORM provides type-safe database access with migrations.

### 6. Webhook-Based Inbound Message Processing

**Decision**: Use webhooks for inbound messages instead of polling APIs.

**Rationale**:
- Near real-time message delivery
- Reduces API rate limit concerns
- More efficient than polling
- Industry standard for messaging platforms
- Enables immediate user notifications

**Implementation**: Webhook handlers in `/app/api/webhooks/` validate signatures and process messages.

### 7. Separate WebSocket Server

**Decision**: Run WebSocket server separately from Next.js API routes.

**Rationale**:
- Better performance for long-lived connections
- Easier horizontal scaling
- Avoids Next.js serverless function timeouts
- More control over connection lifecycle
- Simpler deployment architecture

**Implementation**: Standalone WebSocket server in `/lib/websocket/server.ts` runs on separate port.

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/sign-in`
Sign in with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "EDITOR"
  },
  "session": {
    "token": "jwt_token_here",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

#### POST `/api/auth/sign-up`
Register a new user account.

#### GET `/api/auth/session`
Get current user session.

#### POST `/api/auth/sign-out`
Sign out and invalidate session.

### Conversation Endpoints

#### GET `/api/conversations`
List all conversations with filtering and pagination.

**Query Parameters**:
- `status`: Filter by status (ACTIVE, RESOLVED, ARCHIVED)
- `priority`: Filter by priority (LOW, NORMAL, HIGH, URGENT)
- `assignedTo`: Filter by assigned user ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response**:
```json
{
  "conversations": [
    {
      "id": "conv_123",
      "contact": {
        "id": "contact_456",
        "name": "Jane Smith",
        "phone": "+1234567890"
      },
      "status": "ACTIVE",
      "priority": "HIGH",
      "lastMessage": {
        "content": "Hello, I need help",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      "unreadCount": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### GET `/api/conversations/[id]`
Get conversation details with messages.

#### PATCH `/api/conversations/[id]`
Update conversation status, priority, or assignment.

#### POST `/api/conversations/[id]/messages`
Send a message in a conversation.

**Request Body**:
```json
{
  "channel": "SMS",
  "content": "Thank you for contacting us!",
  "attachments": []
}
```

### Message Endpoints

#### POST `/api/messages/send`
Send a new message to a contact.

**Request Body**:
```json
{
  "contactId": "contact_456",
  "channel": "WHATSAPP",
  "content": "Hello! How can we help you today?",
  "attachments": [
    {
      "type": "image",
      "url": "https://example.com/image.jpg"
    }
  ]
}
```

#### POST `/api/messages/schedule`
Schedule a message for future delivery.

**Request Body**:
```json
{
  "contactId": "contact_456",
  "channel": "SMS",
  "content": "Reminder: Your appointment is tomorrow",
  "scheduledFor": "2024-01-16T09:00:00Z",
  "templateId": "template_789"
}
```

### Contact Endpoints

#### GET `/api/contacts`
List all contacts with search and filtering.

**Query Parameters**:
- `search`: Search by name, phone, or email
- `tags`: Filter by tags (comma-separated)
- `page`: Page number
- `limit`: Items per page

#### POST `/api/contacts`
Create a new contact.

**Request Body**:
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "tags": ["customer", "vip"],
  "customFields": {
    "company": "Acme Corp",
    "industry": "Technology"
  }
}
```

#### GET `/api/contacts/[id]`
Get contact details with communication history.

#### PATCH `/api/contacts/[id]`
Update contact information.

#### POST `/api/contacts/merge`
Merge duplicate contacts.

**Request Body**:
```json
{
  "sourceId": "contact_123",
  "targetId": "contact_456",
  "conflictResolution": {
    "name": "use_target",
    "phone": "use_source"
  }
}
```

### Analytics Endpoints

#### GET `/api/analytics`
Get analytics dashboard data.

**Query Parameters**:
- `startDate`: Start date for analytics period
- `endDate`: End date for analytics period
- `channels`: Filter by channels (comma-separated)

**Response**:
```json
{
  "metrics": {
    "totalMessages": 1250,
    "averageResponseTime": 180,
    "channelVolume": {
      "SMS": 450,
      "WHATSAPP": 600,
      "EMAIL": 200
    }
  },
  "charts": {
    "responseTime": [...],
    "channelComparison": [...]
  }
}
```

#### GET `/api/analytics/export`
Export analytics data as CSV or PDF.

**Query Parameters**:
- `format`: Export format (csv, pdf)
- `startDate`: Start date
- `endDate`: End date

### Webhook Endpoints

#### POST `/api/webhooks/twilio`
Receive inbound SMS and WhatsApp messages from Twilio.

**Headers**:
- `X-Twilio-Signature`: Webhook signature for validation

**Request Body** (Twilio format):
```
From=+1234567890
To=+0987654321
Body=Hello, I need help
MessageSid=SM123456789
```

## Development Scripts

```bash
# Development
npm run dev              # Start Next.js dev server
npm run dev:ws           # Start WebSocket server in dev mode

# Building
npm run build            # Build Next.js application
npm run build:server     # Build WebSocket server

# Production
npm run start            # Start Next.js production server
npm run start:ws         # Start WebSocket production server

# Database
npx prisma migrate dev   # Run Prisma migrations
npx prisma generate      # Generate Prisma Client
npx prisma studio        # Open Prisma Studio
npx prisma db seed       # Seed database with sample data (if configured)
npx prisma migrate reset # Reset database (WARNING: deletes all data)

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # Run TypeScript type checking
npm run precheck         # Run type-check, lint, and format check
npm run precheck:fix     # Run type-check, lint fix, and format
```

## Project Structure

```
unified-inbox/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── inbox/            # Inbox-specific components
│   ├── contacts/         # Contact management components
│   └── analytics/        # Analytics components
├── lib/                   # Core business logic
│   ├── auth/             # Authentication utilities
│   ├── integrations/     # Channel integrations
│   ├── services/         # Business logic services
│   ├── hooks/            # React hooks
│   ├── websocket/        # WebSocket server and client
│   └── utils/            # Utility functions
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── tests/                # Test files
```

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

- **Unit Tests** (`tests/unit/`): Test individual functions and components
- **Integration Tests** (`tests/integration/`): Test API endpoints and database operations
- **E2E Tests** (`tests/e2e/`): Test complete user flows

### Writing Tests

Example unit test:
```typescript
import { normalizeMessage } from '@/lib/services/message-service';

describe('normalizeMessage', () => {
  it('should normalize Twilio SMS message', () => {
    const twilioPayload = {
      From: '+1234567890',
      To: '+0987654321',
      Body: 'Hello',
      MessageSid: 'SM123'
    };
    
    const normalized = normalizeMessage(twilioPayload, 'SMS');
    
    expect(normalized.channel).toBe('SMS');
    expect(normalized.content).toBe('Hello');
    expect(normalized.direction).toBe('INBOUND');
  });
});
```

## Troubleshooting

### Common Issues

#### Database Connection Errors

**Problem**: `Error: Can't reach database server`

**Solution**:
1. Ensure PostgreSQL is running: `pg_ctl status`
2. Check DATABASE_URL in `.env.local`
3. Verify database exists: `psql -l`
4. Test connection: `npx prisma db pull`

#### Twilio Webhook Not Receiving Messages

**Problem**: Messages sent to Twilio number don't appear in inbox

**Solution**:
1. Verify webhook URL is publicly accessible (use ngrok in development)
2. Check Twilio Console webhook configuration
3. Verify webhook signature validation is working
4. Check server logs for webhook errors: `tail -f logs/webhook.log`
5. Test webhook manually: `curl -X POST http://localhost:3000/api/webhooks/twilio`

#### WebSocket Connection Failures

**Problem**: Real-time updates not working

**Solution**:
1. Ensure WebSocket server is running: `npm run dev:ws`
2. Check WS_PORT and WS_HOST in `.env.local`
3. Verify firewall allows WebSocket connections
4. Check browser console for connection errors
5. Test WebSocket connection: `wscat -c ws://localhost:3001`

#### Google OAuth Errors

**Problem**: `redirect_uri_mismatch` error during OAuth flow

**Solution**:
1. Verify redirect URI in Google Cloud Console matches your app URL
2. Check BETTER_AUTH_URL in `.env.local`
3. Ensure OAuth consent screen is configured
4. Verify client ID and secret are correct
5. See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for detailed setup

#### Message Sending Failures

**Problem**: Messages fail to send with "Invalid recipient" error

**Solution**:
1. For Twilio trial accounts, verify recipient is in verified contacts list
2. Check phone number format (E.164 format: +1234567890)
3. Verify Twilio account has sufficient balance
4. Check Twilio service status: https://status.twilio.com
5. Review Twilio error codes: https://www.twilio.com/docs/api/errors

#### Build Errors

**Problem**: `Type error: Cannot find module` during build

**Solution**:
1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Regenerate Prisma Client: `npx prisma generate`
4. Check TypeScript configuration: `npm run type-check`

#### Performance Issues

**Problem**: Slow page loads or high memory usage

**Solution**:
1. Enable React Query devtools to check cache size
2. Implement pagination for large conversation lists
3. Use virtualization for long message threads
4. Check database query performance with Prisma logging
5. Monitor WebSocket connection count
6. Consider implementing Redis caching for frequently accessed data

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/your-repo/unified-inbox/issues)
2. Review the [API Documentation](#api-documentation)
3. Check Twilio documentation: https://www.twilio.com/docs
4. Review Next.js documentation: https://nextjs.org/docs
5. Open a new issue with:
   - Detailed description of the problem
   - Steps to reproduce
   - Error messages and logs
   - Environment details (OS, Node version, etc.)

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and add tests
4. Run tests and linting: `npm run test && npm run lint`
5. Commit with conventional commits: `git commit -m "feat: add new feature"`
6. Push to your fork: `git push origin feat/your-feature`
7. Open a pull request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Twilio](https://www.twilio.com/) - Communication APIs
- [Yjs](https://yjs.dev/) - CRDT for collaboration
- [TanStack Query](https://tanstack.com/query) - Data fetching and caching
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Radix UI](https://www.radix-ui.com/) - UI components

---

**Built with ❤️ for seamless multi-channel communication**