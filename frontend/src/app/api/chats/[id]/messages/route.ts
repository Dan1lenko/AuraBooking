import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    const response = await axios.get(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/chats/${id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch messages' },
      { status: error.response?.status || 500 }
    );
  }
}
