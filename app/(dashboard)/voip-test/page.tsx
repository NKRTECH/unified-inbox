'use client';

import { useState } from 'react';
import { Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactProfile } from '@/components/contacts/contact-profile';
import { VoIPIntegration } from '@/components/voip/voip-integration';
import { AuthDebug } from '@/components/debug/auth-debug';
import { useVoiceCall } from '@/lib/hooks/use-voice-call';

export default function VoIPTestPage() {
  const [testPhone, setTestPhone] = useState('');
  const [showContactProfile, setShowContactProfile] = useState(false);
  
  const { makeCall, isInitialized, isConnecting } = useVoiceCall();

  // Mock contact for testing
  const mockContact = {
    id: 'test-contact-1',
    name: 'Test Contact',
    phone: testPhone,
    email: 'test@example.com',
    tags: ['test', 'demo'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /**
   * Handle test call
   */
  const handleTestCall = async () => {
    if (!testPhone.trim()) return;
    
    try {
      await makeCall({
        contactId: 'test-contact-1',
        phoneNumber: testPhone,
      });
    } catch (error) {
      console.error('Failed to make test call:', error);
    }
  };

  /**
   * Handle message sending (mock)
   */
  const handleSendMessage = (contactId: string, channel: 'SMS' | 'WHATSAPP') => {
    console.log(`Sending ${channel} message to contact ${contactId}`);
    // In a real app, this would navigate to the message composer
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">VoIP Integration Test</h1>
          <p className="text-gray-600 mt-2">
            Test the Twilio VoIP integration with call controls and fallback SMS.
          </p>
        </div>

        {/* Auth Debug */}
        <AuthDebug />

        {/* VoIP Status */}
        <VoIPIntegration />

        {/* Test Call Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Test Call Interface
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter phone number (e.g., +1234567890)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleTestCall}
                disabled={!isInitialized || !testPhone.trim() || isConnecting}
                className="flex items-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Calling...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Call
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-sm text-gray-500">
              Enter a phone number to test the VoIP calling functionality.
              Make sure you have valid Twilio credentials configured.
            </p>
          </CardContent>
        </Card>

        {/* Contact Profile Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Profile Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Test the contact profile modal with integrated VoIP controls.
              </p>
              
              <Button
                onClick={() => setShowContactProfile(true)}
                disabled={!testPhone.trim()}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Open Contact Profile
              </Button>
              
              {!testPhone.trim() && (
                <p className="text-xs text-gray-500">
                  Enter a phone number above to enable the contact profile test.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Required Environment Variables:</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li><code>TWILIO_ACCOUNT_SID</code> - Your Twilio Account SID</li>
                <li><code>TWILIO_AUTH_TOKEN</code> - Your Twilio Auth Token</li>
                <li><code>TWILIO_API_KEY</code> - Twilio API Key for JWT generation</li>
                <li><code>TWILIO_API_SECRET</code> - Twilio API Secret for JWT generation</li>
                <li><code>TWILIO_APP_SID</code> - Twilio Application SID for VoIP</li>
              </ul>
              <p className="text-sm text-blue-600 mt-2">
                📖 See <code>TWILIO_VOIP_SETUP.md</code> for step-by-step setup instructions.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Browser Requirements:</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>WebRTC support (Chrome, Firefox, Safari, Edge)</li>
                <li>Microphone permissions</li>
                <li>HTTPS in production (required for WebRTC)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Outbound calling with Twilio Voice SDK</li>
                <li>Inbound call handling</li>
                <li>Call state management (ringing, active, ended)</li>
                <li>Mute/unmute controls</li>
                <li>Call history storage</li>
                <li>SMS fallback for unsupported browsers</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Profile Modal */}
      {testPhone && (
        <ContactProfile
          contact={mockContact}
          isOpen={showContactProfile}
          onClose={() => setShowContactProfile(false)}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
}