import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, extra: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ data, ...extra }, { status });
}

export function jsonCreated<T>(data: T, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ data, ...extra }, { status: 201 });
}

export function jsonError(message: string, status = 500, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

