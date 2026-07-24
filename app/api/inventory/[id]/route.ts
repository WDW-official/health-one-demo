import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import InventoryMovement from '@/lib/models/InventoryMovement';
import { buildHospitalQuery, getRequestUser } from '@/app/api/_lib/request-auth';
import { jsonOk, jsonError } from '@/app/api/_lib/response';
import { getApiErrorMessage } from '@/app/api/_lib/error-message';

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    if (!user) return jsonError('Unauthorized', 401);
    const { id } = await params;
    if (!isValidId(id)) return jsonError('Invalid inventory item ID.', 400);

    await connectDB();
    const item = await Inventory.findOne(buildHospitalQuery(user, { _id: id }));
    if (!item) return jsonError('Inventory item not found.', 404);

    return jsonOk(item.toJSON());
  } catch (error) {
    return jsonError(getApiErrorMessage(error, 'Failed to fetch inventory item.'));
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return jsonError('Only admins can update stock.', 403);
    }
    const { id } = await params;
    if (!isValidId(id)) return jsonError('Invalid inventory item ID.', 400);

    await connectDB();
    const item = await Inventory.findOne(buildHospitalQuery(user, { _id: id }));
    if (!item) return jsonError('Inventory item not found.', 404);

    const body = await request.json();
    const quantityBefore = Number(item.quantity || 0);
    const previousCategory = item.category;
    const previousUnit = item.unit;

    if ('itemName' in body || 'name' in body) item.name = String(body.itemName || body.name || '').trim();
    if ('categoryId' in body || 'category' in body) item.category = String(body.categoryId || body.category || '').trim();
    if ('quantity' in body) item.quantity = Math.max(Number(body.quantity) || 0, 0);
    if ('unit' in body) item.unit = String(body.unit || '').trim();
    if ('reorderLevel' in body) item.reorderLevel = Math.max(Number(body.reorderLevel) || 0, 0);

    [
      'supplierId',
      'supplierName',
      'batchNumber',
      'purchasePrice',
      'sellingPrice',
      'storageLocation',
      'description',
    ].forEach((field) => {
      if (field in body) {
        (item as any)[field] = body[field];
      }
    });

    if (!item.name || !item.category || !item.unit) {
      return jsonError('Item name, category, and unit are required.', 400);
    }

    await item.save();

    const quantityAfter = Number(item.quantity || 0);
    if (quantityAfter !== quantityBefore) {
      await InventoryMovement.create({
        hospitalId: user.hospitalId || null,
        inventoryItemId: String(item._id),
        itemName: item.name,
        category: item.category || previousCategory,
        unit: item.unit || previousUnit,
        type: body.adjustmentType || 'manual-adjustment',
        quantityBefore,
        quantityChanged: quantityAfter - quantityBefore,
        quantityAfter,
        source: 'manual',
        createdByUserId: user.id,
        createdByName: user.name || user.email || 'Admin',
        notes: body.adjustmentNote || body.notes || 'Inventory item updated',
      });
    }

    return jsonOk(item.toJSON(), { message: 'Stock updated successfully.' });
  } catch (error) {
    console.error('Update stock item error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to update stock item.'), 400);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return jsonError('Only admins can delete stock.', 403);
    }
    const { id } = await params;
    if (!isValidId(id)) return jsonError('Invalid inventory item ID.', 400);

    await connectDB();
    const item = await Inventory.findOneAndDelete(buildHospitalQuery(user, { _id: id }));
    if (!item) return jsonError('Inventory item not found.', 404);

    return jsonOk({ id }, { message: 'Stock item deleted successfully.' });
  } catch (error) {
    console.error('Delete stock item error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to delete stock item.'));
  }
}
