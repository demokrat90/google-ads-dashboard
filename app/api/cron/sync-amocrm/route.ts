import { NextRequest, NextResponse } from 'next/server';
import { getProcessedLeads } from '@/lib/amocrm';
import { saveAmoCRMLeadsBatch, saveTildaLeadsBatch } from '@/lib/db-dashboard';
import { getCurrentWeekInfo } from '@/lib/week-helper';

export async function GET(request: NextRequest) {
  // Проверка авторизации для Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const weekInfo = getCurrentWeekInfo();
    console.log(`[CRON] Синхронизация amoCRM за ${weekInfo.startDate} - ${weekInfo.endDate}`);

    const { utmLeads, tildaLeads } = await getProcessedLeads(weekInfo.startDate, weekInfo.endDate);

    if (utmLeads.length === 0 && tildaLeads.length === 0) {
      console.log('[CRON] Новых лидов не найдено');
      return NextResponse.json({ success: true, message: 'No new leads' });
    }

    // Batch сохранение UTM лидов
    const utmResult = await saveAmoCRMLeadsBatch(utmLeads);
    console.log(`[CRON] UTM лиды: сохранено ${utmResult.saved}, ошибок: ${utmResult.errors}`);

    // Batch сохранение Tilda лидов в отдельную таблицу
    const tildaResult = await saveTildaLeadsBatch(tildaLeads);
    console.log(`[CRON] Tilda лиды: сохранено ${tildaResult.saved}, ошибок: ${tildaResult.errors}`);

    return NextResponse.json({
      success: true,
      utm: { saved: utmResult.saved, errors: utmResult.errors },
      tilda: { saved: tildaResult.saved, errors: tildaResult.errors }
    });
  } catch (error: any) {
    console.error('[CRON] Ошибка синхронизации amoCRM:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
