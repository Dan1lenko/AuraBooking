import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const body = await request.json();
    const response = await axios.post(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/reviews`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to submit review' },
      { status: error.response?.status || 500 }
    );
  }
}
