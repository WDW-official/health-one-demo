import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import { buildHospitalQuery, getRequestUser } from '@/app/api/_lib/request-auth';
import { jsonOk, jsonError } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    if (!user) return jsonError('Unauthorized', 401);

    await connectDB();

    const query: any = buildHospitalQuery(user, { status: { $in: ['low-stock', 'out-of-stock'] } });
    const items = await Inventory.find(query)
      .lean()
      .sort({ quantity: 1, name: 1 })
      .limit(20);

    const data = items.map((item: any) => ({
      ...item,
      id: String(item._id),
    }));

    return jsonOk(data);
  } catch (error) {
    console.error('Fetch low stock items error:', error);
    return jsonError('Failed to fetch low stock items');
  }
}
