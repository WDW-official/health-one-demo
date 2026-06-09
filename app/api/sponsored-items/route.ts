import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SponsoredItem from '@/lib/models/SponsoredItem';
import { jsonCreated, jsonError, jsonOk } from '../_lib/response';
import { getRequestUser } from '../_lib/request-auth';

function normalizeSponsoredItem(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain.id || String(plain._id),
    createdAt: plain.createdAt ? new Date(plain.createdAt) : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt) : undefined,
  };
}

export async function GET() {
  try {
    await connectDB();

    const items = await SponsoredItem.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    const normalized = items.map(normalizeSponsoredItem);
    const totalItems = normalized.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
    const paidItems = normalized.reduce((sum, item) => sum + (item.paidQuantity || 0), 0);

    return jsonOk(normalized, {
      sponsoredItems: normalized,
      total: normalized.length,
      totalItems,
      paidItems,
    });
  } catch (error) {
    console.error('Get sponsored items error:', error);
    return jsonError('Failed to fetch sponsored items');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create sponsored items' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();

    if (!body?.name) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    const item = new SponsoredItem({
      name: body.name,
      category: body.category || '',
      totalQuantity: Number(body.totalQuantity || 0),
      paidQuantity: Number(body.paidQuantity || 0),
      note: body.note || '',
      isActive: body.isActive ?? true,
    });

    await item.save();

    const normalized = normalizeSponsoredItem(item);
    return jsonCreated(normalized, { message: 'Sponsored item created successfully', sponsoredItem: normalized });
  } catch (error) {
    console.error('Create sponsored item error:', error);
    return jsonError('Failed to create sponsored item');
  }
}
