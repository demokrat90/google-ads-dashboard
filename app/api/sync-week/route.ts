import { NextRequest, NextResponse } from 'next/server';
import { getProcessedLeads } from '@/lib/amocrm';
import { saveAmoCRMLeadsBatch, getDashboardConnection } from '@/lib/db-dashboard';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start') || '2026-01-04';
  const endDate = searchParams.get('end') || '2026-01-10';

  const results: any = {
    timestamp: new Date().toISOString(),
    period: { startDate, endDate },
    steps: []
  };

  try {
    // Получаем лиды за указанный период
    const leads = await getProcessedLeads(startDate, endDate);
    results.steps.push({
      name: 'Fetched leads from amoCRM',
      count: leads.length
    });

    if (leads.length === 0) {
      return NextResponse.json({
        ...results,
        message: 'No leads with UTM data found for this period'
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

    return NextResponse.json({ success: true, ...results });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      ...results
    }, { status: 500 });
  }
}
