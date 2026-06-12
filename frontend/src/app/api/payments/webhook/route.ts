import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    const response = await axios.post(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/payments/webhook`, rawBody, {
      headers: {
        'stripe-signature': signature,
        'Content-Type': 'application/json',
      },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Webhook proxy failed' },
      { status: error.response?.status || 500 }
    );
  }
}
