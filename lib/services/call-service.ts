import { Device } from '@twilio/voice-sdk';
import { prisma } from '@/lib/prisma';
import { CallStatus, Direction } from '@prisma/client';

export interface CallState {
  id: string;
  contactId: string;
  status: CallStatus;
  direction: Direction;
  duration?: number;
  startedAt?: Date;
  endedAt?: Date;
}

export interface CallOptions {
  contactId: string;
  phoneNumber: string;
  userId?: string;
}

export class CallService {
  private device: Device | null = null;
  private currentCall: any = null;
  private accessToken: string | null = null;

  /**
   * Initialize the Twilio Voice SDK Device
   */
  async initialize(accessToken: string): Promise<void> {
    try {
      this.accessToken = accessToken;
      
      // Create and setup the Device
      this.device = new Device(accessToken, {
        logLevel: 'warn',
        allowIncomingWhileBusy: false,
      });

      // Setup event listeners
      this.setupDeviceEventListeners();

      // Register the device
      await this.device.register();
      
      console.log('Twilio Voice SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twilio Voice SDK:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for the Device
   */
  private setupDeviceEventListeners(): void {
    if (!this.device) return;

    this.device.on('registered', () => {
      console.log('Device registered for incoming calls');
    });

    this.device.on('error', (error) => {
      console.error('Device error:', error);
    });

    this.device.on('incoming', (call) => {
      console.log('Incoming call received');
      this.handleIncomingCall(call);
    });

    this.device.on('tokenWillExpire', () => {
      console.log('Access token will expire, refreshing...');
      this.refreshAccessToken();
    });
  }

  /**
   * Make an outbound call
   */
  async makeCall(options: CallOptions): Promise<CallState> {
    if (!this.device) {
      throw new Error('Device not initialized. Call initialize() first.');
    }

    try {
      // Create call record in database
      const callRecord = await prisma.call.create({
        data: {
          contactId: options.contactId,
          initiatorId: options.userId,
          direction: Direction.OUTBOUND,
          status: CallStatus.INITIATED,
        },
        include: {
          contact: true,
          initiator: true,
        },
      });

      // Make the call using Twilio Voice SDK
      const call = await this.device.connect({
        params: {
          To: options.phoneNumber,
          CallId: callRecord.id,
        },
      });

      this.currentCall = call;
      this.setupCallEventListeners(call, callRecord.id);

      return {
        id: callRecord.id,
        contactId: callRecord.contactId,
        status: callRecord.status,
        direction: callRecord.direction,
      };
    } catch (error) {
      console.error('Failed to make call:', error);
      throw error;
    }
  }

  /**
   * Answer an incoming call
   */
  async answerCall(call: any): Promise<void> {
    try {
      await call.accept();
      this.currentCall = call;
      
      // Update call status in database
      const callId = call.parameters.CallId;
      if (callId) {
        await this.updateCallStatus(callId, CallStatus.ACTIVE, new Date());
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(call: any): Promise<void> {
    try {
      await call.reject();
      
      // Update call status in database
      const callId = call.parameters.CallId;
      if (callId) {
        await this.updateCallStatus(callId, CallStatus.CANCELLED);
      }
    } catch (error) {
      console.error('Failed to reject call:', error);
      throw error;
    }
  }

  /**
   * Hang up the current call
   */
  async hangUp(): Promise<void> {
    if (!this.currentCall) {
      throw new Error('No active call to hang up');
    }

    try {
      await this.currentCall.disconnect();
      this.currentCall = null;
    } catch (error) {
      console.error('Failed to hang up call:', error);
      throw error;
    }
  }

  /**
   * Mute/unmute the current call
   */
  async toggleMute(): Promise<boolean> {
    if (!this.currentCall) {
      throw new Error('No active call to mute/unmute');
    }

    try {
      const isMuted = this.currentCall.isMuted();
      if (isMuted) {
        this.currentCall.mute(false);
      } else {
        this.currentCall.mute(true);
      }
      return !isMuted;
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      throw error;
    }
  }

  /**
   * Get the current call state
   */
  getCurrentCallState(): CallState | null {
    if (!this.currentCall) return null;

    return {
      id: this.currentCall.parameters?.CallId || 'unknown',
      contactId: this.currentCall.parameters?.ContactId || 'unknown',
      status: this.getCallStatusFromTwilioState(this.currentCall.status()),
      direction: Direction.OUTBOUND, // Will be updated based on actual call direction
    };
  }

  /**
   * Setup event listeners for a specific call
   */
  private setupCallEventListeners(call: any, callId: string): void {
    call.on('accept', () => {
      console.log('Call accepted');
      this.updateCallStatus(callId, CallStatus.ACTIVE, new Date());
    });

    call.on('disconnect', () => {
      console.log('Call disconnected');
      this.updateCallStatus(callId, CallStatus.COMPLETED, undefined, new Date());
      this.currentCall = null;
    });

    call.on('cancel', () => {
      console.log('Call cancelled');
      this.updateCallStatus(callId, CallStatus.CANCELLED);
      this.currentCall = null;
    });

    call.on('error', (error: any) => {
      console.error('Call error:', error);
      this.updateCallStatus(callId, CallStatus.FAILED);
      this.currentCall = null;
    });

    call.on('ringing', () => {
      console.log('Call ringing');
      this.updateCallStatus(callId, CallStatus.RINGING);
    });
  }

  /**
   * Handle incoming calls
   */
  private async handleIncomingCall(call: any): Promise<void> {
    try {
      // Extract caller information
      const fromNumber = call.parameters.From;
      
      // Find or create contact
      let contact = await prisma.contact.findFirst({
        where: { phone: fromNumber },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            phone: fromNumber,
            name: `Unknown Caller (${fromNumber})`,
          },
        });
      }

      // Create call record
      const callRecord = await prisma.call.create({
        data: {
          contactId: contact.id,
          twilioCallSid: call.parameters.CallSid,
          direction: Direction.INBOUND,
          status: CallStatus.RINGING,
        },
      });

      // Setup call event listeners
      this.setupCallEventListeners(call, callRecord.id);

      // Emit event for UI to handle incoming call
      this.emitIncomingCallEvent({
        call,
        callRecord,
        contact,
      });
    } catch (error) {
      console.error('Failed to handle incoming call:', error);
    }
  }

  /**
   * Update call status in database
   */
  private async updateCallStatus(
    callId: string,
    status: CallStatus,
    startedAt?: Date,
    endedAt?: Date
  ): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (startedAt) updateData.startedAt = startedAt;
      if (endedAt) {
        updateData.endedAt = endedAt;
        // Calculate duration if we have both start and end times
        const call = await prisma.call.findUnique({
          where: { id: callId },
          select: { startedAt: true },
        });
        
        if (call?.startedAt) {
          updateData.duration = Math.floor(
            (endedAt.getTime() - call.startedAt.getTime()) / 1000
          );
        }
      }

      await prisma.call.update({
        where: { id: callId },
        data: updateData,
      });
    } catch (error) {
      console.error('Failed to update call status:', error);
    }
  }

  /**
   * Convert Twilio call status to our CallStatus enum
   */
  private getCallStatusFromTwilioState(twilioStatus: string): CallStatus {
    switch (twilioStatus) {
      case 'pending':
        return CallStatus.INITIATED;
      case 'ringing':
        return CallStatus.RINGING;
      case 'open':
        return CallStatus.ACTIVE;
      case 'closed':
        return CallStatus.COMPLETED;
      default:
        return CallStatus.INITIATED;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      // Call API to get new access token
      const response = await fetch('/api/integrations/twilio/access-token', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }
      
      const { accessToken } = await response.json();
      
      if (this.device) {
        this.device.updateToken(accessToken);
        this.accessToken = accessToken;
      }
    } catch (error) {
      console.error('Failed to refresh access token:', error);
    }
  }

  /**
   * Emit incoming call event (to be handled by UI)
   */
  private emitIncomingCallEvent(data: any): void {
    // This would typically emit to a WebSocket or event system
    // For now, we'll use a custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('incomingCall', { detail: data })
      );
    }
  }

  /**
   * Get call history for a contact
   */
  async getCallHistory(contactId: string): Promise<CallState[]> {
    try {
      const calls = await prisma.call.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
        include: {
          contact: true,
          initiator: true,
        },
      });

      return calls.map(call => ({
        id: call.id,
        contactId: call.contactId,
        status: call.status,
        direction: call.direction,
        duration: call.duration || undefined,
        startedAt: call.startedAt || undefined,
        endedAt: call.endedAt || undefined,
      }));
    } catch (error) {
      console.error('Failed to get call history:', error);
      throw error;
    }
  }

  /**
   * Cleanup and destroy the device
   */
  async destroy(): Promise<void> {
    try {
      if (this.currentCall) {
        await this.hangUp();
      }
      
      if (this.device) {
        this.device.destroy();
        this.device = null;
      }
      
      this.accessToken = null;
    } catch (error) {
      console.error('Failed to destroy call service:', error);
    }
  }
}

// Export singleton instance
export const callService = new CallService();