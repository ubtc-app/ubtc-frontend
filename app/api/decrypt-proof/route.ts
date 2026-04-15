import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { encrypted, kyber_sk } = await req.json();
  try {
    const r = await fetch('http://localhost:8080/proofs/decrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encrypted, kyber_sk })
    });
    const data = await r.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 500 });
  }
}