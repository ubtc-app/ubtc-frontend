/**
 * POST /api/access-log
 *
 * Records every visitor's onboarding selections + IP to Supabase.
 * Validates invite codes against the INVITE_CODES env var (comma-separated).
 * If INVITE_CODES is unset, any non-empty code is accepted.
 *
 * Run this SQL in Supabase before using:
 * ─────────────────────────────────────
 * create table if not exists website_access (
 *   id          uuid        default gen_random_uuid() primary key,
 *   name        text,
 *   email       text,
 *   user_type   text,
 *   theme       text,
 *   has_invite  boolean,
 *   invite_code text,
 *   ip_address  text,
 *   user_agent  text,
 *   created_at  timestamptz default now()
 * );
 * alter table website_access enable row level security;
 * create policy "anon insert" on website_access for insert to anon with check (true);
 * ─────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  const body: {
    name?: string
    email?: string
    userType?: string
    theme?: string
    hasInvite?: boolean
    inviteCode?: string
    action: 'validate-invite' | 'log'
  } = await req.json()

  // ── Invite code validation ──────────────────────────────────────────────
  if (body.action === 'validate-invite') {
    const raw = (process.env.INVITE_CODES || '').trim()
    if (!raw) {
      // No codes configured → accept anything non-empty
      return NextResponse.json({ valid: !!body.inviteCode?.trim() })
    }
    const valid = raw.split(',').map(c => c.trim().toLowerCase())
    const entered = (body.inviteCode || '').trim().toLowerCase()
    return NextResponse.json({ valid: valid.includes(entered) })
  }

  // ── Full log insert ─────────────────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.from('website_access').insert({
    name:        body.name        || null,
    email:       body.email       || null,
    user_type:   body.userType    || null,
    theme:       body.theme       || null,
    has_invite:  body.hasInvite   ?? false,
    invite_code: body.inviteCode  || null,
    ip_address:  getIp(req),
    user_agent:  req.headers.get('user-agent') || 'unknown',
  })

  if (error) {
    console.error('[access-log]', error.message)
    // Don't block the user — log and continue
    return NextResponse.json({ ok: true, warn: error.message })
  }

  return NextResponse.json({ ok: true })
}
