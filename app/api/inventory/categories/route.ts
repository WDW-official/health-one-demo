import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import { getRequestUser } from '@/app/api/_lib/request-auth';
import { jsonOk, jsonError, jsonCreated } from '@/app/api/_lib/response';

const mockCategories = [
  { value: 'Supplies', label: 'Supplies' },
  { value: 'Medication', label: 'Medication' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Disposables', label: 'Disposables' },
  { value: 'Lab Reagents', label: 'Lab Reagents' },
  { value: 'Dental Materials', label: 'Dental Materials' },
];

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    await connectDB();
    const dbCategories = await Inventory.distinct('category');
    const categoryMap = new Map<string, { value: string; label: string }>();

    [...mockCategories.map((item) => item.value), ...dbCategories]
      .map((category) => String(category || '').trim())
      .filter(Boolean)
      .forEach((category) => {
        categoryMap.set(category.toLowerCase(), { value: category, label: category });
      });

    return jsonOk(Array.from(categoryMap.values()).sort((a, b) => a.label.localeCompare(b.label)));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories';
    return jsonError(message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    if (!user || user.role !== 'admin') {
      return jsonError('Only admins can add inventory categories.', 403);
    }

    const body = await req.json();
    const name = String(body.name || body.category || '').trim();

    if (!name) {
      return jsonError('Category name is required.', 400);
    }

    return jsonCreated({ value: name, label: name }, { message: 'Category ready to use.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add category';
    return jsonError(message);
  }
}
