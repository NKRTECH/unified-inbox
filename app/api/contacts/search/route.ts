import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// GET /api/contacts/search - Advanced contact search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Perform fuzzy search across multiple fields
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { tags: { hasSome: [query] } },
        ],
      },
      take: limit,
      orderBy: [
        // Prioritize exact name matches
        { name: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      query,
      results: contacts,
      count: contacts.length,
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