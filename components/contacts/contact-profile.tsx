'use client';

import { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, MessageSquare, Mail, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVoiceCall } from '@/lib/hooks/use-voice-call';
import { CallStatus, Direction } from '@prisma/client';

interface Contact {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  socialHandles?: any;
  tags: string[];
  customFields?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface CallHistoryItem {
  id: string;
  status: CallStatus;
  direction: Direction;
  duration?: number;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

interface ContactProfileProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (contactId: string, channel: 'SMS' | 'WHATSAPP') => void;
}

export function ContactProfile({ contact, isOpen, onClose, onSendMessage }: ContactProfileProps) {
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const {
    isInitialized,
    currentCall,
    isConnecting,
    isMuted,
    error,
    makeCall,
    answerCall,
    rejectCall,
    hangUp,
    toggleMute,
    clearError,
  } = useVoiceCall();

  /**
   * Load call history for the contact
   */
  useEffect(() => {
    if (contact?.id && isOpen) {
      loadCallHistory();
    }
  }, [contact?.id, isOpen]);

  const loadCallHistory = async () => {
    if (!contact?.id) return;
    
    try {
      setLoadingHistory(true);
      const response = await fetch(`/api/contacts/${contact.id}/calls`);
      
      if (response.ok) {
        const history = await response.json();
        setCallHistory(history);
      }
    } catch (error) {
      console.error('Failed to load call history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  /**
   * Handle making a call
   */
  const handleMakeCall = async () => {
    if (!contact?.phone || !contact?.id) return;
    
    try {
      await makeCall({
        contactId: contact.id,
        phoneNumber: contact.phone,
      });
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = (channel: 'SMS' | 'WHATSAPP') => {
    if (contact?.id && onSendMessage) {
      onSendMessage(contact.id, channel);
      onClose();
    }
  };

  /**
   * Format call duration
   */
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Get call status badge color
   */
  const getCallStatusColor = (status: CallStatus): string => {
    switch (status) {
      case CallStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case CallStatus.FAILED:
      case CallStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case CallStatus.NO_ANSWER:
        return 'bg-yellow-100 text-yellow-800';
      case CallStatus.ACTIVE:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get direction icon
   */
  const getDirectionIcon = (direction: Direction) => {
    return direction === Direction.INBOUND ? '↓' : '↑';
  };

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {contact.name || 'Unknown Contact'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                {error}
                <Button variant="ghost" size="sm" onClick={clearError}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contact.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm">{contact.phone}</p>
                  </div>
                )}
                
                {contact.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{contact.email}</p>
                  </div>
                )}
              </div>

              {contact.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contact.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {/* Call Controls */}
                {contact.phone && (
                  <>
                    {!currentCall ? (
                      <Button
                        onClick={handleMakeCall}
                        disabled={!isInitialized || isConnecting}
                        className="flex items-center gap-2"
                      >
                        {isConnecting ? (
                          <>
                            <PhoneCall className="h-4 w-4 animate-pulse" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Phone className="h-4 w-4" />
                            Call
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {currentCall.status === CallStatus.RINGING && currentCall.direction === Direction.INBOUND ? (
                          <>
                            <Button onClick={answerCall} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                              <Phone className="h-4 w-4" />
                              Answer
                            </Button>
                            <Button onClick={rejectCall} variant="destructive" className="flex items-center gap-2">
                              <PhoneOff className="h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={hangUp} variant="destructive" className="flex items-center gap-2">
                              <PhoneOff className="h-4 w-4" />
                              Hang Up
                            </Button>
                            <Button onClick={toggleMute} variant="outline" className="flex items-center gap-2">
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
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Message Actions */}
                {contact.phone && (
                  <>
                    <Button
                      onClick={() => handleSendMessage('SMS')}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </Button>
                    <Button
                      onClick={() => handleSendMessage('WHATSAPP')}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </>
                )}

                {/* Email Action */}
                {contact.email && (
                  <Button
                    onClick={() => window.open(`mailto:${contact.email}`)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                )}
              </div>

              {/* Current Call Status */}
              {currentCall && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {currentCall.direction === Direction.INBOUND ? 'Incoming Call' : 'Outgoing Call'}
                      </p>
                      <p className="text-xs text-gray-600">
                        Status: {currentCall.status.toLowerCase().replace('_', ' ')}
                      </p>
                    </div>
                    <Badge className={getCallStatusColor(currentCall.status)}>
                      {currentCall.status}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call History */}
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <p className="text-sm text-gray-500">Loading call history...</p>
              ) : callHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No call history available</p>
              ) : (
                <div className="space-y-2">
                  {callHistory.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {getDirectionIcon(call.direction)}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {call.direction === Direction.INBOUND ? 'Incoming' : 'Outgoing'} Call
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(call.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {call.duration && (
                          <span className="text-xs text-gray-500">
                            {formatDuration(call.duration)}
                          </span>
                        )}
                        <Badge className={getCallStatusColor(call.status)}>
                          {call.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}