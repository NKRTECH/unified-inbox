'use client';

import MessageComposer from '@/components/inbox/message-composer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function TestComposerPage() {
  const handleMessageSent = (result: any) => {
    console.log('Message sent:', result);
    // Show success notification
    alert(`✅ Message sent successfully!\nMessage ID: ${result.messageId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Message Composer</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Send SMS and WhatsApp messages with intelligent trial account handling. 
              The composer automatically detects your account type and provides appropriate guidance.
            </p>
          </div>

          {/* Main Composer Card */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <CardTitle className="text-xl font-semibold flex items-center">
                <MessageSquare className="h-6 w-6 mr-2" />
                Send Message
              </CardTitle>
              <CardDescription className="text-blue-100">
                Compose and send messages across multiple channels with smart validation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <MessageComposer 
                onMessageSent={handleMessageSent}
              />
            </CardContent>
          </Card>

          {/* Test Numbers Guide */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-green-300 shadow-md">
              <CardHeader className="bg-green-100">
                <CardTitle className="text-green-900 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Verified Number
                </CardTitle>
                <CardDescription className="text-green-800">
                  Use this number to test successful message delivery
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="font-mono text-lg font-semibold text-green-900 bg-white border border-green-300 px-3 py-2 rounded-lg">
                    +919142215912
                  </div>
                  <p className="text-sm text-green-800 font-medium">
                    ✅ This number is verified for trial accounts and should work for both SMS and WhatsApp
                  </p>
                  <div className="flex items-center text-xs text-green-800">
                    <Info className="h-3 w-3 mr-1" />
                    Messages to this number will be delivered successfully
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-300 shadow-md">
              <CardHeader className="bg-orange-100">
                <CardTitle className="text-orange-900 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Unverified Number
                </CardTitle>
                <CardDescription className="text-orange-800">
                  Use this to test trial account restrictions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="font-mono text-lg font-semibold text-orange-900 bg-white border border-orange-300 px-3 py-2 rounded-lg">
                    +15551234567
                  </div>
                  <p className="text-sm text-orange-800 font-medium">
                    ⚠️ This will trigger the trial restriction dialog and show available options
                  </p>
                  <div className="flex items-center text-xs text-orange-800">
                    <Info className="h-3 w-3 mr-1" />
                    Demonstrates the user-friendly trial account handling
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Overview */}
          <Card className="border-blue-300 shadow-md">
            <CardHeader className="bg-blue-100">
              <CardTitle className="text-blue-900">Features & Capabilities</CardTitle>
              <CardDescription className="text-blue-800">
                What makes this message composer special
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Smart Validation</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Real-time phone number validation
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Trial account detection
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Verified number checking
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Character count limits
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">User Experience</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Informative dialogs instead of blocking
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Multiple resolution options
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Educational guidance
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Professional upgrade prompts
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}