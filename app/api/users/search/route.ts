/**
 * User Search API Endpoint
 * 
 * Provides user search functionality for @mentions and other features.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/search
 * Search users by name or email
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication when auth is fully implemented

    // Get search query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Search users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      take: 10,
    });

    // Format response
    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      avatar: user.image,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
