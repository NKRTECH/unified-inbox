/**
 * Integration factory for creating channel senders and integrations
 */

import { ChannelType } from './types';
import { ChannelSender, ChannelIntegration } from './interfaces';

/**
 * Registry of available channel integrations
 */
class IntegrationRegistry {
  private senderFactories = new Map<ChannelType, () => ChannelSender>();
  private integrationFactories = new Map<ChannelType, () => ChannelIntegration>();

  /**
   * Register a sender factory for a channel type
   */
  registerSender(channelType: ChannelType, factory: () => ChannelSender): void {
    this.senderFactories.set(channelType, factory);
  }

  /**
   * Register an integration factory for a channel type
   */
  registerIntegration(channelType: ChannelType, factory: () => ChannelIntegration): void {
    this.integrationFactories.set(channelType, factory);
  }

  /**
   * Get a sender factory for a channel type
   */
  getSenderFactory(channelType: ChannelType): (() => ChannelSender) | undefined {
    return this.senderFactories.get(channelType);
  }

  /**
   * Get an integration factory for a channel type
   */
  getIntegrationFactory(channelType: ChannelType): (() => ChannelIntegration) | undefined {
    return this.integrationFactories.get(channelType);
  }

  /**
   * Get all registered channel types
   */
  getRegisteredChannels(): ChannelType[] {
    return Array.from(this.senderFactories.keys());
  }

  /**
   * Check if a channel type is registered
   */
  isChannelRegistered(channelType: ChannelType): boolean {
    return this.senderFactories.has(channelType);
  }
}

// Global registry instance
const registry = new IntegrationRegistry();

/**
 * Create a sender for the specified channel type
 */
export function createSender(channelType: ChannelType): ChannelSender {
  const factory = registry.getSenderFactory(channelType);
  
  if (!factory) {
    throw new Error(`No sender registered for channel type: ${channelType}`);
  }

  return factory();
}

/**
 * Create an integration for the specified channel type
 */
export function createIntegration(channelType: ChannelType): ChannelIntegration {
  const factory = registry.getIntegrationFactory(channelType);
  
  if (!factory) {
    throw new Error(`No integration registered for channel type: ${channelType}`);
  }

  return factory();
}

/**
 * Register a sender factory for a channel type
 */
export function registerSender(channelType: ChannelType, factory: () => ChannelSender): void {
  registry.registerSender(channelType, factory);
}

/**
 * Register an integration factory for a channel type
 */
export function registerIntegration(channelType: ChannelType, factory: () => ChannelIntegration): void {
  registry.registerIntegration(channelType, factory);
}

/**
 * Get all registered channel types
 */
export function getRegisteredChannels(): ChannelType[] {
  return registry.getRegisteredChannels();
}

/**
 * Check if a channel type is registered
 */
export function isChannelRegistered(channelType: ChannelType): boolean {
  return registry.isChannelRegistered(channelType);
}

/**
 * Get available senders for all registered channels
 */
export function getAvailableSenders(): Record<ChannelType, ChannelSender> {
  const senders: Partial<Record<ChannelType, ChannelSender>> = {};
  
  for (const channelType of registry.getRegisteredChannels()) {
    try {
      senders[channelType] = createSender(channelType);
    } catch (error) {
      console.warn(`Failed to create sender for ${channelType}:`, error);
    }
  }
  
  return senders as Record<ChannelType, ChannelSender>;
}

/**
 * Validate that all required channels are registered
 */
export function validateRequiredChannels(requiredChannels: ChannelType[]): { 
  isValid: boolean; 
  missingChannels: ChannelType[] 
} {
  const missingChannels = requiredChannels.filter(channel => !registry.isChannelRegistered(channel));
  
  return {
    isValid: missingChannels.length === 0,
    missingChannels
  };
}

// Export the registry for advanced use cases
export { registry as integrationRegistry };