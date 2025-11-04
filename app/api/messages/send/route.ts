import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateMessageSchema } from '@/lib/types/message';
import { handleApiError, createErrorResponse } from '@/lib/error-utils';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const SendMessageSchema = CreateMessageSchema.extend({
  // Override direction to always be OUTBOUND for sent messages
  direction: z.literal('OUTBOUND'),
  // SenderId is optional - will be determined from session
  senderId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user) {
      return createErrorResponse('Unauthorized - Please log in', 401);
    }

    const body = await request.json();
    const validatedData = SendMessageSchema.parse(body);

    // Verify that conversation and contact exist
    const [conversation, contact] = await Promise.all([
      prisma.conversation.findUnique({
        where: { id: validatedData.conversationId },
      }),
      prisma.contact.findUnique({
        where: { id: validatedData.contactId },
      }),
    ]);

    if (!conversation) {
      return createErrorResponse('Conversation not found', 404);
    }

    if (!contact) {
      return createErrorResponse('Contact not found', 404);
    }

    // Use the authenticated user's ID as the sender
    const senderId = session.user.id;

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
      senderId, // Use the authenticated user's ID
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

    // Actually send the message via the appropriate channel
    if (!validatedData.scheduledFor) {
      try {
        const { MessageService } = await import('@/lib/services/message-service');
        const messageService = new MessageService();
        
        // Send via the integration
        const sendResult = await messageService.sendMessage({
          channel: validatedData.channel,
          to: getRecipientForChannel(validatedData.channel, contact),
          content: validatedData.content,
          metadata: validatedData.metadata,
          attachments: validatedData.attachments,
        });

        // Update message status based on send result
        if (sendResult.success) {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: 'SENT',
              metadata: {
                ...(message.metadata as any),
                externalId: sendResult.messageId || sendResult.externalId,
              },
            },
          });
        } else {
          await prisma.message.update({
            where: { id: message.id },
            data: { status: 'FAILED' },
          });
        }
      } catch (sendError) {
        console.error('Failed to send message via channel:', sendError);
        // Update message status to failed
        await prisma.message.update({
          where: { id: message.id },
          data: { status: 'FAILED' },
        });
      }
    }

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

function getRecipientForChannel(channel: string, contact: any): string {
  switch (channel) {
    case 'SMS':
    case 'WHATSAPP':
      return contact.phone;
    case 'EMAIL':
      return contact.email;
    case 'TWITTER':
      const socialHandles = contact.socialHandles as Record<string, any> || {};
      return socialHandles.twitter;
    case 'FACEBOOK':
      const fbHandles = contact.socialHandles as Record<string, any> || {};
      return fbHandles.facebook;
    default:
      return '';
  }
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