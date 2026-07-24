import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getRequestUser, getUserHospitalId } from '@/app/api/_lib/request-auth';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

function extensionFor(file: File) {
  const byType: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };

  return byType[file.type] || path.extname(file.name).replace('.', '') || 'png';
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = getUserHospitalId(user);
    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital context is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('logo');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Logo file is required' }, { status: 400 });
    }

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Logo must be PNG, JPG, WEBP, or SVG' },
        { status: 400 }
      );
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return NextResponse.json({ error: 'Logo must be 2MB or smaller' }, { status: 400 });
    }

    const extension = extensionFor(file);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'hospital-logos');
    await mkdir(uploadDir, { recursive: true });

    const filename = `${hospitalId}-${randomUUID()}.${extension}`;
    const filepath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    return NextResponse.json({
      message: 'Logo uploaded',
      url: `/uploads/hospital-logos/${filename}`,
    });
  } catch (error) {
    console.error('Upload hospital logo error:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}
