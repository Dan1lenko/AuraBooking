import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const response = await axios.get(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/bookings/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch bookings' },
      { status: error.response?.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const body = await request.json();
    const response = await axios.post(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/bookings`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to create booking' },
      { status: error.response?.status || 500 }
    );
  }
}
