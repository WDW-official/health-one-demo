import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { jsonError, jsonOk } from '../../_lib/response';
import { sendQueuedReminders } from '@/lib/reminder-service';
import { getRequestUser } from '../../_lib/request-auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = getRequestUser(request);
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = request.headers.get('x-cron-secret');
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';

    if (cronSecret) {
      if (headerSecret !== cronSecret && !isVercelCron && user?.role !== 'admin') {
        return jsonError('Unauthorized', 401);
      }
    } else if (!isVercelCron && (!user || user.role !== 'admin')) {
      return jsonError('Unauthorized', 401);
    }

    const results = await sendQueuedReminders(25);
    return jsonOk(results, {
      message: `Processed ${results.length} reminder${results.length === 1 ? '' : 's'}`,
      results,
    });
  } catch (error) {
    console.error('Dispatch reminders error:', error);
    return jsonError('Failed to dispatch reminders');
  }
}
