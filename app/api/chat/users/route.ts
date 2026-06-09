import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import ChatMessage from '@/lib/models/ChatMessage';
import User from '@/lib/models/User';
import { getRequestUser } from '../../_lib/request-auth';
import { jsonError, jsonOk } from '../../_lib/response';

function serializeUser(user: any, meta: Record<string, any> = {}) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    doctorId: user.doctorId,
    isSuperAdmin: Boolean(user.isSuperAdmin),
    unreadCount: meta.unreadCount || 0,
    latestMessage: meta.latestMessage || '',
    latestAt: meta.latestAt || null,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getRequestUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const currentUserObjectId = Types.ObjectId.isValid(currentUser.id)
      ? new Types.ObjectId(currentUser.id)
      : currentUser.id;
    const query: Record<string, any> = {
      _id: { $ne: currentUserObjectId },
      isActive: { $ne: false },
    };

    if (search) {
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('email name role doctorId isSuperAdmin')
      .sort({ name: 1 })
      .limit(100)
      .lean();

    const visibleUsers = users.filter((user: any) => String(user._id) !== currentUser.id);
    const userIds = visibleUsers.map((user: any) => String(user._id));
    const messageMeta = await ChatMessage.find({
      $or: [
        { senderId: currentUser.id, recipientId: { $in: userIds } },
        { senderId: { $in: userIds }, recipientId: currentUser.id },
      ],
    })
      .select('senderId recipientId message readAt createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const metaByUserId = new Map<string, { unreadCount: number; latestMessage: string; latestAt: Date | null }>();

    messageMeta.forEach((message: any) => {
      const otherUserId = message.senderId === currentUser.id ? message.recipientId : message.senderId;
      if (!userIds.includes(otherUserId)) return;

      const current = metaByUserId.get(otherUserId) || {
        unreadCount: 0,
        latestMessage: '',
        latestAt: null,
      };

      if (!current.latestAt) {
        current.latestMessage = message.message;
        current.latestAt = message.createdAt;
      }

      if (message.senderId === otherUserId && message.recipientId === currentUser.id && !message.readAt) {
        current.unreadCount += 1;
      }

      metaByUserId.set(otherUserId, current);
    });

    const normalized = visibleUsers
      .map((user: any) => serializeUser(user, metaByUserId.get(String(user._id))))
      .sort((a, b) => {
        const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0;
        const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.name.localeCompare(b.name);
      });

    return jsonOk(normalized, { users: normalized, total: normalized.length });
  } catch (error) {
    console.error('Get chat users error:', error);
    return jsonError('Failed to fetch chat users');
  }
}
