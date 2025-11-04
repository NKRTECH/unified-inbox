/**
 * Integration factory test API endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getRegisteredChannels, 
  isChannelRegistered, 
  createSender,
  ChannelType 
} from '@/lib/integrations';

export async function GET(request: NextRequest) {
  try {
    // Get all registered channels
    const registeredChannels = getRegisteredChannels();
    
    // Test creating senders for each registered channel
    const senderTests: Record<string, any> = {};
    
    for (const channelType of registeredChannels) {
      try {
        const sender = createSender(channelType);
        const features = sender.getSupportedFeatures();
        
        senderTests[channelType] = {
          status: 'success',
          channelType: sender.getChannelType(),
          features: {
            supportsAttachments: features.supportsAttachments,
            supportsRichText: features.supportsRichText,
            maxMessageLength: features.maxMessageLength,
            supportsDeliveryReceipts: features.supportsDeliveryReceipts
          }
        };
      } catch (error) {
        senderTests[channelType] = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Integration factory test completed',
      registeredChannels,
      channelTests: {
        sms: isChannelRegistered(ChannelType.SMS),
        whatsapp: isChannelRegistered(ChannelType.WHATSAPP),
        email: isChannelRegistered(ChannelType.EMAIL),
        twitter: isChannelRegistered(ChannelType.TWITTER),
        facebook: isChannelRegistered(ChannelType.FACEBOOK)
      },
      senderTests,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Integration factory test failed:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}