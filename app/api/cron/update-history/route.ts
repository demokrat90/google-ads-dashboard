import { NextRequest, NextResponse } from 'next/server';
import { getProcessedLeads } from '@/lib/amocrm';
import { saveAmoCRMLeadsBatch, saveTildaLeadsBatch, updateWeekHistory, getLeadsForWeek, getAdsDataForWeek } from '@/lib/db-dashboard';
import { getPreviousWeeks } from '@/lib/week-helper';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const previousWeeks = getPreviousWeeks(8);
    console.log(`[CRON] Обновление истории: ${previousWeeks.length} недель`);

    for (const week of previousWeeks) {
      try {
        // Синхронизируем лиды за эту неделю
        const { utmLeads, tildaLeads } = await getProcessedLeads(week.startDate, week.endDate);

        // Batch сохранение
        await saveAmoCRMLeadsBatch(utmLeads);
        await saveTildaLeadsBatch(tildaLeads);

        // Подсчитываем статистику
        const leadsStats = await getLeadsForWeek(week.startDate, week.endDate);
        const adsData = await getAdsDataForWeek(week.startDate, week.endDate);

        const totalLeads = leadsStats.reduce((sum: number, l: any) => sum + (l.total_leads || 0), 0);
        const totalQualified = leadsStats.reduce((sum: number, l: any) => sum + (l.qualified_leads || 0), 0);
        const totalCost = adsData.reduce((sum: number, a: any) => sum + (Number(a.cost) || 0), 0);

        await updateWeekHistory(week.startDate, week.endDate, totalCost, totalLeads, totalQualified);

        console.log(`[CRON] Обновлена неделя ${week.displayRange}: ${totalLeads} лидов, ${totalQualified} квал.`);

        // Задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`[CRON] Ошибка обновления недели ${week.startDate}:`, error.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CRON] Ошибка обновления истории:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
