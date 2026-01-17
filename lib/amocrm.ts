import axios from 'axios';

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN;
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const QUALIFIED_TAG = process.env.AMOCRM_QUALIFIED_TAG || 'Квалифицирован';

const getBaseUrl = () => `https://${AMOCRM_DOMAIN}/api/v4`;

const getHeaders = () => ({
  'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
});

interface AmoCRMLead {
  id: number;
  created_at: number;
  custom_fields_values?: Array<{
    field_name: string;
    values: Array<{ value: string }>;
  }>;
  _embedded?: {
    tags?: Array<{ name: string }>;
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
          with: 'contacts'
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

export async function getProcessedLeads(dateFrom: string, dateTo: string) {
  const rawLeads = await getLeads(dateFrom, dateTo);

  return rawLeads
    .map(lead => {
      const utm = extractUtmFromLead(lead);

      if (!utm.utm_source && !utm.utm_campaign && !utm.utm_content) {
        return null;
      }

      return {
        lead_id: String(lead.id),
        created_date: new Date(lead.created_at * 1000).toISOString().split('T')[0],
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
        is_qualified: isQualified(lead) ? 1 : 0
      };
    })
    .filter((lead): lead is NonNullable<typeof lead> => lead !== null);
}
