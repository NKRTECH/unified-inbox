/**
 * Contact Duplicate Detection API
 * Finds potential duplicate contacts using fuzzy matching
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateContactSimilarity, areLikelyDuplicates } from '@/lib/utils/fuzzy-match';
import { auth } from '@/lib/auth';

export interface DuplicateGroup {
  contacts: Array<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    createdAt: Date;
    _count: {
      conversations: number;
      messages: number;
    };
  }>;
  similarity: {
    score: number;
    reasons: string[];
    matchedFields: string[];
  };
}

/**
 * GET /api/contacts/duplicates
 * Find potential duplicate contacts
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const threshold = parseInt(searchParams.get('threshold') || '60');
    const contactId = searchParams.get('contactId');

    // If contactId is provided, find duplicates for that specific contact
    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          _count: {
            select: {
              conversations: true,
              messages: true,
            },
          },
        },
      });

      if (!contact) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }

      // Find potential duplicates
      const allContacts = await prisma.contact.findMany({
        where: {
          id: { not: contactId },
        },
        include: {
          _count: {
            select: {
              conversations: true,
              messages: true,
            },
          },
        },
      });

      const duplicates = allContacts
        .map((otherContact) => {
          const similarity = calculateContactSimilarity(contact, otherContact);
          return {
            contact: otherContact,
            similarity,
          };
        })
        .filter((item) => item.similarity.score >= threshold)
        .sort((a, b) => b.similarity.score - a.similarity.score);

      return NextResponse.json({
        contact,
        duplicates: duplicates.map((item) => ({
          ...item.contact,
          similarity: item.similarity,
        })),
        count: duplicates.length,
      });
    }

    // Find all duplicate groups
    const contacts = await prisma.contact.findMany({
      include: {
        _count: {
          select: {
            conversations: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const duplicateGroups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < contacts.length; i++) {
      const contact1 = contacts[i];
      
      if (processedIds.has(contact1.id)) continue;

      const group: DuplicateGroup['contacts'] = [contact1];
      let bestSimilarity: { score: number; reasons: string[]; matchedFields: string[] } = {
        score: 0,
        reasons: [],
        matchedFields: [],
      };

      for (let j = i + 1; j < contacts.length; j++) {
        const contact2 = contacts[j];
        
        if (processedIds.has(contact2.id)) continue;

        if (areLikelyDuplicates(contact1, contact2, threshold)) {
          const similarity = calculateContactSimilarity(contact1, contact2);
          
          if (similarity.score > bestSimilarity.score) {
            bestSimilarity = similarity;
          }

          group.push(contact2);
          processedIds.add(contact2.id);
        }
      }

      if (group.length > 1) {
        duplicateGroups.push({
          contacts: group,
          similarity: bestSimilarity,
        });
        processedIds.add(contact1.id);
      }
    }

    // Sort groups by similarity score
    duplicateGroups.sort((a, b) => b.similarity.score - a.similarity.score);

    return NextResponse.json({
      groups: duplicateGroups,
      count: duplicateGroups.length,
      totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.contacts.length, 0),
    });
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to find duplicate contacts' },
      { status: 500 }
    );
  }
}
