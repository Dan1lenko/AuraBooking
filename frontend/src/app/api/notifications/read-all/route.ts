import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const response = await axios.put(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/notifications/read-all`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to mark all notifications as read' },
      { status: error.response?.status || 500 }
    );
  }
}
