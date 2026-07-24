import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import InventoryMovement from '@/lib/models/InventoryMovement';
import { withHospitalId, getRequestUser } from '@/app/api/_lib/request-auth';
import { jsonError, jsonCreated } from '@/app/api/_lib/response';
import { getApiErrorMessage } from '@/app/api/_lib/error-message';

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return jsonError('Only admins can add stock.', 403);
    }

    await connectDB();

    const body = await request.json();

    const {
      itemName: name,
      categoryId: category,
      quantity,
      unit,
      reorderLevel,
      ...rest
    } = body;

    // Basic validation
    if (!name || !category || quantity === undefined || !unit || reorderLevel === undefined) {
      return jsonError('Missing required fields.', 400);
    }

    const newStockItem = new Inventory({
      ...withHospitalId(user, {}),
      name,
      category,
      quantity,
      unit,
      reorderLevel,
      ...rest,
    });

    await newStockItem.save();
    await InventoryMovement.create({
      hospitalId: user.hospitalId || null,
      inventoryItemId: String(newStockItem._id),
      itemName: newStockItem.name,
      category: newStockItem.category,
      unit: newStockItem.unit,
      type: 'stock-in',
      quantityBefore: 0,
      quantityChanged: Number(newStockItem.quantity || 0),
      quantityAfter: Number(newStockItem.quantity || 0),
      source: 'manual',
      createdByUserId: user.id,
      createdByName: user.name || user.email || 'Admin',
      notes: 'Initial stock entry',
    });

    return jsonCreated(newStockItem.toJSON(), { message: 'Stock added successfully.' });
  } catch (error) {
    console.error('Create stock item error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to add stock item.'), 400);
  }
}
