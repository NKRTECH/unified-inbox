import { useState, useEffect, useCallback, useRef } from 'react';
import { callService, CallState, CallOptions } from '@/lib/services/call-service';

export interface UseVoiceCallReturn {
  // State
  isInitialized: boolean;
  currentCall: CallState | null;
  isConnecting: boolean;
  isMuted: boolean;
  error: string | null;
  
  // Actions
  initializeDevice: () => Promise<void>;
  makeCall: (options: CallOptions) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => Promise<void>;
  clearError: () => void;
}

export function useVoiceCall(): UseVoiceCallReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentCall, setCurrentCall] = useState<CallState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const incomingCallRef = useRef<any>(null);

  /**
   * Initialize the Twilio Voice SDK
   */
  const initializeDevice = useCallback(async () => {
    try {
      setError(null);
      
      // Get access token from API
      const response = await fetch('/api/integrations/twilio/access-token', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
      });
      
      if (response.status === 401) {
        throw new Error('Please log in to use VoIP calling');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get access token');
      }
      
      const { accessToken } = await response.json();
      
      // Initialize the call service
      await callService.initialize(accessToken);
      setIsInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize voice service';
      setError(errorMessage);
      console.error('Failed to initialize voice service:', err);
    }
  }, []);

  /**
   * Make an outbound call
   */
  const makeCall = useCallback(async (options: CallOptions) => {
    try {
      setError(null);
      setIsConnecting(true);
      
      const callState = await callService.makeCall(options);
      setCurrentCall(callState);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to make call';
      setError(errorMessage);
      console.error('Failed to make call:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Answer an incoming call
   */
  const answerCall = useCallback(async () => {
    try {
      setError(null);
      
      if (incomingCallRef.current) {
        await callService.answerCall(incomingCallRef.current);
        const callState = callService.getCurrentCallState();
        setCurrentCall(callState);
        incomingCallRef.current = null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to answer call';
      setError(errorMessage);
      console.error('Failed to answer call:', err);
    }
  }, []);

  /**
   * Reject an incoming call
   */
  const rejectCall = useCallback(async () => {
    try {
      setError(null);
      
      if (incomingCallRef.current) {
        await callService.rejectCall(incomingCallRef.current);
        incomingCallRef.current = null;
        setCurrentCall(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject call';
      setError(errorMessage);
      console.error('Failed to reject call:', err);
    }
  }, []);

  /**
   * Hang up the current call
   */
  const hangUp = useCallback(async () => {
    try {
      setError(null);
      
      await callService.hangUp();
      setCurrentCall(null);
      setIsMuted(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to hang up call';
      setError(errorMessage);
      console.error('Failed to hang up call:', err);
    }
  }, []);

  /**
   * Toggle mute/unmute
   */
  const toggleMute = useCallback(async () => {
    try {
      setError(null);
      
      const newMuteState = await callService.toggleMute();
      setIsMuted(newMuteState);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle mute';
      setError(errorMessage);
      console.error('Failed to toggle mute:', err);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle incoming call events
   */
  useEffect(() => {
    const handleIncomingCall = (event: CustomEvent) => {
      const { call, callRecord, contact } = event.detail;
      
      incomingCallRef.current = call;
      setCurrentCall({
        id: callRecord.id,
        contactId: callRecord.contactId,
        status: callRecord.status,
        direction: callRecord.direction,
      });
      
      // You could also show a notification or modal here
      console.log('Incoming call from:', contact.name || contact.phone);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('incomingCall', handleIncomingCall as EventListener);
      
      return () => {
        window.removeEventListener('incomingCall', handleIncomingCall as EventListener);
      };
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isInitialized) {
        callService.destroy().catch(console.error);
      }
    };
  }, [isInitialized]);

  /**
   * Don't auto-initialize - let components decide when to initialize
   * This prevents authentication errors on page load
   */

  return {
    // State
    isInitialized,
    currentCall,
    isConnecting,
    isMuted,
    error,
    
    // Actions
    initializeDevice,
    makeCall,
    answerCall,
    rejectCall,
    hangUp,
    toggleMute,
    clearError,
  };
}