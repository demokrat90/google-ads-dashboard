import { NextRequest, NextResponse } from 'next/server';
import { getProcessedLeads } from '@/lib/amocrm';
import { saveAmoCRMLead } from '@/lib/db-dashboard';
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

    const leads = await getProcessedLeads(weekInfo.startDate, weekInfo.endDate);

    if (leads.length === 0) {
      console.log('[CRON] Новых лидов не найдено');
      return NextResponse.json({ success: true, message: 'No new leads' });
    }

    for (const lead of leads) {
      await saveAmoCRMLead(lead);
    }

    console.log(`[CRON] Сохранено ${leads.length} лидов`);
    return NextResponse.json({ success: true, count: leads.length });
  } catch (error: any) {
    console.error('[CRON] Ошибка синхронизации amoCRM:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
