# Integration Factory Pattern

This module implements the integration factory pattern for the Unified Inbox system, providing a standardized way to handle multi-channel communication across SMS, WhatsApp, Email, and social media platforms.

## Overview

The integration factory pattern allows the system to:
- Support multiple communication channels through a unified interface
- Add new channels without modifying existing code
- Validate recipients and messages according to channel-specific rules
- Handle webhook processing for inbound messages
- Normalize messages from different channels into a unified format

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Factory       │    │   Interfaces    │    │   Base Classes  │
│                 │    │                 │    │                 │
│ createSender()  │───▶│ ChannelSender   │◀───│BaseChannelSender│
│ registerSender()│    │ChannelIntegration│◀───│BaseIntegration  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Twilio SMS    │    │  Twilio WhatsApp│    │   Email (Resend)│
│   Implementation│    │   Implementation│    │   Implementation│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. Types (`types.ts`)
- `ChannelType`: Enum for supported channels (SMS, WhatsApp, Email, etc.)
- `UnifiedMessage`: Standardized message format across all channels
- `OutboundMessage`: Message structure for sending
- `SendResult`: Result of send operations
- `ChannelFeatures`: Channel capabilities and limitations

### 2. Interfaces (`interfaces.ts`)
- `ChannelSender`: Interface for sending messages through a channel
- `ChannelIntegration`: Interface for webhook setup and processing
- `MessageProcessor`: Interface for message normalization

### 3. Base Classes (`base.ts`)
- `BaseChannelSender`: Abstract base class with common sender functionality
- `BaseChannelIntegration`: Abstract base class for integrations
- `BaseMessageProcessor`: Base class for message processing

### 4. Factory (`factory.ts`)
- `createSender()`: Create a sender for a specific channel
- `registerSender()`: Register a new channel implementation
- Registry management and validation functions

## Usage Examples

### Basic Usage

```typescript
import { createSender, ChannelType } from '@/lib/integrations';

// Create an SMS sender
const smsSender = createSender(ChannelType.SMS);

// Send a message
const result = await smsSender.send({
  to: '+1234567890',
  content: 'Hello from unified inbox!',
  channel: ChannelType.SMS
});

if (result.success) {
  console.log('Message sent:', result.messageId);
} else {
  console.error('Send failed:', result.error);
}
```

### Registering a New Channel

```typescript
import { registerSender, ChannelType } from '@/lib/integrations';
import { TwilioSmsSender } from './twilio/sms-sender';

// Register Twilio SMS implementation
registerSender(ChannelType.SMS, () => new TwilioSmsSender());
```

### Implementing a Channel Sender

```typescript
import { BaseChannelSender, ChannelType, OutboundMessage, SendResult } from '@/lib/integrations';

export class CustomSMSSender extends BaseChannelSender {
  constructor() {
    super(ChannelType.SMS);
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    // Validate message
    const validation = this.validateMessageContent(message);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Implement actual sending logic
    try {
      const response = await this.sendViaSMSProvider(message);
      return {
        success: true,
        messageId: response.id,
        externalId: response.externalId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateRecipient(contact: Contact): ValidationResult {
    // Implement recipient validation
    if (!contact.phone) {
      return { isValid: false, errors: ['Phone number required'] };
    }
    return { isValid: true, errors: [] };
  }

  getSupportedFeatures(): ChannelFeatures {
    return {
      supportsAttachments: false,
      supportsRichText: false,
      maxMessageLength: 160,
      supportedAttachmentTypes: [],
      maxAttachmentSize: 0,
      supportsDeliveryReceipts: true,
      supportsReadReceipts: false,
      supportsTypingIndicators: false
    };
  }

  private async sendViaSMSProvider(message: OutboundMessage) {
    // Implement provider-specific logic
  }
}
```

## Channel-Specific Features

Each channel has different capabilities:

| Channel   | Attachments | Rich Text | Max Length | Delivery Receipts |
|-----------|-------------|-----------|------------|-------------------|
| SMS       | No          | No        | 160        | Yes               |
| WhatsApp  | Yes         | Limited   | 4096       | Yes               |
| Email     | Yes         | Yes       | Unlimited  | Yes               |
| Twitter   | Yes         | Limited   | 280        | No                |
| Facebook  | Yes         | Limited   | 2000       | Yes               |

## Error Handling

The factory pattern includes comprehensive error handling:

```typescript
try {
  const sender = createSender(ChannelType.SMS);
  const result = await sender.send(message);
  
  if (!result.success) {
    // Handle send failure
    console.error('Send failed:', result.error);
  }
} catch (error) {
  // Handle factory or sender creation errors
  console.error('Channel not available:', error.message);
}
```

## Validation

All messages and recipients are validated before sending:

```typescript
const sender = createSender(ChannelType.SMS);

// Validate recipient
const recipientValidation = sender.validateRecipient(contact);
if (!recipientValidation.isValid) {
  console.error('Invalid recipient:', recipientValidation.errors);
}

// Message validation happens automatically in send()
```

## Testing

The factory pattern supports easy testing with mock implementations:

```typescript
import { registerSender, ChannelType } from '@/lib/integrations';
import { MockSMSSender } from './examples/mock-sms';

// Register mock for testing
registerSender(ChannelType.SMS, () => new MockSMSSender());

// Now all SMS sends will use the mock
const sender = createSender(ChannelType.SMS);
const result = await sender.send(testMessage);
```

## Next Steps

After implementing the factory pattern, the next tasks are:

1. **Task 13**: Create Message Normalization Service
2. **Task 14**: Set Up Twilio SDK Configuration  
3. **Task 15**: Implement Twilio SMS Sender
4. **Task 16**: Implement Twilio WhatsApp Sender
5. **Task 17**: Create Twilio Webhook Handler

Each channel implementation will extend the base classes and register itself with the factory.