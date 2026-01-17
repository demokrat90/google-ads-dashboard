import { NextResponse } from 'next/server';
import { getProcessedLeads } from '@/lib/amocrm';
import { saveAmoCRMLeadsBatch, getDashboardConnection } from '@/lib/db-dashboard';
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

    // Получаем лиды
    const leads = await getProcessedLeads(weekInfo.startDate, weekInfo.endDate);
    results.steps.push({
      name: 'Fetched leads from amoCRM',
      count: leads.length
    });

    if (leads.length === 0) {
      return NextResponse.json({
        ...results,
        message: 'No leads with UTM data found'
      });
    }

    // Сохраняем все лиды batch'ем (1 подключение на все)
    const { saved, errors } = await saveAmoCRMLeadsBatch(leads);

    results.steps.push({
      name: 'Save results',
      savedCount: saved,
      errorCount: errors
    });

    // Проверим что сохранилось
    const conn = await getDashboardConnection();
    const [rows] = await conn.execute('SELECT COUNT(*) as count FROM amocrm_leads');
    await conn.end();

    results.steps.push({
      name: 'Final DB check',
      totalRowsInTable: (rows as any)[0].count
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
