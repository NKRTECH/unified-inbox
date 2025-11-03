import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateMessageSchema } from '@/lib/types/message';
import { handleApiError, createErrorResponse } from '@/lib/error-utils';
import { z } from 'zod';

const SendMessageSchema = CreateMessageSchema.extend({
  // Override direction to always be OUTBOUND for sent messages
  direction: z.literal('OUTBOUND'),
  // Require senderId for outbound messages
  senderId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SendMessageSchema.parse(body);

    // Verify that conversation, contact, and sender exist
    const [conversation, contact, sender] = await Promise.all([
      prisma.conversation.findUnique({
        where: { id: validatedData.conversationId },
      }),
      prisma.contact.findUnique({
        where: { id: validatedData.contactId },
      }),
      prisma.user.findUnique({
        where: { id: validatedData.senderId },
      }),
    ]);

    if (!conversation) {
      return createErrorResponse('Conversation not found', 404);
    }

    if (!contact) {
      return createErrorResponse('Contact not found', 404);
    }

    if (!sender) {
      return createErrorResponse('Sender not found', 404);
    }

    if (conversation.contactId !== validatedData.contactId) {
      return createErrorResponse('Contact does not belong to this conversation', 400);
    }

    // Validate channel-specific requirements
    const channelValidation = validateChannelRequirements(validatedData.channel, contact);
    if (!channelValidation.valid) {
      return createErrorResponse(channelValidation.error!, 400);
    }

    // Create the message with appropriate metadata
    const messageData = {
      ...validatedData,
      status: validatedData.scheduledFor ? 'SCHEDULED' as const : 'SENT' as const,
      sentAt: validatedData.scheduledFor ? null : new Date(),
      metadata: generateChannelMetadata(validatedData.channel, contact, validatedData.metadata),
    };

    const message = await prisma.message.create({
      data: messageData,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        conversation: {
          select: {
            id: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    // Update conversation's updatedAt timestamp and status if needed
    await prisma.conversation.update({
      where: { id: validatedData.conversationId },
      data: { 
        updatedAt: new Date(),
        // Reactivate conversation if it was resolved/archived
        status: conversation.status === 'ACTIVE' ? conversation.status : 'ACTIVE',
      },
    });

    // TODO: In a real implementation, this is where you would:
    // 1. Queue the message for actual sending via the appropriate channel
    // 2. Handle scheduled messages by adding them to a job queue
    // 3. Update message status based on delivery results

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/messages/send');
  }
}

function validateChannelRequirements(channel: string, contact: any): { valid: boolean; error?: string } {
  switch (channel) {
    case 'SMS':
    case 'WHATSAPP':
      if (!contact.phone) {
        return { valid: false, error: `Contact must have a phone number for ${channel} messages` };
      }
      break;
    case 'EMAIL':
      if (!contact.email) {
        return { valid: false, error: 'Contact must have an email address for EMAIL messages' };
      }
      break;
    case 'TWITTER':
    case 'FACEBOOK':
      const socialHandles = contact.socialHandles as Record<string, any> || {};
      const handleKey = channel.toLowerCase();
      if (!socialHandles[handleKey]) {
        return { valid: false, error: `Contact must have a ${channel} handle for ${channel} messages` };
      }
      break;
    default:
      return { valid: false, error: `Unsupported channel: ${channel}` };
  }
  
  return { valid: true };
}

function generateChannelMetadata(channel: string, contact: any, existingMetadata?: any): Record<string, any> {
  const metadata = { ...existingMetadata };
  
  switch (channel) {
    case 'SMS':
    case 'WHATSAPP':
      metadata.toNumber = contact.phone;
      // In a real implementation, you'd set fromNumber from your Twilio config
      metadata.fromNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
      break;
    case 'EMAIL':
      metadata.toAddress = contact.email;
      metadata.fromAddress = process.env.FROM_EMAIL || 'noreply@example.com';
      break;
    case 'TWITTER':
      const socialHandles = contact.socialHandles as Record<string, any> || {};
      metadata.username = socialHandles.twitter;
      break;
    case 'FACEBOOK':
      const fbHandles = contact.socialHandles as Record<string, any> || {};
      metadata.recipientId = fbHandles.facebook;
      break;
  }
  
  return metadata;
}