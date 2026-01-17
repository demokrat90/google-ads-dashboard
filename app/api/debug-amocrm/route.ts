import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const domain = process.env.AMOCRM_DOMAIN;
  const token = process.env.AMOCRM_ACCESS_TOKEN;

  const results: any = {
    timestamp: new Date().toISOString(),
    config: {
      domain: domain ? `${domain.substring(0, 30)}...` : 'NOT SET',
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 20) : 'NOT SET'
    },
    tests: []
  };

  if (!domain || !token) {
    results.tests.push({
      name: 'Config',
      status: 'FAIL',
      error: 'Missing AMOCRM_DOMAIN or AMOCRM_ACCESS_TOKEN'
    });
    return NextResponse.json(results);
  }

  // Test account API
  try {
    const response = await axios.get(`https://${domain}/api/v4/account`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    results.tests.push({
      name: 'Account API',
      status: 'PASS',
      data: { id: response.data.id, name: response.data.name }
    });
  } catch (error: any) {
    results.tests.push({
      name: 'Account API',
      status: 'FAIL',
      error: error.response?.data || error.message,
      statusCode: error.response?.status
    });
  }

  // Test leads API
  try {
    const response = await axios.get(`https://${domain}/api/v4/leads`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: { limit: 3 },
      timeout: 10000
    });
    const leads = response.data._embedded?.leads || [];
    results.tests.push({
      name: 'Leads API',
      status: 'PASS',
      count: leads.length
    });
  } catch (error: any) {
    results.tests.push({
      name: 'Leads API',
      status: 'FAIL',
      error: error.response?.data || error.message
    });
  }

  return NextResponse.json(results);
}
