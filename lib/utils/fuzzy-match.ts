/**
 * Fuzzy Matching Utilities
 * Provides fuzzy string matching for contact deduplication and search
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching and duplicate detection
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Calculate similarity score between two strings (0-1)
 * 1 = identical, 0 = completely different
 */
export function similarityScore(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLength;
}

/**
 * Normalize phone number for comparison
 * Removes all non-digit characters
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Normalize email for comparison
 * Converts to lowercase and trims whitespace
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalize name for comparison
 * Converts to lowercase, removes extra spaces, and trims
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two phone numbers are similar
 * Compares last 10 digits (handles country codes)
 */
export function arePhonesSimilar(phone1: string, phone2: string): boolean {
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);
  
  if (!normalized1 || !normalized2) return false;
  
  // Compare last 10 digits (handles different country code formats)
  const last10_1 = normalized1.slice(-10);
  const last10_2 = normalized2.slice(-10);
  
  return last10_1 === last10_2;
}

/**
 * Check if two emails are similar
 */
export function areEmailsSimilar(email1: string, email2: string): boolean {
  if (!email1 || !email2) return false;
  return normalizeEmail(email1) === normalizeEmail(email2);
}

/**
 * Check if two names are similar using fuzzy matching
 * Returns true if similarity score is above threshold
 */
export function areNamesSimilar(
  name1: string,
  name2: string,
  threshold: number = 0.85
): boolean {
  if (!name1 || !name2) return false;
  
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Fuzzy match
  const score = similarityScore(normalized1, normalized2);
  return score >= threshold;
}

/**
 * Calculate overall similarity between two contacts
 * Returns a score from 0-100
 */
export interface ContactSimilarity {
  score: number;
  reasons: string[];
  matchedFields: string[];
}

export function calculateContactSimilarity(
  contact1: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  },
  contact2: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  }
): ContactSimilarity {
  const reasons: string[] = [];
  const matchedFields: string[] = [];
  let score = 0;

  // Email match (highest weight: 40 points)
  if (contact1.email && contact2.email) {
    if (areEmailsSimilar(contact1.email, contact2.email)) {
      score += 40;
      reasons.push('Identical email addresses');
      matchedFields.push('email');
    }
  }

  // Phone match (high weight: 35 points)
  if (contact1.phone && contact2.phone) {
    if (arePhonesSimilar(contact1.phone, contact2.phone)) {
      score += 35;
      reasons.push('Identical phone numbers');
      matchedFields.push('phone');
    }
  }

  // Name match (medium weight: 25 points)
  if (contact1.name && contact2.name) {
    const nameScore = similarityScore(
      normalizeName(contact1.name),
      normalizeName(contact2.name)
    );
    
    if (nameScore >= 0.95) {
      score += 25;
      reasons.push('Nearly identical names');
      matchedFields.push('name');
    } else if (nameScore >= 0.85) {
      score += 20;
      reasons.push('Very similar names');
      matchedFields.push('name');
    } else if (nameScore >= 0.75) {
      score += 15;
      reasons.push('Similar names');
      matchedFields.push('name');
    }
  }

  return {
    score,
    reasons,
    matchedFields,
  };
}

/**
 * Determine if two contacts are likely duplicates
 * Returns true if similarity score is above threshold
 */
export function areLikelyDuplicates(
  contact1: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  },
  contact2: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  },
  threshold: number = 60
): boolean {
  const similarity = calculateContactSimilarity(contact1, contact2);
  return similarity.score >= threshold;
}

/**
 * Fuzzy search contacts by query string
 * Returns contacts sorted by relevance
 */
export function fuzzySearchContacts<T extends { name?: string | null; email?: string | null; phone?: string | null }>(
  contacts: T[],
  query: string
): Array<T & { relevanceScore: number }> {
  const normalizedQuery = query.toLowerCase().trim();
  
  return contacts
    .map((contact) => {
      let relevanceScore = 0;

      // Name matching
      if (contact.name) {
        const nameNormalized = contact.name.toLowerCase();
        if (nameNormalized.includes(normalizedQuery)) {
          relevanceScore += 50;
          // Bonus for starting with query
          if (nameNormalized.startsWith(normalizedQuery)) {
            relevanceScore += 30;
          }
        } else {
          // Fuzzy match
          const score = similarityScore(nameNormalized, normalizedQuery);
          relevanceScore += score * 40;
        }
      }

      // Email matching
      if (contact.email) {
        const emailNormalized = contact.email.toLowerCase();
        if (emailNormalized.includes(normalizedQuery)) {
          relevanceScore += 30;
        }
      }

      // Phone matching
      if (contact.phone) {
        const phoneNormalized = normalizePhone(contact.phone);
        const queryNormalized = normalizePhone(normalizedQuery);
        if (phoneNormalized.includes(queryNormalized)) {
          relevanceScore += 30;
        }
      }

      return {
        ...contact,
        relevanceScore,
      };
    })
    .filter((contact) => contact.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
