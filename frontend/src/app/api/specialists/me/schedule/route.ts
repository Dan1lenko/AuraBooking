import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const response = await axios.get(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/specialists/me/schedule`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch schedule' },
      { status: error.response?.status || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const body = await request.json();
    const response = await axios.put(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/specialists/me/schedule`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to update schedule' },
      { status: error.response?.status || 500 }
    );
  }
}
