import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import InventoryMovement from '@/lib/models/InventoryMovement';
import { getRequestUser } from '@/app/api/_lib/request-auth';
import { jsonOk, jsonError } from '@/app/api/_lib/response';

function movementDescription(movement: any) {
  const amount = Math.abs(Number(movement.quantityChanged || 0));
  if (movement.type === 'stock-in') {
    return `${movement.itemName} stock increased by ${amount} ${movement.unit || ''}.`;
  }
  if (movement.type === 'actual-usage') {
    return `${amount} ${movement.unit || ''} ${movement.itemName} recorded from actual consultation consumables.`;
  }
  if (movement.type === 'procedure-estimate') {
    return `${amount} ${movement.unit || ''} ${movement.itemName} recorded from procedure estimate.`;
  }
  return `${movement.itemName} adjusted by ${movement.quantityChanged} ${movement.unit || ''}.`;
}

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    if (!user) return jsonError('Unauthorized', 401);

    await connectDB();

    const movements = await InventoryMovement.find({})
      .lean()
      .sort({ createdAt: -1 })
      .limit(20);

    const data = movements.map((movement: any) => ({
      id: String(movement._id),
      description: movementDescription(movement),
      timestamp: movement.createdAt,
      movement,
    }));

    return jsonOk(data);
  } catch (error) {
    console.error('Fetch inventory activity error:', error);
    return jsonError('Failed to fetch inventory activity');
  }
}
