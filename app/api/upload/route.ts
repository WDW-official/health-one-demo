import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll('files')
      .filter((entry): entry is File => entry instanceof File);
    const singleFile = formData.get('file') as File | null;
    const folder = formData.get('folder') as string || 'profile';

    const uploads = files.length > 0 ? files : singleFile ? [singleFile] : [];

    if (uploads.length === 0) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const results = [];
    for (const file of uploads) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result: any = await uploadImage(buffer, folder);
      results.push({
        url: result.secure_url,
        publicId: result.public_id,
        name: file.name,
        mimeType: file.type,
      });
    }

    return NextResponse.json(
      {
        message: `${results.length} file${results.length > 1 ? 's' : ''} uploaded successfully`,
        uploads: results,
        ...(results.length === 1 ? results[0] : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
