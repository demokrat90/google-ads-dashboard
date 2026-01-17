import { NextResponse } from 'next/server';
import { getAdsDataForWeek, getLeadsForWeek } from '@/lib/db-dashboard';
import { getCurrentWeekInfo } from '@/lib/week-helper';

export async function GET() {
  try {
    const weekInfo = getCurrentWeekInfo();

    const [adsData, leadsData] = await Promise.all([
      getAdsDataForWeek(weekInfo.startDate, weekInfo.endDate),
      getLeadsForWeek(weekInfo.startDate, weekInfo.endDate),
    ]);

    // Примеры данных для проверки типов
    const adsSample = adsData.slice(0, 3).map((row: any) => ({
      campaign_id: row.campaign_id,
      campaign_id_type: typeof row.campaign_id,
      adgroup_id: row.adgroup_id,
      adgroup_id_type: typeof row.adgroup_id,
    }));

    const leadsSample = leadsData.slice(0, 3).map((row: any) => ({
      campaign_id: row.campaign_id,
      campaign_id_type: typeof row.campaign_id,
      adgroup_id: row.adgroup_id,
      adgroup_id_type: typeof row.adgroup_id,
      total_leads: row.total_leads,
    }));

    // Проверка совпадений
    const adsAdgroupIds = new Set(adsData.map((r: any) => String(r.adgroup_id)));
    const leadsAdgroupIds = new Set(leadsData.map((r: any) => String(r.adgroup_id)));

    const matchingIds = [...leadsAdgroupIds].filter(id => adsAdgroupIds.has(id));

    return NextResponse.json({
      weekInfo,
      adsCount: adsData.length,
      leadsCount: leadsData.length,
      adsSample,
      leadsSample,
      matchingAdgroupIds: matchingIds.length,
      matchingSamples: matchingIds.slice(0, 5),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
