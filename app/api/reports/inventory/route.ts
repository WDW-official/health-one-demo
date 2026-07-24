import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import { seedInventoryItemsFromProcedureConsumables } from '@/lib/consumable-usage';
import { buildHospitalQuery, getPagination, getRequestUser } from '@/app/api/_lib/request-auth';
import { jsonOk, jsonError } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    if (!user) return jsonError('Unauthorized', 401);

    await connectDB();
    if ((await Inventory.countDocuments(buildHospitalQuery(user))) === 0) {
      await seedInventoryItemsFromProcedureConsumables(user.hospitalId || null);
    }

    const { searchParams } = new URL(req.url);
    const { limit, skip } = getPagination(searchParams, 15, 200);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const query: any = buildHospitalQuery(user);
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { unit: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'all') query.category = { $regex: `^${category}$`, $options: 'i' };
    if (status && status !== 'all') query.status = status;

    const [items, total] = await Promise.all([
      Inventory.find(query).lean().sort({ lastUpdated: -1, updatedAt: -1, name: 1 }).skip(skip).limit(limit),
      Inventory.countDocuments(query),
    ]);

    const data = items.map((item: any) => ({
      ...item,
      id: String(item._id),
    }));

    return jsonOk(data, { total, limit, skip });
  } catch (error) {
    console.error('Fetch inventory report error:', error);
    return jsonError('Failed to fetch inventory report');
  }
}
