'use client';

import { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useVoiceCall } from '@/lib/hooks/use-voice-call';
import { useAuthStatus } from '@/lib/hooks/use-auth-status';
import { FallbackSMS } from '@/components/contacts/fallback-sms';
import { CallStatus, Direction } from '@prisma/client';

interface VoIPIntegrationProps {
  className?: string;
}

export function VoIPIntegration({ className }: VoIPIntegrationProps) {
  const [showFallbackSMS, setShowFallbackSMS] = useState(false);
  const [fallbackContact, setFallbackContact] = useState<{
    phone: string;
    name?: string;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [voipSupported, setVoipSupported] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAuthStatus();
  
  const {
    isInitialized,
    currentCall,
    isConnecting,
    isMuted,
    error,
    initializeDevice,
    answerCall,
    rejectCall,
    hangUp,
    toggleMute,
    clearError,
  } = useVoiceCall();

  /**
   * Check browser support on client side only
   */
  useEffect(() => {
    setIsClient(true);
    const supported = !!(
      typeof window !== 'undefined' &&
      window.RTCPeerConnection &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
    setVoipSupported(supported);
  }, []);

  /**
   * Handle VoIP not supported - show SMS fallback
   */
  const handleVoIPFallback = (phone: string, name?: string) => {
    setFallbackContact({ phone, name });
    setShowFallbackSMS(true);
  };

  /**
   * Format call duration for active calls
   */
  const formatCallDuration = (startTime: Date): string => {
    const now = new Date();
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Get call status display text
   */
  const getCallStatusText = (status: CallStatus): string => {
    switch (status) {
      case CallStatus.INITIATED:
        return 'Initiating...';
      case CallStatus.RINGING:
        return 'Ringing...';
      case CallStatus.ACTIVE:
        return 'Connected';
      case CallStatus.COMPLETED:
        return 'Call Ended';
      case CallStatus.FAILED:
        return 'Call Failed';
      case CallStatus.CANCELLED:
        return 'Call Cancelled';
      case CallStatus.NO_ANSWER:
        return 'No Answer';
      default:
        return status;
    }
  };

  /**
   * Get call status color
   */
  const getCallStatusColor = (status: CallStatus): string => {
    switch (status) {
      case CallStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case CallStatus.RINGING:
        return 'bg-blue-100 text-blue-800';
      case CallStatus.FAILED:
      case CallStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case CallStatus.NO_ANSWER:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading state during hydration
  if (!isClient || authLoading) {
    return (
      <Alert className="mb-4">
        <AlertDescription>
          Loading VoIP service...
        </AlertDescription>
      </Alert>
    );
  }

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <Alert className="mb-4">
        <AlertDescription className="flex items-center justify-between">
          Please log in to use VoIP calling features.
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/login'}
            className="ml-2 flex items-center gap-1"
          >
            <LogIn className="h-3 w-3" />
            Log In
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Don't render if VoIP is not supported
  if (!voipSupported) {
    return (
      <>
        <Alert className="mb-4">
          <AlertDescription>
            VoIP calling is not supported in this browser. You can still send SMS messages as a fallback.
          </AlertDescription>
        </Alert>
        
        {showFallbackSMS && fallbackContact && (
          <FallbackSMS
            isOpen={showFallbackSMS}
            onClose={() => setShowFallbackSMS(false)}
            contactPhone={fallbackContact.phone}
            contactName={fallbackContact.name}
          />
        )}
      </>
    );
  }

  return (
    <div className={className}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="space-y-2">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
            {error.includes('Twilio credentials') && (
              <div className="text-xs">
                <p>Missing VoIP credentials. Please add to your .env.local file:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>TWILIO_API_KEY</li>
                  <li>TWILIO_API_SECRET</li>
                  <li>TWILIO_APP_SID</li>
                </ul>
                <p className="mt-1">
                  See <code>TWILIO_VOIP_SETUP.md</code> for detailed setup instructions.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Initialization Status */}
      {!isInitialized && !error && (
        <Alert className="mb-4">
          <AlertDescription className="flex items-center justify-between">
            VoIP service not initialized. 
            <Button 
              variant="outline" 
              size="sm" 
              onClick={initializeDevice}
              className="ml-2"
            >
              Initialize VoIP
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Call Interface */}
      {currentCall && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5" />
                {currentCall.direction === Direction.INBOUND ? 'Incoming Call' : 'Outgoing Call'}
              </div>
              <Badge className={getCallStatusColor(currentCall.status)}>
                {getCallStatusText(currentCall.status)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Call Information */}
              <div className="text-center">
                <p className="text-lg font-medium">Contact ID: {currentCall.contactId}</p>
                {currentCall.status === CallStatus.ACTIVE && (
                  <p className="text-sm text-gray-500">
                    Duration: {formatCallDuration(new Date())}
                  </p>
                )}
              </div>

              {/* Call Controls */}
              <div className="flex justify-center gap-2">
                {currentCall.status === CallStatus.RINGING && currentCall.direction === Direction.INBOUND ? (
                  // Incoming call controls
                  <>
                    <Button
                      onClick={answerCall}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Phone className="h-4 w-4" />
                      Answer
                    </Button>
                    <Button
                      onClick={rejectCall}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <PhoneOff className="h-4 w-4" />
                      Reject
                    </Button>
                  </>
                ) : currentCall.status === CallStatus.ACTIVE ? (
                  // Active call controls
                  <>
                    <Button
                      onClick={toggleMute}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isMuted ? (
                        <>
                          <MicOff className="h-4 w-4" />
                          Unmute
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" />
                          Mute
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={hangUp}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <PhoneOff className="h-4 w-4" />
                      Hang Up
                    </Button>
                  </>
                ) : (
                  // Other states (connecting, failed, etc.)
                  <Button
                    onClick={hangUp}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <PhoneOff className="h-4 w-4" />
                    End Call
                  </Button>
                )}
              </div>

              {/* Fallback SMS Option */}
              {(currentCall.status === CallStatus.FAILED || 
                currentCall.status === CallStatus.NO_ANSWER ||
                currentCall.status === CallStatus.CANCELLED) && (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">
                    Call unsuccessful. Would you like to send an SMS instead?
                  </p>
                  <Button
                    onClick={() => handleVoIPFallback('', 'Contact')}
                    variant="outline"
                    size="sm"
                  >
                    Send SMS
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* VoIP Status Indicator */}
      {isInitialized && !currentCall && (
        <div className="text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            VoIP Ready
          </div>
        </div>
      )}

      {/* Fallback SMS Modal */}
      {showFallbackSMS && fallbackContact && (
        <FallbackSMS
          isOpen={showFallbackSMS}
          onClose={() => setShowFallbackSMS(false)}
          contactPhone={fallbackContact.phone}
          contactName={fallbackContact.name}
        />
      )}
    </div>
  );
}