import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ChatMessage from '@/lib/models/ChatMessage';
import User from '@/lib/models/User';
import { getPagination, getRequestUser } from '../_lib/request-auth';
import { jsonCreated, jsonError, jsonOk } from '../_lib/response';

function normalizeMessage(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain.id || String(plain._id),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = getPagination(searchParams, 50, 100);
    const recipientId = searchParams.get('recipientId')?.trim();

    if (!recipientId) {
      return NextResponse.json({ error: 'recipientId is required' }, { status: 400 });
    }

    if (recipientId === user.id) {
      return NextResponse.json({ error: 'Choose another user to chat with' }, { status: 400 });
    }

    const recipient = await User.findOne({ _id: recipientId, isActive: { $ne: false } }).select('_id').lean();
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    const query = {
      $or: [
        { senderId: user.id, recipientId },
        { senderId: recipientId, recipientId: user.id },
      ],
    };

    const [messages, total] = await Promise.all([
      ChatMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ChatMessage.countDocuments(query),
      ChatMessage.updateMany(
        {
          senderId: recipientId,
          recipientId: user.id,
          readAt: null,
        },
        { readAt: new Date() }
      ),
    ]);

    const normalized = messages.reverse().map(normalizeMessage);
    return jsonOk(normalized, { messages: normalized, total, limit, skip });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return jsonError('Failed to fetch chat messages');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const message = String(body?.message || '').trim();
    const recipientId = String(body?.recipientId || '').trim();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!recipientId) {
      return NextResponse.json({ error: 'recipientId is required' }, { status: 400 });
    }

    if (recipientId === user.id) {
      return NextResponse.json({ error: 'Choose another user to chat with' }, { status: 400 });
    }

    if (String(recipientId) === String(user.id)) {
      return NextResponse.json({ error: 'Choose another user to chat with' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message must be 2000 characters or fewer' }, { status: 400 });
    }

    await connectDB();

    const recipient = await User.findOne({ _id: recipientId, isActive: { $ne: false } })
      .select('name')
      .lean();

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    const chatMessage = await ChatMessage.create({
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role === 'doctor' ? 'doctor' : 'admin',
      recipientId,
      recipientName: recipient.name,
      message,
    });

    const normalized = normalizeMessage(chatMessage);
    return jsonCreated(normalized, { message: 'Message sent', chatMessage: normalized });
  } catch (error) {
    console.error('Create chat message error:', error);
    return jsonError('Failed to send message');
  }
}
