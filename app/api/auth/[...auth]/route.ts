import { NextResponse } from 'next/server';

async function handleAuthRequest(request: Request) {
	try {
		const { auth } = await import('../../../../lib/auth');
		// auth.handler is compatible with Next.js route handlers for all verbs.
		return await auth.handler(request as any);
	} catch (err) {
		console.error('[Auth Route] Failed to initialize auth handler:', err);
		return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 500 });
	}
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
export const PUT = handleAuthRequest;
export const PATCH = handleAuthRequest;
export const DELETE = handleAuthRequest;
export const OPTIONS = handleAuthRequest;
