import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/middleware/rbac";

// Validation schema for creating/updating contacts
const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  phone: z.string().optional(),
  email: z.union([z.string().email("Invalid email format"), z.literal('')]).optional(),
  socialHandles: z.record(z.string(), z.string()).optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

// contactUpdateSchema removed as it's not used in this file

// GET /api/contacts - List all contacts with optional filtering
export async function GET(request: NextRequest) {
  // Require authentication for reading contacts
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const tags = searchParams.get("tags")?.split(",").filter(Boolean);

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    // Get contacts with pagination
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  // Require write permission for creating contacts
  const authResult = await requirePermission(request, 'write');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const validatedData = contactSchema.parse(body);

    // Check for duplicate email or phone if provided
    if (validatedData.email || validatedData.phone) {
      const orConditions = [];
      if (validatedData.email) {
        orConditions.push({ email: validatedData.email });
      }
      if (validatedData.phone) {
        orConditions.push({ phone: validatedData.phone });
      }

      if (orConditions.length > 0) {
        const existingContact = await prisma.contact.findFirst({
          where: { OR: orConditions },
        });

        if (existingContact) {
          return NextResponse.json(
            { 
              error: "Contact with this email or phone already exists",
              existingContactId: existingContact.id 
            },
            { status: 409 }
          );
        }
      }
    }

    const contact = await prisma.contact.create({
      data: {
        ...validatedData,
        socialHandles: validatedData.socialHandles as any,
        customFields: validatedData.customFields as any,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    // eslint-disable-next-line no-console
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}