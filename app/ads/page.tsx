import { getAdsDataForWeek, getLeadsForWeek, getWeeksHistory, getTildaLeadsForWeek } from '@/lib/db-dashboard';
import { getCurrentWeekInfo, formatWeekRange, getPreviousWeeks } from '@/lib/week-helper';
import Link from 'next/link';
import { AdsTable } from './AdsTable';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function AdsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const weekOffset = parseInt(params.week || '0', 10);

  // Получаем информацию о выбранной неделе
  let weekInfo;
  if (weekOffset === 0) {
    weekInfo = getCurrentWeekInfo();
  } else {
    const previousWeeks = getPreviousWeeks(weekOffset);
    weekInfo = previousWeeks[weekOffset - 1];
  }

  let adsData: any[] = [];
  let leadsData: any[] = [];
  let history: any[] = [];
  let tildaData: any = { total_leads: 0, qualified_leads: 0 };
  let dbError: string | null = null;

  try {
    const results = await Promise.all([
      getAdsDataForWeek(weekInfo.startDate, weekInfo.endDate),
      getLeadsForWeek(weekInfo.startDate, weekInfo.endDate),
      getWeeksHistory(10),
      getTildaLeadsForWeek(weekInfo.startDate, weekInfo.endDate),
    ]);
    adsData = results[0];
    leadsData = results[1];
    history = results[2];
    tildaData = results[3];
  } catch (error: any) {
    dbError = error.message || 'Ошибка подключения к базе данных';
    console.error('[AdsPage] DB Error:', error);
  }

  // Создаём map лидов по campaign_id
  const leadsMap: Record<string, { leads: number; qualified: number }> = {};
  leadsData.forEach((lead: any) => {
    if (lead.campaign_id) {
      leadsMap[lead.campaign_id] = {
        leads: Number(lead.total_leads) || 0,
        qualified: Number(lead.qualified_leads) || 0
      };
    }
  });

  // Группируем по кампаниям
  const campaignsMap: Record<string, any> = {};
  adsData.forEach((row: any) => {
    if (!campaignsMap[row.campaign_id]) {
      // Маппинг лидов по campaign_id
      const campaignLeads = leadsMap[row.campaign_id] || { leads: 0, qualified: 0 };
      campaignsMap[row.campaign_id] = {
        id: row.campaign_id,
        name: row.campaign_name,
        language: row.language,
        cost: 0,
        leads: Number(campaignLeads.leads) || 0,
        qualifiedLeads: Number(campaignLeads.qualified) || 0,
        adGroups: []
      };
    }

    if (row.adgroup_id) {
      const groupLeads = leadsMap[row.adgroup_name] || { leads: 0, qualified: 0 };
      campaignsMap[row.campaign_id].adGroups.push({
        id: row.adgroup_id,
        name: row.adgroup_name,
        cost: Number(row.cost) || 0,
        leads: Number(groupLeads.leads) || 0,
        qualifiedLeads: Number(groupLeads.qualified) || 0
      });
      campaignsMap[row.campaign_id].cost += Number(row.cost) || 0;
    } else {
      campaignsMap[row.campaign_id].cost += Number(row.cost) || 0;
    }
  });

  const campaigns = Object.values(campaignsMap);

  const historyWithRange = history.map((week: any) => ({
    ...week,
    dateRange: formatWeekRange(week.week_start, week.week_end)
  }));

  return (
    <main className="main">
      <div className="page-header">
        <h1 className="page-title">Google Ads + amoCRM</h1>
        <div className="week-selector">
          <Link
            href={`/ads?week=${weekOffset + 1}`}
            className="week-nav"
            style={{ marginRight: '10px', textDecoration: 'none', color: '#1a73e8' }}
          >
            ← Пред.
          </Link>
          <span className="week-current">{weekInfo.displayRange}</span>
          {weekOffset > 0 && (
            <Link
              href={`/ads?week=${weekOffset - 1}`}
              className="week-nav"
              style={{ marginLeft: '10px', textDecoration: 'none', color: '#1a73e8' }}
            >
              След. →
            </Link>
          )}
        </div>
      </div>

      {dbError && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          color: '#991b1b'
        }}>
          <strong>Ошибка БД:</strong> {dbError}
          <br />
          <small>Попробуйте обновить страницу через несколько минут</small>
        </div>
      )}

      <AdsTable campaigns={campaigns} tildaData={tildaData} />

      <HistorySection history={historyWithRange} />
    </main>
  );
}

function HistorySection({ history }: { history: any[] }) {
  return (
    <div className="history-section">
      <details>
        <summary className="history-toggle">История недель</summary>
        <div className="history-list open">
          {history.length === 0 ? (
            <div className="history-item">
              <span style={{ color: '#5f6368' }}>История пока пуста</span>
            </div>
          ) : (
            history.map((week: any, index: number) => (
              <div key={index} className="history-item">
                <span className="history-week">{week.dateRange}</span>
                <span className="history-stats">
                  {Number(week.cost).toFixed(2)} AED | {week.leads} лидов | {week.qualifiedLeads} квал.
                </span>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
