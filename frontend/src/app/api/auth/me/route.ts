import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    // Decode JWT payload manually
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ user: null });
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
