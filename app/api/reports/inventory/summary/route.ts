import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import { getRequestUser } from '@/app/api/_lib/request-auth';
import { jsonOk, jsonError } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    if (!user) return jsonError('Unauthorized', 401);

    await connectDB();

    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 7);

    const [totalItems, lowStockCount, needsReviewCount, recentlyUpdatedCount] = await Promise.all([
      Inventory.countDocuments(),
      Inventory.countDocuments({ status: { $in: ['low-stock', 'out-of-stock'] } }),
      Inventory.countDocuments({ status: 'needs-review' }),
      Inventory.countDocuments({ lastUpdated: { $gte: recentCutoff } }),
    ]);

    return jsonOk({
      totalItems,
      lowStockCount,
      needsReviewCount,
      recentlyUpdatedCount,
    });
  } catch (error) {
    console.error('Fetch inventory summary error:', error);
    return jsonError('Failed to fetch inventory summary');
  }
}
