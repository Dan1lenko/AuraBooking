import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await axios.post(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/auth/login`, body);
    const { accessToken, refreshToken, user } = response.data;

    const res = NextResponse.json({ user });

    // Set accessToken cookie (15 mins)
    res.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    // Set refreshToken cookie (7 days)
    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Login failed' },
      { status: error.response?.status || 500 }
    );
  }
}
