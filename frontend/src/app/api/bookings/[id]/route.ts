import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    const body = await request.json();
    const response = await axios.patch(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/bookings/${id}/status`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to update booking status' },
      { status: error.response?.status || 500 }
    );
  }
}
