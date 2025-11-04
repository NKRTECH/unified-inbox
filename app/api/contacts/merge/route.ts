/**
 * Contact Merge API
 * Merges duplicate contacts and consolidates their data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const mergeSchema = z.object({
  primaryContactId: z.string().cuid(),
  secondaryContactIds: z.array(z.string().cuid()).min(1),
  mergeStrategy: z.object({
    name: z.enum(['primary', 'secondary', 'custom']),
    email: z.enum(['primary', 'secondary', 'custom']),
    phone: z.enum(['primary', 'secondary', 'custom']),
    tags: z.enum(['merge', 'primary', 'secondary']),
    customFields: z.enum(['merge', 'primary', 'secondary']),
    socialHandles: z.enum(['merge', 'primary', 'secondary']),
  }).optional(),
  customValues: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

/**
 * POST /api/contacts/merge
 * Merge multiple contacts into one
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = mergeSchema.parse(body);

    const { primaryContactId, secondaryContactIds, mergeStrategy, customValues } = validatedData;

    // Fetch all contacts
    const [primaryContact, secondaryContacts] = await Promise.all([
      prisma.contact.findUnique({
        where: { id: primaryContactId },
        include: {
          conversations: true,
          messages: true,
          calls: true,
        },
      }),
      prisma.contact.findMany({
        where: { id: { in: secondaryContactIds } },
        include: {
          conversations: true,
          messages: true,
          calls: true,
        },
      }),
    ]);

    if (!primaryContact) {
      return NextResponse.json(
        { error: 'Primary contact not found' },
        { status: 404 }
      );
    }

    if (secondaryContacts.length !== secondaryContactIds.length) {
      return NextResponse.json(
        { error: 'One or more secondary contacts not found' },
        { status: 404 }
      );
    }

    // Merge data based on strategy
    const strategy = mergeStrategy || {
      name: 'primary',
      email: 'primary',
      phone: 'primary',
      tags: 'merge',
      customFields: 'merge',
      socialHandles: 'merge',
    };

    const mergedData: any = {
      name: primaryContact.name,
      email: primaryContact.email,
      phone: primaryContact.phone,
      tags: primaryContact.tags || [],
      customFields: primaryContact.customFields || {},
      socialHandles: primaryContact.socialHandles || {},
    };

    // Apply merge strategy
    for (const secondaryContact of secondaryContacts) {
      // Name
      if (strategy.name === 'secondary' && secondaryContact.name) {
        mergedData.name = secondaryContact.name;
      }

      // Email
      if (strategy.email === 'secondary' && secondaryContact.email) {
        mergedData.email = secondaryContact.email;
      }

      // Phone
      if (strategy.phone === 'secondary' && secondaryContact.phone) {
        mergedData.phone = secondaryContact.phone;
      }

      // Tags
      if (strategy.tags === 'merge') {
        const secondaryTags = secondaryContact.tags || [];
        mergedData.tags = Array.from(new Set([...mergedData.tags, ...secondaryTags]));
      } else if (strategy.tags === 'secondary') {
        mergedData.tags = secondaryContact.tags || [];
      }

      // Custom fields
      if (strategy.customFields === 'merge') {
        mergedData.customFields = {
          ...mergedData.customFields,
          ...(secondaryContact.customFields as object || {}),
        };
      } else if (strategy.customFields === 'secondary') {
        mergedData.customFields = secondaryContact.customFields || {};
      }

      // Social handles
      if (strategy.socialHandles === 'merge') {
        mergedData.socialHandles = {
          ...mergedData.socialHandles,
          ...(secondaryContact.socialHandles as object || {}),
        };
      } else if (strategy.socialHandles === 'secondary') {
        mergedData.socialHandles = secondaryContact.socialHandles || {};
      }
    }

    // Apply custom values if provided
    if (customValues) {
      if (customValues.name) mergedData.name = customValues.name;
      if (customValues.email) mergedData.email = customValues.email;
      if (customValues.phone) mergedData.phone = customValues.phone;
    }

    // Perform merge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update primary contact with merged data
      const updatedContact = await tx.contact.update({
        where: { id: primaryContactId },
        data: mergedData,
      });

      // Reassign conversations, messages, and calls to primary contact
      for (const secondaryContact of secondaryContacts) {
        // Update conversations
        await tx.conversation.updateMany({
          where: { contactId: secondaryContact.id },
          data: { contactId: primaryContactId },
        });

        // Update messages
        await tx.message.updateMany({
          where: { contactId: secondaryContact.id },
          data: { contactId: primaryContactId },
        });

        // Update calls
        await tx.call.updateMany({
          where: { contactId: secondaryContact.id },
          data: { contactId: primaryContactId },
        });

        // Delete secondary contact
        await tx.contact.delete({
          where: { id: secondaryContact.id },
        });
      }

      return updatedContact;
    });

    return NextResponse.json({
      success: true,
      contact: result,
      mergedCount: secondaryContactIds.length,
      message: `Successfully merged ${secondaryContactIds.length} contact(s) into primary contact`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error merging contacts:', error);
    return NextResponse.json(
      { error: 'Failed to merge contacts' },
      { status: 500 }
    );
  }
}
