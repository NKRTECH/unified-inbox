import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { fuzzySearchContacts } from "../../../../lib/utils/fuzzy-match";

// GET /api/contacts/search - Advanced contact search with fuzzy matching
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");
    const tags = searchParams.get("tags")?.split(",").filter(Boolean);
    const customFields = searchParams.get("customFields");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Build where clause for filtering
    const where: any = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ],
    };

    // Add tag filtering
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // Add custom field filtering
    if (customFields) {
      try {
        const customFieldsObj = JSON.parse(customFields);
        // Note: Prisma JSON filtering is limited, this is a basic implementation
        where.customFields = { path: [], equals: customFieldsObj };
      } catch (e) {
        // Invalid JSON, ignore custom fields filter
      }
    }

    // Fetch contacts from database
    const contacts = await prisma.contact.findMany({
      where,
      take: limit * 2, // Fetch more for fuzzy matching
      include: {
        _count: {
          select: {
            conversations: true,
            messages: true,
          },
        },
      },
    });

    // Apply fuzzy matching and sort by relevance
    const rankedContacts = fuzzySearchContacts(contacts, query)
      .slice(0, limit)
      .map(({ relevanceScore, ...contact }) => ({
        ...contact,
        relevanceScore,
      }));

    return NextResponse.json({
      query,
      results: rankedContacts,
      count: rankedContacts.length,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error searching contacts:", error);
    return NextResponse.json(
      { error: "Failed to search contacts" },
      { status: 500 }
    );
  }
}