'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Send, 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle,
  Phone,
  MessageSquare,
  Info,
  Loader2
} from 'lucide-react';
import { 
  isPhoneNumberVerified, 
  getAccountTrialStatus, 
  formatPhoneNumber, 
  isValidPhoneNumber 
} from '@/lib/utils/trial-validation';

interface MessageComposerProps {
  recipientNumber?: string;
  onMessageSent?: (result: any) => void;
  className?: string;
}

type ChannelType = 'SMS' | 'WHATSAPP';

interface TrialStatus {
  isTrial: boolean;
  verifiedNumbers: string[];
}

export default function MessageComposer({ 
  recipientNumber = '', 
  onMessageSent,
  className = ''
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState(recipientNumber);
  const [channel, setChannel] = useState<ChannelType>('SMS');
  const [sending, setSending] = useState(false);
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({ isTrial: false, verifiedNumbers: [] });
  const [showTrialWarning, setShowTrialWarning] = useState(false);
  const [isRecipientVerified, setIsRecipientVerified] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load trial status on component mount
  useEffect(() => {
    loadTrialStatus();
  }, []);

  // Check recipient verification when recipient or trial status changes
  useEffect(() => {
    if (recipient && trialStatus.isTrial) {
      checkRecipientVerification();
    } else {
      setIsRecipientVerified(true); // Paid accounts can send to anyone
    }
  }, [recipient, trialStatus]);

  const loadTrialStatus = async () => {
    try {
      const status = await getAccountTrialStatus();
      setTrialStatus(status);
    } catch (error) {
      console.error('Failed to load trial status:', error);
    }
  };

  const checkRecipientVerification = async () => {
    if (!recipient || !trialStatus.isTrial) {
      setIsRecipientVerified(true);
      return;
    }

    const formattedNumber = formatPhoneNumber(recipient);
    const verified = await isPhoneNumberVerified(formattedNumber);
    setIsRecipientVerified(verified);
  };

  const validateInput = (): string | null => {
    if (!message.trim()) {
      return 'Message content is required';
    }

    if (!recipient.trim()) {
      return 'Recipient phone number is required';
    }

    const formattedNumber = formatPhoneNumber(recipient);
    if (!isValidPhoneNumber(formattedNumber)) {
      return 'Please enter a valid phone number in international format (e.g., +1234567890)';
    }

    if (channel === 'WHATSAPP' && message.length > 4096) {
      return 'WhatsApp messages cannot exceed 4096 characters';
    }

    if (channel === 'SMS' && message.length > 1600) {
      return 'SMS messages cannot exceed 1600 characters';
    }

    return null;
  };

  const handleSend = async () => {
    // Validate input
    const error = validateInput();
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    const formattedNumber = formatPhoneNumber(recipient);

    // Check trial restrictions
    if (trialStatus.isTrial && !isRecipientVerified) {
      setShowTrialWarning(true);
      return;
    }

    // Send the message
    await sendMessage(formattedNumber);
  };

  const sendMessage = async (formattedNumber: string) => {
    setSending(true);
    
    try {
      const endpoint = channel === 'WHATSAPP' 
        ? '/api/messages/whatsapp/send'
        : '/api/messages/sms/send';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedNumber,
          content: message,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Clear form on success
        setMessage('');
        setValidationError(null);
        
        // Notify parent component
        onMessageSent?.(result);
        
        // Show success message
        alert(`${channel} message sent successfully!`);
      } else {
        setValidationError(result.error || 'Failed to send message');
      }
    } catch (error) {
      setValidationError('Network error. Please try again.');
      console.error('Send message error:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTrialWarningConfirm = async () => {
    setShowTrialWarning(false);
    // User confirmed they want to try anyway - this will likely fail but let them see the error
    const formattedNumber = formatPhoneNumber(recipient);
    await sendMessage(formattedNumber);
  };

  const getChannelIcon = (channelType: ChannelType) => {
    return channelType === 'WHATSAPP' ? <MessageSquare className="h-4 w-4" /> : <Phone className="h-4 w-4" />;
  };

  const getRecipientStatus = () => {
    if (!trialStatus.isTrial) {
      return (
        <div className="flex items-center px-3 py-2 bg-green-100 border border-green-300 rounded-lg">
          <CheckCircle className="h-4 w-4 mr-2 text-green-700" />
          <span className="text-sm font-medium text-green-900">Paid account - can send to any number</span>
        </div>
      );
    }

    if (!recipient) {
      return null;
    }

    if (isRecipientVerified) {
      return (
        <div className="flex items-center px-3 py-2 bg-green-100 border border-green-300 rounded-lg">
          <CheckCircle className="h-4 w-4 mr-2 text-green-700" />
          <span className="text-sm font-medium text-green-900">Verified number - ready to send</span>
        </div>
      );
    }

    return (
      <div className="flex items-center px-3 py-2 bg-orange-100 border border-orange-300 rounded-lg">
        <AlertTriangle className="h-4 w-4 mr-2 text-orange-700" />
        <span className="text-sm font-medium text-orange-900">Unverified number - trial restriction applies</span>
      </div>
    );
  };

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        {/* Trial Account Info */}
        {trialStatus.isTrial && (
          <Alert className="border-blue-300 bg-blue-100">
            <Info className="h-4 w-4 text-blue-700" />
            <AlertDescription className="text-blue-900">
              <span className="font-medium">Trial Account:</span> You can send messages to verified numbers. 
              <a 
                href="/settings/integrations" 
                className="ml-1 text-blue-800 hover:text-blue-900 underline font-medium"
              >
                Manage verified numbers
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recipient Input */}
          <div className="space-y-3">
            <Label htmlFor="recipient" className="text-sm font-semibold text-gray-900">
              Recipient Phone Number
            </Label>
            <div className="space-y-2">
              <Input
                id="recipient"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="h-11 text-base text-gray-900 placeholder-gray-500 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              {getRecipientStatus()}
            </div>
          </div>

          {/* Channel Selection */}
          <div className="space-y-3">
            <Label htmlFor="channel" className="text-sm font-semibold text-gray-900">
              Channel
            </Label>
            <Select value={channel} onValueChange={(value: ChannelType) => setChannel(value)}>
              <SelectTrigger className="h-11 text-gray-900 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue className="text-gray-900" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                <SelectItem value="SMS" className="cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center py-1">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mr-3">
                      <Phone className="h-4 w-4 text-blue-700" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">SMS</div>
                      <div className="text-xs text-gray-600">Text messages</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="WHATSAPP" className="cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center py-1">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mr-3">
                      <MessageSquare className="h-4 w-4 text-green-700" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">WhatsApp</div>
                      <div className="text-xs text-gray-600">Rich messaging</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Message Input */}
        <div className="space-y-3">
          <Label htmlFor="message" className="text-sm font-semibold text-gray-900">
            Message Content
          </Label>
          <div className="space-y-2">
            <textarea
              id="message"
              rows={5}
              className="block w-full border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900 bg-white resize-none transition-colors"
              placeholder={`Type your ${channel} message...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={channel === 'WHATSAPP' ? 4096 : 1600}
            />
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center text-gray-700">
                <Info className="h-3 w-3 mr-1 text-gray-600" />
                <span className="text-gray-700">
                  {channel === 'WHATSAPP' ? 'WhatsApp supports *bold*, _italic_, and ```code```' : 'SMS - keep it concise for best delivery'}
                </span>
              </div>
              <span className={`text-xs font-medium ${
                message.length > (channel === 'WHATSAPP' ? 3500 : 1400) 
                  ? 'text-orange-700' 
                  : 'text-gray-700'
              }`}>
                {message.length}/{channel === 'WHATSAPP' ? '4096' : '1600'}
              </span>
            </div>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive" className="border-red-400 bg-red-100">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            <AlertDescription className="text-red-900 font-medium">{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Send Button */}
        <div className="pt-2">
          <Button 
            onClick={handleSend}
            disabled={sending || !message.trim() || !recipient.trim()}
            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin text-white" />
                <span className="text-white">Sending...</span>
              </>
            ) : (
              <>
                {getChannelIcon(channel)}
                <Send className="h-4 w-4 ml-2 text-white" />
                <span className="text-white">Send {channel} Message</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Trial Warning Dialog */}
      <Dialog open={showTrialWarning} onOpenChange={setShowTrialWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-700" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Trial Account Restriction
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              You're trying to send to <span className="font-semibold text-gray-900">{recipient}</span>, which isn't verified for your trial account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Your options:</h4>
              <ul className="space-y-2 text-sm text-blue-900">
                <li className="flex items-start">
                  <span className="font-medium mr-2">1.</span>
                  <span>Verify this number in <a href="/settings/integrations" className="underline font-medium text-blue-800 hover:text-blue-900">Settings → Integrations</a></span>
                </li>
                <li className="flex items-start">
                  <span className="font-medium mr-2">2.</span>
                  <span>Use a verified number: <span className="font-mono text-xs bg-white px-2 py-1 rounded border">{trialStatus.verifiedNumbers.join(', ')}</span></span>
                </li>
                <li className="flex items-start">
                  <span className="font-medium mr-2">3.</span>
                  <span>Upgrade to a paid account for unlimited messaging</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
              <p className="text-sm text-orange-900">
                <span className="font-medium">Note:</span> The message may be accepted but likely won't be delivered to unverified numbers.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowTrialWarning(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setShowTrialWarning(false);
                window.open('https://console.twilio.com/billing', '_blank');
              }}
              className="w-full sm:w-auto"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Upgrade Account
            </Button>
            <Button 
              onClick={handleTrialWarningConfirm}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
            >
              Try Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}