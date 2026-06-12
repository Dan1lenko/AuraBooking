import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const response = await axios.get(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/specialists`, {
      params: Object.fromEntries(searchParams.entries()),
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch specialists' },
      { status: error.response?.status || 500 }
    );
  }
}
