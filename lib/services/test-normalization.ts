/**
 * Test script for message normalization service
 * This demonstrates and validates the message normalization functionality
 */

import {
  MessageNormalizationService,
  RawChannelMessage,
  MessageService
} from './index';
import {
  ChannelType,
  MessageDirection,
  MessageStatus
} from '@/lib/integrations/types';

/**
 * Test the message normalization service
 */
async function testMessageNormalization(): Promise<void> {
  console.log('🧪 Testing Message Normalization Service');
  console.log('========================================\n');

  const normalizationService = new MessageNormalizationService();
  const messageService = new MessageService();

  // Test 1: SMS Message Normalization
  console.log('1. Testing SMS Message Normalization...');
  const smsMessage: RawChannelMessage = {
    channel: ChannelType.SMS,
    externalId: 'sms_test_123',
    from: '+1234567890',
    to: '+0987654321',
    content: 'Hello, this is a test SMS message!',
    timestamp: new Date(),
    metadata: {
      provider: 'twilio',
      messageId: 'SM123456789',
      accountSid: 'AC123456789'
    },
    direction: MessageDirection.INBOUND
  };

  try {
    const result = await normalizationService.processMessage(smsMessage);
    console.log('SMS Normalization Result:', {
      success: result.success,
      errors: result.errors,
      warnings: result.warnings,
      processingTime: `${result.processingTime}ms`
    });
    
    if (result.message) {
      console.log('Normalized Message:', {
        channel: result.message.channel,
        direction: result.message.direction,
        content: result.message.content.substring(0, 50) + '...',
        externalId: result.message.externalId
      });
    }
    console.log('✅ SMS normalization test complete\n');
  } catch (error) {
    console.error('❌ SMS normalization test failed:', error);
  }

  // Test 2: WhatsApp Message with Attachments
  console.log('2. Testing WhatsApp Message with Attachments...');
  const whatsappMessage: RawChannelMessage = {
    channel: ChannelType.WHATSAPP,
    externalId: 'wa_test_456',
    from: '+1234567890',
    to: '+0987654321',
    content: 'Check out this image!',
    timestamp: new Date(),
    metadata: {
      provider: 'twilio',
      profileName: 'John Doe'
    },
    attachments: [{
      filename: 'test-image.jpg',
      contentType: 'image/jpeg',
      size: 1024000,
      url: 'https://example.com/image.jpg'
    }],
    direction: MessageDirection.INBOUND
  };

  try {
    const result = await normalizationService.processMessage(whatsappMessage);
    console.log('WhatsApp Normalization Result:', {
      success: result.success,
      errors: result.errors,
      warnings: result.warnings,
      attachmentCount: result.message?.attachments?.length || 0
    });
    console.log('✅ WhatsApp normalization test complete\n');
  } catch (error) {
    console.error('❌ WhatsApp normalization test failed:', error);
  }

  // Test 3: Email Message
  console.log('3. Testing Email Message Normalization...');
  const emailMessage: RawChannelMessage = {
    channel: ChannelType.EMAIL,
    externalId: 'email_test_789',
    from: 'customer@example.com',
    to: 'support@company.com',
    content: '<p>Hello,</p><p>I need help with my account.</p><p>Thanks!</p>',
    timestamp: new Date(),
    metadata: {
      subject: 'Account Help Request',
      messageId: '<msg123@example.com>',
      provider: 'resend'
    },
    direction: MessageDirection.INBOUND
  };

  try {
    const result = await normalizationService.processMessage(emailMessage);
    console.log('Email Normalization Result:', {
      success: result.success,
      errors: result.errors,
      warnings: result.warnings,
      hasHtml: result.message?.content.includes('<') || false
    });
    console.log('✅ Email normalization test complete\n');
  } catch (error) {
    console.error('❌ Email normalization test failed:', error);
  }

  // Test 4: Validation Errors
  console.log('4. Testing Validation Errors...');
  const invalidMessage: RawChannelMessage = {
    channel: ChannelType.SMS,
    externalId: '', // Invalid: empty external ID
    from: '',       // Invalid: empty from
    to: '+0987654321',
    content: '',    // Invalid: empty content
    timestamp: new Date(),
    metadata: {}
  };

  try {
    const result = await normalizationService.processMessage(invalidMessage);
    console.log('Validation Test Result:', {
      success: result.success,
      errorCount: result.errors.length,
      errors: result.errors
    });
    console.log('✅ Validation error test complete\n');
  } catch (error) {
    console.error('❌ Validation test failed:', error);
  }

  // Test 5: Batch Processing
  console.log('5. Testing Batch Processing...');
  const batchMessages: RawChannelMessage[] = [
    {
      channel: ChannelType.SMS,
      externalId: 'batch_sms_1',
      from: '+1111111111',
      to: '+0987654321',
      content: 'Batch message 1',
      timestamp: new Date(),
      metadata: {}
    },
    {
      channel: ChannelType.SMS,
      externalId: 'batch_sms_2',
      from: '+2222222222',
      to: '+0987654321',
      content: 'Batch message 2',
      timestamp: new Date(),
      metadata: {}
    },
    {
      channel: ChannelType.WHATSAPP,
      externalId: 'batch_wa_1',
      from: '+3333333333',
      to: '+0987654321',
      content: 'Batch WhatsApp message',
      timestamp: new Date(),
      metadata: {}
    }
  ];

  try {
    const batchResult = await messageService.processBatch(batchMessages);
    console.log('Batch Processing Result:', {
      totalMessages: batchResult.totalMessages,
      successCount: batchResult.successCount,
      failureCount: batchResult.failureCount,
      processingTime: `${batchResult.processingTime}ms`
    });
    console.log('✅ Batch processing test complete\n');
  } catch (error) {
    console.error('❌ Batch processing test failed:', error);
  }

  console.log('🎉 Message Normalization Service Tests Complete!');
}

// Export for use in other test files
export { testMessageNormalization };

// Run tests if this file is executed directly
if (require.main === module) {
  testMessageNormalization().catch(console.error);
}