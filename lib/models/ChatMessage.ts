import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  hospitalId?: string | null;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'doctor';
  recipientId: string;
  recipientName: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    hospitalId: {
      type: String,
      default: null,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['admin', 'doctor'],
      required: true,
      index: true,
    },
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ createdAt: -1 });
chatMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
chatMessageSchema.index({ hospitalId: 1, createdAt: -1 });
chatMessageSchema.index({ hospitalId: 1, senderId: 1, recipientId: 1, createdAt: -1 });

export default mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
