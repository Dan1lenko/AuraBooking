import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const formData = await request.formData();

    const response = await axios.post(
      `${process.env.BACKEND_API_URL || 'http://localhost:3001'}/specialists/me/avatar`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Avatar upload failed' },
      { status: error.response?.status || 500 }
    );
  }
}
