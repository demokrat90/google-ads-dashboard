import mysql from 'mysql2/promise';

// Dashboard БД - чтение/запись
export async function getDashboardConnection() {
  return mysql.createConnection({
    host: process.env.DASHBOARD_MYSQL_HOST,
    user: process.env.DASHBOARD_MYSQL_USER,
    password: process.env.DASHBOARD_MYSQL_PASSWORD,
    database: process.env.DASHBOARD_MYSQL_DATABASE,
    connectTimeout: 10000,
  });
}

// Google Ads данные
export async function getAdsDataForWeek(startDate: string, endDate: string) {
  const conn = await getDashboardConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT
        campaign_id,
        campaign_name,
        adgroup_id,
        adgroup_name,
        language,
        SUM(cost) as cost,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks
      FROM google_ads_daily
      WHERE date BETWEEN ? AND ?
      GROUP BY campaign_id, adgroup_id
      ORDER BY campaign_name, adgroup_name`,
      [startDate, endDate]
    );
    return rows;
  } finally {
    await conn.end();
  }
}

// Лиды за неделю - группируем по campaign_id извлечённому из utm_campaign
// Формат utm_campaign: "cid|CAMPAIGN_ID|search" или просто ID для других источников
export async function getLeadsForWeek(startDate: string, endDate: string) {
  const conn = await getDashboardConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT
        CASE
          WHEN utm_campaign LIKE 'cid|%' THEN SUBSTRING_INDEX(SUBSTRING_INDEX(utm_campaign, '|', 2), '|', -1)
          ELSE utm_campaign
        END as campaign_id,
        COUNT(*) as total_leads,
        SUM(is_qualified) as qualified_leads
      FROM amocrm_leads
      WHERE created_date BETWEEN ? AND ?
      GROUP BY campaign_id`,
      [startDate, endDate]
    );
    return rows;
  } finally {
    await conn.end();
  }
}

// История недель
export async function getWeeksHistory(limit: number = 10) {
  const conn = await getDashboardConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT week_start, week_end, total_cost as cost, total_leads as leads, total_qualified as qualifiedLeads
       FROM weeks_history
       ORDER BY week_start DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  } finally {
    await conn.end();
  }
}

// Сохранить данные Google Ads за неделю (удаляет старые данные за этот период)
export async function saveGoogleAdsDataForWeek(weekStart: string, weekEnd: string, campaigns: any[]) {
  const conn = await getDashboardConnection();
  try {
    // Удаляем старые данные за эту неделю
    await conn.execute(
      'DELETE FROM google_ads_daily WHERE date BETWEEN ? AND ?',
      [weekStart, weekEnd]
    );

    // Записываем только группы объявлений (не кампании отдельно, чтобы избежать дублирования)
    for (const campaign of campaigns) {
      if (campaign.adGroups && campaign.adGroups.length > 0) {
        // Если есть группы - записываем только их
        for (const group of campaign.adGroups) {
          await conn.execute(
            `INSERT INTO google_ads_daily
             (date, campaign_id, campaign_name, adgroup_id, adgroup_name, language, cost, impressions, clicks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [weekStart, campaign.id, campaign.name, group.id, group.name, campaign.language || null,
             group.cost || 0, group.impressions || 0, group.clicks || 0]
          );
        }
      } else {
        // Если групп нет - записываем кампанию
        await conn.execute(
          `INSERT INTO google_ads_daily
           (date, campaign_id, campaign_name, adgroup_id, adgroup_name, language, cost, impressions, clicks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [weekStart, campaign.id, campaign.name, null, null, campaign.language || null,
           campaign.cost || 0, campaign.impressions || 0, campaign.clicks || 0]
        );
      }
    }
  } finally {
    await conn.end();
  }
}

// Тип лида amoCRM
interface AmoCRMLeadData {
  lead_id: string;
  created_date: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  is_qualified: number;
}

// Сохранить лид amoCRM (одиночный - для обратной совместимости)
export async function saveAmoCRMLead(lead: AmoCRMLeadData) {
  return saveAmoCRMLeadsBatch([lead]);
}

// Batch сохранение лидов amoCRM - одно подключение на все лиды
export async function saveAmoCRMLeadsBatch(leads: AmoCRMLeadData[]) {
  if (leads.length === 0) return { saved: 0, errors: 0 };

  const conn = await getDashboardConnection();
  let saved = 0;
  let errors = 0;

  try {
    // Используем одно подключение для всех лидов
    for (const lead of leads) {
      try {
        await conn.execute(
          `INSERT INTO amocrm_leads
           (lead_id, created_date, utm_source, utm_medium, utm_campaign, utm_content, utm_term, is_qualified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           is_qualified = VALUES(is_qualified)`,
          [lead.lead_id, lead.created_date, lead.utm_source, lead.utm_medium,
           lead.utm_campaign, lead.utm_content, lead.utm_term, lead.is_qualified]
        );
        saved++;
      } catch (e) {
        errors++;
      }
    }
    return { saved, errors };
  } finally {
    await conn.end();
  }
}

// Batch сохранение лидов Tilda - отдельная таблица
export async function saveTildaLeadsBatch(leads: AmoCRMLeadData[]) {
  if (leads.length === 0) return { saved: 0, errors: 0 };

  const conn = await getDashboardConnection();
  let saved = 0;
  let errors = 0;

  try {
    for (const lead of leads) {
      try {
        await conn.execute(
          `INSERT INTO tilda_leads
           (lead_id, created_date, utm_source, utm_medium, utm_campaign, utm_content, utm_term, is_qualified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           is_qualified = VALUES(is_qualified)`,
          [lead.lead_id, lead.created_date, lead.utm_source, lead.utm_medium,
           lead.utm_campaign, lead.utm_content, lead.utm_term, lead.is_qualified]
        );
        saved++;
      } catch (e) {
        errors++;
      }
    }
    return { saved, errors };
  } finally {
    await conn.end();
  }
}

// Лиды Tilda за период
export async function getTildaLeadsForWeek(startDate: string, endDate: string) {
  const conn = await getDashboardConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_leads,
        SUM(is_qualified) as qualified_leads
      FROM tilda_leads
      WHERE created_date BETWEEN ? AND ?`,
      [startDate, endDate]
    );
    return rows[0] || { total_leads: 0, qualified_leads: 0 };
  } finally {
    await conn.end();
  }
}

// Избранные застройщики
export async function getFavoriteDevelopers(): Promise<number[]> {
  const conn = await getDashboardConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT developer_id FROM favorite_developers'
    );
    return rows.map(r => r.developer_id);
  } finally {
    await conn.end();
  }
}

export async function saveFavoriteDevelopers(ids: number[]) {
  const conn = await getDashboardConnection();
  try {
    await conn.execute('DELETE FROM favorite_developers');
    for (const id of ids) {
      await conn.execute(
        'INSERT INTO favorite_developers (developer_id) VALUES (?)',
        [id]
      );
    }
  } finally {
    await conn.end();
  }
}

// Получить названия кампаний (для проверки рекламы)
export async function getCampaignNames(): Promise<string[]> {
  const conn = await getDashboardConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT DISTINCT campaign_name FROM google_ads_daily'
    );
    return rows.map(r => r.campaign_name.toLowerCase());
  } finally {
    await conn.end();
  }
}

// Обновить историю недели
export async function updateWeekHistory(
  weekStart: string,
  weekEnd: string,
  totalCost: number,
  totalLeads: number,
  totalQualified: number
) {
  const conn = await getDashboardConnection();
  try {
    await conn.execute(
      `INSERT INTO weeks_history (week_start, week_end, total_cost, total_leads, total_qualified)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       total_cost = VALUES(total_cost),
       total_leads = VALUES(total_leads),
       total_qualified = VALUES(total_qualified),
       updated_at = CURRENT_TIMESTAMP`,
      [weekStart, weekEnd, totalCost, totalLeads, totalQualified]
    );
  } finally {
    await conn.end();
  }
}
