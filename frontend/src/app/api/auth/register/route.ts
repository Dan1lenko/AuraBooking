import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await axios.post(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/auth/register`, body);
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Registration failed' },
      { status: error.response?.status || 500 }
    );
  }
}
