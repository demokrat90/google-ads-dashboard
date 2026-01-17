import { NextResponse } from 'next/server';
import { getProcessedLeads } from '@/lib/amocrm';
import { saveAmoCRMLeadsBatch, saveTildaLeadsBatch, getDashboardConnection } from '@/lib/db-dashboard';
import { getCurrentWeekInfo } from '@/lib/week-helper';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  try {
    const weekInfo = getCurrentWeekInfo();
    results.steps.push({
      name: 'Week info',
      data: weekInfo
    });

    // Получаем лиды (разделённые на UTM и Tilda)
    const { utmLeads, tildaLeads } = await getProcessedLeads(weekInfo.startDate, weekInfo.endDate);
    results.steps.push({
      name: 'Fetched leads from amoCRM',
      utmCount: utmLeads.length,
      tildaCount: tildaLeads.length
    });

    if (utmLeads.length === 0 && tildaLeads.length === 0) {
      return NextResponse.json({
        ...results,
        message: 'No leads found'
      });
    }

    // Сохраняем UTM лиды
    const utmResult = await saveAmoCRMLeadsBatch(utmLeads);
    results.steps.push({
      name: 'UTM leads saved',
      savedCount: utmResult.saved,
      errorCount: utmResult.errors
    });

    // Сохраняем Tilda лиды в отдельную таблицу
    const tildaResult = await saveTildaLeadsBatch(tildaLeads);
    results.steps.push({
      name: 'Tilda leads saved',
      savedCount: tildaResult.saved,
      errorCount: tildaResult.errors
    });

    // Проверим что сохранилось
    const conn = await getDashboardConnection();
    const [utmRows] = await conn.execute('SELECT COUNT(*) as count FROM amocrm_leads');
    const [tildaRows] = await conn.execute('SELECT COUNT(*) as count FROM tilda_leads');
    await conn.end();

    results.steps.push({
      name: 'Final DB check',
      utmLeadsTotal: (utmRows as any)[0].count,
      tildaLeadsTotal: (tildaRows as any)[0].count
    });

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      ...results
    }, { status: 500 });
  }
}
