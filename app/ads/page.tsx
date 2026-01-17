import { getAdsDataForWeek, getLeadsForWeek, getWeeksHistory } from '@/lib/db-dashboard';
import { getCurrentWeekInfo, formatWeekRange, getPreviousWeeks } from '@/lib/week-helper';
import { Fragment } from 'react';
import Link from 'next/link';

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
  let dbError: string | null = null;

  try {
    [adsData, leadsData, history] = await Promise.all([
      getAdsDataForWeek(weekInfo.startDate, weekInfo.endDate),
      getLeadsForWeek(weekInfo.startDate, weekInfo.endDate),
      getWeeksHistory(10),
    ]);
  } catch (error: any) {
    dbError = error.message || 'Ошибка подключения к базе данных';
    console.error('[AdsPage] DB Error:', error);
  }

  // Создаём map лидов по campaign_id
  const leadsMap: Record<string, { leads: number; qualified: number }> = {};
  leadsData.forEach((lead: any) => {
    if (lead.campaign_id) {
      leadsMap[lead.campaign_id] = {
        leads: lead.total_leads || 0,
        qualified: lead.qualified_leads || 0
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
        leads: campaignLeads.leads,
        qualifiedLeads: campaignLeads.qualified,
        adGroups: []
      };
    }

    if (row.adgroup_id) {
      const groupLeads = leadsMap[row.adgroup_name] || { leads: 0, qualified: 0 };
      campaignsMap[row.campaign_id].adGroups.push({
        id: row.adgroup_id,
        name: row.adgroup_name,
        cost: Number(row.cost) || 0,
        leads: groupLeads.leads,
        qualifiedLeads: groupLeads.qualified
      });
      campaignsMap[row.campaign_id].cost += Number(row.cost) || 0;
    } else {
      campaignsMap[row.campaign_id].cost += Number(row.cost) || 0;
    }
  });

  const campaigns = Object.values(campaignsMap);

  const totals = {
    cost: campaigns.reduce((sum: number, c: any) => sum + c.cost, 0),
    leads: campaigns.reduce((sum: number, c: any) => sum + c.leads, 0),
    qualifiedLeads: campaigns.reduce((sum: number, c: any) => sum + c.qualifiedLeads, 0)
  };

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

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Кампания / Группа</th>
              <th>Язык</th>
              <th className="number">Расход</th>
              <th className="number">Лиды</th>
              <th className="number">Квал.</th>
              <th className="number">CPL</th>
              <th className="number">CPQL</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#5f6368', padding: '40px' }}>
                  {dbError ? 'Данные временно недоступны' : 'Нет данных. Настройте Google Ads Script для отправки данных.'}
                </td>
              </tr>
            ) : (
              campaigns.map((campaign: any) => (
                <Fragment key={campaign.id}>
                  <tr className="campaign-row">
                    <td>{campaign.name}</td>
                    <td>{campaign.language || '—'}</td>
                    <td className="number">{campaign.cost.toFixed(2)} AED</td>
                    <td className="number">{campaign.leads}</td>
                    <td className="number">{campaign.qualifiedLeads}</td>
                    <td className="number">
                      {campaign.leads > 0 ? `${(campaign.cost / campaign.leads).toFixed(2)} AED` : '—'}
                    </td>
                    <td className="number">
                      {campaign.qualifiedLeads > 0 ? `${(campaign.cost / campaign.qualifiedLeads).toFixed(2)} AED` : '—'}
                    </td>
                  </tr>
                  {campaign.adGroups.map((group: any) => (
                    <tr key={group.id} className="adgroup-row">
                      <td>{group.name}</td>
                      <td></td>
                      <td className="number">{group.cost.toFixed(2)} AED</td>
                      <td className="number">{group.leads}</td>
                      <td className="number">{group.qualifiedLeads}</td>
                      <td className="number">
                        {group.leads > 0 ? `${(group.cost / group.leads).toFixed(2)} AED` : '—'}
                      </td>
                      <td className="number">
                        {group.qualifiedLeads > 0 ? `${(group.cost / group.qualifiedLeads).toFixed(2)} AED` : '—'}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
          {campaigns.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td colSpan={2}>ИТОГО</td>
                <td className="number">{totals.cost.toFixed(2)} AED</td>
                <td className="number">{totals.leads}</td>
                <td className="number">{totals.qualifiedLeads}</td>
                <td className="number">
                  {totals.leads > 0 ? `${(totals.cost / totals.leads).toFixed(2)} AED` : '—'}
                </td>
                <td className="number">
                  {totals.qualifiedLeads > 0 ? `${(totals.cost / totals.qualifiedLeads).toFixed(2)} AED` : '—'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

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
