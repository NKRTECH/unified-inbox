/**
 * Integration initialization and exports
 * This file ensures all integrations are properly registered when imported
 */

// Import all integrations to trigger auto-registration
import './twilio';

// Re-export factory functions and types
export * from './factory';
export * from './types';
export * from './interfaces';

// Re-export specific integrations
export * from './twilio';

// Ensure integrations are registered on import
console.log('All integrations initialized and registered');