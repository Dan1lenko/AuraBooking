import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
    }

    const response = await axios.post(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/auth/refresh`, {
      refreshToken,
    });
    const { accessToken, refreshToken: newRefreshToken } = response.data;

    const res = NextResponse.json({ accessToken });

    res.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    res.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return res;
  } catch (error: any) {
    const res = NextResponse.json({ message: 'Session expired' }, { status: 401 });
    res.cookies.delete('token');
    res.cookies.delete('refresh_token');
    return res;
  }
}
