import { NextRequest } from 'next/server';
import { getRequestUser } from '@/app/api/_lib/request-auth';
import { jsonOk, jsonError } from '@/app/api/_lib/response';

const mockSuppliers = [
  { value: 'sup1', label: 'Supplier A' },
  { value: 'sup2', label: 'Supplier B' },
  { value: 'sup3', label: 'Supplier C' },
];

async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return jsonError('Unauthorized', 401);
    }
    // In a real application, you would fetch this from your database
    return jsonOk(mockSuppliers);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch suppliers';
    return jsonError(message);
  }
}
