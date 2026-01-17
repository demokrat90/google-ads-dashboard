import axios from 'axios';

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN;
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const QUALIFIED_TAG = process.env.AMOCRM_QUALIFIED_TAG || 'Квалифицирован';
const TILDA_SOURCE = 'tilda publishing';

const getBaseUrl = () => `https://${AMOCRM_DOMAIN}/api/v4`;

const getHeaders = () => ({
  'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
});

interface AmoCRMLead {
  id: number;
  created_at: number;
  source_id?: number | null;
  custom_fields_values?: Array<{
    field_name: string;
    values: Array<{ value: string }>;
  }>;
  _embedded?: {
    tags?: Array<{ name: string }>;
    source?: {
      id: number;
      name: string;
    };
  };
}

export async function getLeads(dateFrom: string, dateTo: string): Promise<AmoCRMLead[]> {
  if (!AMOCRM_DOMAIN || !AMOCRM_ACCESS_TOKEN) {
    console.error('[amoCRM] Не настроены AMOCRM_DOMAIN или AMOCRM_ACCESS_TOKEN');
    return [];
  }

  try {
    const leads: AmoCRMLead[] = [];
    let page = 1;
    const limit = 250;

    const fromTimestamp = Math.floor(new Date(dateFrom).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(dateTo + 'T23:59:59').getTime() / 1000);

    while (true) {
      const response = await axios.get(`${getBaseUrl()}/leads`, {
        headers: getHeaders(),
        params: {
          page,
          limit,
          filter: {
            created_at: {
              from: fromTimestamp,
              to: toTimestamp
            }
          },
          with: 'contacts,source'
        }
      });

      if (!response.data._embedded?.leads) break;

      const pageLeads = response.data._embedded.leads;
      leads.push(...pageLeads);

      if (pageLeads.length < limit) break;

      page++;
      if (page > 100) break;

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return leads;
  } catch (error: any) {
    console.error('[amoCRM] Ошибка получения лидов:', error.response?.data || error.message);
    return [];
  }
}

function extractUtmFromLead(lead: AmoCRMLead) {
  const utm = {
    utm_source: null as string | null,
    utm_medium: null as string | null,
    utm_campaign: null as string | null,
    utm_content: null as string | null,
    utm_term: null as string | null
  };

  if (!lead.custom_fields_values) return utm;

  const utmFieldNames: Record<string, string[]> = {
    'utm_source': ['utm_source', 'UTM Source', 'Источник'],
    'utm_medium': ['utm_medium', 'UTM Medium'],
    'utm_campaign': ['utm_campaign', 'UTM Campaign', 'Кампания'],
    'utm_content': ['utm_content', 'UTM Content'],
    'utm_term': ['utm_term', 'UTM Term']
  };

  lead.custom_fields_values.forEach(field => {
    const fieldName = field.field_name.toLowerCase();

    for (const [utmKey, possibleNames] of Object.entries(utmFieldNames)) {
      if (possibleNames.some(name => fieldName.includes(name.toLowerCase()))) {
        if (field.values?.[0]) {
          (utm as any)[utmKey] = field.values[0].value;
        }
      }
    }
  });

  return utm;
}

function isQualified(lead: AmoCRMLead): boolean {
  if (!lead._embedded?.tags) return false;
  return lead._embedded.tags.some(tag =>
    tag.name.toLowerCase() === QUALIFIED_TAG.toLowerCase()
  );
}

function isTildaSource(lead: AmoCRMLead): boolean {
  // Проверяем источник сделки на "tilda publishing"
  const sourceName = lead._embedded?.source?.name?.toLowerCase();
  if (sourceName && sourceName.includes('tilda')) {
    return true;
  }
  return false;
}

// Извлекает campaign_id из utm_campaign (формат: cid|CAMPAIGN_ID|search)
function extractCampaignId(utmCampaign: string | null): string | null {
  if (!utmCampaign) return null;
  const match = utmCampaign.match(/cid[^0-9]*(\d+)/i);
  if (match) return match[1];
  if (/^\d+$/.test(utmCampaign)) return utmCampaign;
  return null;
}

// Извлекает adgroup_id из utm_content (формат: gid|ADGROUP_ID|aid|...)
function extractAdgroupId(utmContent: string | null): string | null {
  if (!utmContent) return null;
  const match = utmContent.match(/gid[^0-9]*(\d+)/i);
  return match ? match[1] : null;
}

export interface ProcessedLead {
  lead_id: string;
  created_date: string;
  campaign_id: string | null;
  adgroup_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  is_qualified: number;
}

export interface ProcessedLeadsResult {
  utmLeads: ProcessedLead[];
  tildaLeads: ProcessedLead[];
}

export async function getProcessedLeads(dateFrom: string, dateTo: string): Promise<ProcessedLeadsResult> {
  const rawLeads = await getLeads(dateFrom, dateTo);

  const utmLeads: ProcessedLead[] = [];
  const tildaLeads: ProcessedLead[] = [];

  for (const lead of rawLeads) {
    const utm = extractUtmFromLead(lead);
    const isTilda = isTildaSource(lead);
    const hasUtm = utm.utm_source || utm.utm_campaign || utm.utm_content;

    const processedLead: ProcessedLead = {
      lead_id: String(lead.id),
      created_date: new Date(lead.created_at * 1000).toISOString().split('T')[0],
      campaign_id: extractCampaignId(utm.utm_campaign),
      adgroup_id: extractAdgroupId(utm.utm_content),
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      utm_content: utm.utm_content,
      utm_term: utm.utm_term,
      is_qualified: isQualified(lead) ? 1 : 0
    };

    // Сделки с UTM-метками идут в основную таблицу (включая Tilda+UTM)
    if (hasUtm) {
      utmLeads.push(processedLead);
    }
    // Сделки с Tilda БЕЗ UTM-меток - отдельная строка в таблице
    else if (isTilda) {
      tildaLeads.push(processedLead);
    }
  }

  return { utmLeads, tildaLeads };
}
