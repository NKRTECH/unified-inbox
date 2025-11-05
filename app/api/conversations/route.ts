import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/middleware/rbac";

// Validation schema for creating/updating conversations
const conversationSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  status: z.enum(["ACTIVE", "RESOLVED", "ARCHIVED"]).default("ACTIVE"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  assignedTo: z.string().optional(),
});

// conversationUpdateSchema removed as it's not used in this file

// GET /api/conversations - List all conversations with optional filtering
export async function GET(request: NextRequest) {
  // Require authentication for reading conversations
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assignedTo");
    const contactId = searchParams.get("contactId");

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (contactId) {
      where.contactId = contactId;
    }

    // Get conversations with pagination and include related data
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  // Require write permission for creating conversations
  const authResult = await requirePermission(request, 'write');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const validatedData = conversationSchema.parse(body);

    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: validatedData.contactId },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Check if assigned user exists (if provided)
    if (validatedData.assignedTo) {
      const user = await prisma.user.findUnique({
        where: { id: validatedData.assignedTo },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Assigned user not found" },
          { status: 404 }
        );
      }
    }

    const conversation = await prisma.conversation.create({
      data: validatedData,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    // eslint-disable-next-line no-console
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}