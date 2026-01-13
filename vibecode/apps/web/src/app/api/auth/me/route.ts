import { NextRequest, NextResponse } from 'next/server';

// Use Railway API URL in production
const API_URL = process.env.API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://oneshotcoding-production.up.railway.app'
    : 'http://localhost:4000');

export async function GET(request: NextRequest) {
  // Get token from cookie or Authorization header
  let accessToken = request.cookies.get('access_token')?.value;

  if (!accessToken) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.slice(7);
    }
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Auth proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
