import { NextRequest, NextResponse } from 'next/server';
import { getProcessedLeads } from '@/lib/amocrm';
import { saveAmoCRMLeadsBatch, saveTildaLeadsBatch, getDashboardConnection } from '@/lib/db-dashboard';

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
    const { utmLeads, tildaLeads } = await getProcessedLeads(startDate, endDate);
    results.steps.push({
      name: 'Fetched leads from amoCRM',
      utmCount: utmLeads.length,
      tildaCount: tildaLeads.length
    });

    if (utmLeads.length === 0 && tildaLeads.length === 0) {
      return NextResponse.json({
        ...results,
        message: 'No leads found for this period'
      });
    }

    // Сохраняем UTM лиды batch'ем
    const utmResult = await saveAmoCRMLeadsBatch(utmLeads);
    // Сохраняем Tilda лиды (без UTM) batch'ем
    const tildaResult = await saveTildaLeadsBatch(tildaLeads);

    results.steps.push({
      name: 'Save results',
      utm: { saved: utmResult.saved, errors: utmResult.errors },
      tilda: { saved: tildaResult.saved, errors: tildaResult.errors }
    });

    // Проверим что сохранилось
    const conn = await getDashboardConnection();
    const [utmRows] = await conn.execute('SELECT COUNT(*) as count FROM amocrm_leads');
    const [tildaRows] = await conn.execute('SELECT COUNT(*) as count FROM tilda_leads');
    await conn.end();

    results.steps.push({
      name: 'Final DB check',
      utmLeadsInTable: (utmRows as any)[0].count,
      tildaLeadsInTable: (tildaRows as any)[0].count
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
