import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || null;
    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json({ token: null });
  }
}
