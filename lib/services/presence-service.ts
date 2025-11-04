/**
 * Presence Service
 * Manages user presence tracking in conversations
 */

export interface PresenceUser {
  userId: string;
  userName: string;
  userEmail?: string;
  conversationId: string;
  status: 'viewing' | 'editing';
  lastSeen: Date;
}

export interface PresenceState {
  conversationId: string;
  users: PresenceUser[];
}

/**
 * In-memory presence tracking service
 * Tracks which users are currently active in conversations
 */
class PresenceService {
  private presence: Map<string, Map<string, PresenceUser>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly STALE_THRESHOLD = 60000; // 60 seconds

  constructor() {
    this.startCleanup();
  }

  /**
   * Start periodic cleanup of stale presence data
   */
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStalePresence();
    }, 30000); // Run every 30 seconds
  }

  /**
   * Clean up stale presence entries
   */
  private cleanupStalePresence() {
    const now = Date.now();
    let cleanedCount = 0;

    this.presence.forEach((users, conversationId) => {
      users.forEach((user, userId) => {
        if (now - user.lastSeen.getTime() > this.STALE_THRESHOLD) {
          users.delete(userId);
          cleanedCount++;
        }
      });

      // Remove empty conversation maps
      if (users.size === 0) {
        this.presence.delete(conversationId);
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} stale presence entries`);
    }
  }

  /**
   * Update user presence in a conversation
   */
  updatePresence(
    conversationId: string,
    userId: string,
    userName: string,
    status: 'viewing' | 'editing',
    userEmail?: string
  ): PresenceUser {
    if (!this.presence.has(conversationId)) {
      this.presence.set(conversationId, new Map());
    }

    const conversationPresence = this.presence.get(conversationId)!;
    const presenceUser: PresenceUser = {
      userId,
      userName,
      userEmail,
      conversationId,
      status,
      lastSeen: new Date(),
    };

    conversationPresence.set(userId, presenceUser);
    return presenceUser;
  }

  /**
   * Remove user presence from a conversation
   */
  removePresence(conversationId: string, userId: string): boolean {
    const conversationPresence = this.presence.get(conversationId);
    if (!conversationPresence) return false;

    const removed = conversationPresence.delete(userId);

    // Clean up empty conversation maps
    if (conversationPresence.size === 0) {
      this.presence.delete(conversationId);
    }

    return removed;
  }

  /**
   * Get all active users in a conversation
   */
  getConversationPresence(conversationId: string): PresenceUser[] {
    const conversationPresence = this.presence.get(conversationId);
    if (!conversationPresence) return [];

    return Array.from(conversationPresence.values());
  }

  /**
   * Get all conversations a user is present in
   */
  getUserPresence(userId: string): PresenceState[] {
    const states: PresenceState[] = [];

    this.presence.forEach((users, conversationId) => {
      if (users.has(userId)) {
        states.push({
          conversationId,
          users: Array.from(users.values()),
        });
      }
    });

    return states;
  }

  /**
   * Remove user from all conversations
   */
  removeUserFromAll(userId: string): number {
    let removedCount = 0;

    this.presence.forEach((users, conversationId) => {
      if (users.delete(userId)) {
        removedCount++;
      }

      // Clean up empty conversation maps
      if (users.size === 0) {
        this.presence.delete(conversationId);
      }
    });

    return removedCount;
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalUsers = 0;
    const conversationStats: Array<{ conversationId: string; userCount: number }> = [];

    this.presence.forEach((users, conversationId) => {
      totalUsers += users.size;
      conversationStats.push({
        conversationId,
        userCount: users.size,
      });
    });

    return {
      totalConversations: this.presence.size,
      totalUsers,
      conversationStats,
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.presence.clear();
  }
}

// Singleton instance
export const presenceService = new PresenceService();
