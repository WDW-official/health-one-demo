import { NextRequest, NextResponse } from 'next/server';

import { connectDB } from '@/lib/mongodb';
import Family from '@/lib/models/Family';
import { buildHospitalQuery, getPagination, getRequestUser, withHospitalId } from '@/app/api/_lib/request-auth';
import { jsonCreated, jsonError, jsonOk } from '@/app/api/_lib/response';
import { getApiErrorMessage } from '@/app/api/_lib/error-message';

function normalizeFamily(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain.id || String(plain._id),
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || searchParams.get('q')?.trim();
    const { limit, skip } = getPagination(searchParams, 20, 100);
    let query: any = buildHospitalQuery(user);

    if (search) {
      const escaped = escapeRegex(search);
      query = {
        ...query,
        $or: [
          { familyName: { $regex: escaped, $options: 'i' } },
          { primaryContactName: { $regex: escaped, $options: 'i' } },
          { primaryContactPhone: { $regex: escaped, $options: 'i' } },
          { primaryContactEmail: { $regex: escaped, $options: 'i' } },
        ],
      };
    }

    const [families, total] = await Promise.all([
      Family.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Family.countDocuments(query),
    ]);
    const normalized = families.map(normalizeFamily);

    return jsonOk(normalized, { families: normalized, total, limit, skip });
  } catch (error) {
    console.error('Fetch families error:', error);
    return jsonError('Failed to fetch families');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create families' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const required = ['familyName', 'primaryContactName', 'primaryContactPhone'];
    for (const field of required) {
      if (!String(body[field] || '').trim()) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const family = await Family.create(
      withHospitalId(user, {
        familyName: String(body.familyName || '').trim(),
        primaryContactName: String(body.primaryContactName || '').trim(),
        primaryContactPhone: String(body.primaryContactPhone || '').trim(),
        primaryContactEmail: String(body.primaryContactEmail || '').trim().toLowerCase(),
        address: String(body.address || '').trim(),
        notes: String(body.notes || '').trim(),
      })
    );
    const normalized = normalizeFamily(family);

    return jsonCreated(normalized, { message: 'Family created successfully', family: normalized });
  } catch (error) {
    console.error('Create family error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to create family'), 400);
  }
}
