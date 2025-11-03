import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";

// Validation schema for updating contacts
const contactUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long").optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional(),
  socialHandles: z.record(z.string(), z.string()).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/contacts/[id] - Get a specific contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching contact:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

// PUT /api/contacts/[id] - Update a specific contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = contactUpdateSchema.parse(body);

    // Check if contact exists
    const existingContact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!existingContact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Check for duplicate email or phone if being updated
    if (validatedData.email || validatedData.phone) {
      const orConditions = [];
      if (validatedData.email) {
        orConditions.push({ email: validatedData.email });
      }
      if (validatedData.phone) {
        orConditions.push({ phone: validatedData.phone });
      }

      if (orConditions.length > 0) {
        const duplicateContact = await prisma.contact.findFirst({
          where: {
            AND: [
              { id: { not: contactId } }, // Exclude current contact
              { OR: orConditions },
            ],
          },
        });

        if (duplicateContact) {
          return NextResponse.json(
            { 
              error: "Another contact with this email or phone already exists",
              duplicateContactId: duplicateContact.id 
            },
            { status: 409 }
          );
        }
      }
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...validatedData,
        socialHandles: validatedData.socialHandles as any,
        customFields: validatedData.customFields as any,
      },
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    // eslint-disable-next-line no-console
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/[id] - Delete a specific contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    // Check if contact exists
    const existingContact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!existingContact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // TODO: In future tasks, we'll need to check for related conversations/messages
    // For now, we'll allow deletion

    await prisma.contact.delete({
      where: { id: contactId },
    });

    return NextResponse.json(
      { message: "Contact deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}