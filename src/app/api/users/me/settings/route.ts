import { NextRequest, NextResponse } from 'next/server';
import { tryAuth } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';
import { DEFAULT_PREFERENCES, validPreferences } from '@/lib/preferences';

export async function GET(request: NextRequest) {
  const [user,error]=await tryAuth(request);if(error)return error;
  try {
    const rows=await withUserContext(user!.userId,tx=>tx.$queryRaw<Array<{language:string;currency:string;showUnreadBadge:boolean}>>`SELECT language,currency,show_unread_badge AS "showUnreadBadge" FROM user_settings WHERE user_id=${user!.userId}::uuid`);
    return NextResponse.json({settings:rows[0]||DEFAULT_PREFERENCES},{headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'Unable to load settings.'},{status:503});}
}
export async function PUT(request: NextRequest) {
  const [user,error]=await tryAuth(request);if(error)return error;
  try {
    const body=await request.json();
    if(!validPreferences(body)||Object.keys(body).some(key=>!['language','currency','showUnreadBadge'].includes(key)))return NextResponse.json({error:'Invalid settings.'},{status:400});
    await withUserContext(user!.userId,tx=>tx.$executeRaw`INSERT INTO user_settings(user_id,language,currency,show_unread_badge) VALUES(${user!.userId}::uuid,${body.language},${body.currency},${body.showUnreadBadge}) ON CONFLICT(user_id) DO UPDATE SET language=EXCLUDED.language,currency=EXCLUDED.currency,show_unread_badge=EXCLUDED.show_unread_badge,updated_at=CURRENT_TIMESTAMP`);
    return NextResponse.json({settings:body},{headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'Unable to save settings.'},{status:503});}
}
