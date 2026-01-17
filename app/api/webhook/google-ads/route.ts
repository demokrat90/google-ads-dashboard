import { NextRequest, NextResponse } from 'next/server';
import { saveGoogleAdsDataForWeek } from '@/lib/db-dashboard';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret') ||
                 request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.GOOGLE_ADS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { campaigns, weekStart, weekEnd } = await request.json();

    if (!campaigns || !Array.isArray(campaigns)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    if (!weekStart || !weekEnd) {
      return NextResponse.json({ error: 'weekStart and weekEnd required' }, { status: 400 });
    }

    await saveGoogleAdsDataForWeek(weekStart, weekEnd, campaigns);

    console.log(`[WEBHOOK] Получены данные Google Ads за ${weekStart} - ${weekEnd}: ${campaigns.length} кампаний`);

    return NextResponse.json({
      success: true,
      message: `Saved ${campaigns.length} campaigns for week ${weekStart} - ${weekEnd}`
    });
  } catch (error: any) {
    console.error('[WEBHOOK] Ошибка:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Google Ads webhook is working' });
}
