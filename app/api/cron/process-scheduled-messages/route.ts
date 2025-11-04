/**
 * Cron Job: Process Scheduled Messages
 * 
 * This endpoint should be called periodically (e.g., every minute) by a cron service
 * like Vercel Cron, GitHub Actions, or an external cron service.
 * 
 * For Vercel, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-scheduled-messages",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { schedulingService } from '@/lib/services/scheduling-service';

/**
 * GET /api/cron/process-scheduled-messages
 * Process all due scheduled messages
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Starting scheduled message processing...');
    const startTime = Date.now();

    // Process due messages
    const result = await schedulingService.processDueMessages();

    const processingTime = Date.now() - startTime;

    console.log('[CRON] Scheduled message processing complete:', {
      processedCount: result.processedCount,
      successCount: result.successCount,
      failedCount: result.failedCount,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json({
      success: true,
      result: {
        processedCount: result.processedCount,
        successCount: result.successCount,
        failedCount: result.failedCount,
        errors: result.errors,
        processingTime,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[CRON] Error processing scheduled messages:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process scheduled messages',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
