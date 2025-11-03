import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

// GET /api/conversations/by-contact/[contactId] - Get all conversations for a specific contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params;
    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Build where clause
    const where: any = { contactId };
    if (status) {
      where.status = status;
    }

    const conversations = await prisma.conversation.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      },
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching conversations by contact:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}