import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  name: string;
  doctorId?: string | null;
  hospitalId?: string | null;
  hospitalSlug?: string | null;
  activeHospitalId?: string | null;
  activeHospitalSlug?: string | null;
  isSuperAdmin?: boolean;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch {
    return null;
  }
}
