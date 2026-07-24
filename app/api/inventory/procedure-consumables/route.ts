import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ProcedureConsumableTemplate from '@/lib/models/ProcedureConsumableTemplate';
import {
  ensureProcedureConsumableTemplates,
  seedInventoryItemsFromProcedureConsumables,
} from '@/lib/consumable-usage';
import { buildHospitalQuery, getPagination, getRequestUser } from '@/app/api/_lib/request-auth';
import { jsonError, jsonOk } from '@/app/api/_lib/response';

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) return jsonError('Unauthorized', 401);

    await connectDB();
    await ensureProcedureConsumableTemplates(user.hospitalId || null);

    const { searchParams } = new URL(request.url);
    const { limit, skip } = getPagination(searchParams, 100, 500);
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    const query: any = buildHospitalQuery(user, { isActive: true });
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { procedure: { $regex: search, $options: 'i' } },
        { 'consumables.name': { $regex: search, $options: 'i' } },
      ];
    }

    const [templates, total] = await Promise.all([
      ProcedureConsumableTemplate.find(query).lean().sort({ category: 1, procedure: 1 }).skip(skip).limit(limit),
      ProcedureConsumableTemplate.countDocuments(query),
    ]);

    const data = templates.map((template: any) => ({
      ...template,
      id: String(template._id),
    }));

    return jsonOk(data, { templates: data, total, limit, skip });
  } catch (error) {
    console.error('Get procedure consumables error:', error);
    return jsonError('Failed to fetch procedure consumable templates');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return jsonError('Only admins can seed procedure consumables.', 403);
    }

    await connectDB();
    await ensureProcedureConsumableTemplates(user.hospitalId || null);
    const inventorySeed = await seedInventoryItemsFromProcedureConsumables(user.hospitalId || null);

    const total = await ProcedureConsumableTemplate.countDocuments(buildHospitalQuery(user, { isActive: true }));

    return jsonOk(
      { total, inventorySeed },
      { message: 'Procedure consumable templates and stock items seeded successfully.' }
    );
  } catch (error) {
    console.error('Seed procedure consumables error:', error);
    return jsonError('Failed to seed procedure consumable templates');
  }
}
