'use client';

import { useState, Fragment } from 'react';

interface AdGroup {
  id: string;
  name: string;
  cost: number;
  leads: number;
  qualifiedLeads: number;
}

interface Campaign {
  id: string;
  name: string;
  language: string;
  cost: number;
  leads: number;
  qualifiedLeads: number;
  adGroups: AdGroup[];
}

interface AdsTableProps {
  campaigns: Campaign[];
  tildaData: { total_leads: number; qualified_leads: number };
}

export function AdsTable({ campaigns, tildaData }: AdsTableProps) {
  // Кампании с >1 группой развёрнуты, с 1 группой — свёрнуты
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(campaigns.filter(c => c.adGroups.length > 1).map(c => c.id))
  );
  const [viewMode, setViewMode] = useState<'all' | 'campaigns'>('all');

  const toggleCampaign = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const expandAll = () => setExpanded(new Set(campaigns.map(c => c.id)));
  const collapseAll = () => setExpanded(new Set());

  // Подсчёт итогов
  const totals = {
    cost: campaigns.reduce((sum, c) => sum + c.cost, 0),
    leads: campaigns.reduce((sum, c) => sum + c.leads, 0),
    qualifiedLeads: campaigns.reduce((sum, c) => sum + c.qualifiedLeads, 0)
  };

  const formatCPL = (cost: number, leads: number) => {
    return leads > 0 ? `${(cost / leads).toFixed(2)} AED` : '—';
  };

  const hasTildaLeads = Number(tildaData.total_leads) > 0 || Number(tildaData.qualified_leads) > 0;

  return (
    <>
      {/* Переключатель режима */}
      <div className="view-toggle">
        <button
          className={viewMode === 'all' ? 'active' : ''}
          onClick={() => setViewMode('all')}
        >
          Все
        </button>
        <button
          className={viewMode === 'campaigns' ? 'active' : ''}
          onClick={() => setViewMode('campaigns')}
        >
          Только кампании
        </button>
        {viewMode === 'all' && (
          <>
            <button onClick={expandAll} className="toggle-btn">
              Развернуть все
            </button>
            <button onClick={collapseAll} className="toggle-btn">
              Свернуть все
            </button>
          </>
        )}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Кампания</th>
              {viewMode === 'all' && <th>Группа</th>}
              <th>Язык</th>
              <th className="number">Расход</th>
              <th className="number">Лиды</th>
              <th className="number">Квал.</th>
              <th className="number">CPL</th>
              <th className="number">CPQL</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && !hasTildaLeads ? (
              <tr>
                <td colSpan={viewMode === 'all' ? 8 : 7} style={{ textAlign: 'center', color: '#5f6368', padding: '40px' }}>
                  Нет данных. Настройте Google Ads Script для отправки данных.
                </td>
              </tr>
            ) : (
              <>
                {/* ИТОГО сверху */}
                {campaigns.length > 0 && (
                  <tr className="total-row total-row-top">
                    <td colSpan={viewMode === 'all' ? 3 : 2}>ИТОГО</td>
                    <td className="number">{totals.cost.toFixed(2)} AED</td>
                    <td className="number">{totals.leads}</td>
                    <td className="number">{totals.qualifiedLeads}</td>
                    <td className="number">{formatCPL(totals.cost, totals.leads)}</td>
                    <td className="number">{formatCPL(totals.cost, totals.qualifiedLeads)}</td>
                  </tr>
                )}
                {viewMode === 'campaigns' ? (
                  // Режим "Только кампании" - итоги по кампаниям
                  campaigns.map((campaign) => (
                    <tr key={campaign.id} className="campaign-row campaign-only">
                      <td>{campaign.name}</td>
                      <td>{campaign.language || '—'}</td>
                      <td className="number">{campaign.cost.toFixed(2)} AED</td>
                      <td className="number">{campaign.leads}</td>
                      <td className="number">{campaign.qualifiedLeads}</td>
                      <td className="number">{formatCPL(campaign.cost, campaign.leads)}</td>
                      <td className="number">{formatCPL(campaign.cost, campaign.qualifiedLeads)}</td>
                    </tr>
                  ))
                ) : (
                  // Режим "Все" - кампании + группы объявлений
                  campaigns.map((campaign) => {
                    const isExpanded = expanded.has(campaign.id);
                    const hasAdGroups = campaign.adGroups.length > 0;
                    const groupRows = campaign.adGroups;

                    return (
                      <Fragment key={campaign.id}>
                        <tr className="campaign-row with-groups">
                          <td>
                            {hasAdGroups && (
                              <button
                                className="expand-btn"
                                onClick={() => toggleCampaign(campaign.id)}
                                title={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                {isExpanded ? '-' : '+'}
                              </button>
                            )}
                            <span className="campaign-name">{campaign.name}</span>
                          </td>
                          <td className="group-cell">-</td>
                          <td>{campaign.language || '-'}</td>
                          <td className="number">{campaign.cost.toFixed(2)} AED</td>
                          <td className="number">{campaign.leads}</td>
                          <td className="number">{campaign.qualifiedLeads}</td>
                          <td className="number">{formatCPL(campaign.cost, campaign.leads)}</td>
                          <td className="number">{formatCPL(campaign.cost, campaign.qualifiedLeads)}</td>
                        </tr>

                        {isExpanded && hasAdGroups && groupRows.map((group) => (
                          <tr key={group.id} className="adgroup-row">
                            <td></td>
                            <td className="group-cell">{group.name}</td>
                            <td></td>
                            <td className="number">{group.cost.toFixed(2)} AED</td>
                            <td className="number">{group.leads}</td>
                            <td className="number">{group.qualifiedLeads}</td>
                            <td className="number">{formatCPL(group.cost, group.leads)}</td>
                            <td className="number">{formatCPL(group.cost, group.qualifiedLeads)}</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })
                )}

                {/* Tilda лиды без UTM */}
                {hasTildaLeads && (
                  <tr className="tilda-row">
                    <td><strong>Tilda (без UTM)</strong></td>
                    {viewMode === 'all' && <td>—</td>}
                    <td>—</td>
                    <td className="number">—</td>
                    <td className="number">{Number(tildaData.total_leads) || 0}</td>
                    <td className="number">{Number(tildaData.qualified_leads) || 0}</td>
                    <td className="number">—</td>
                    <td className="number">—</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
          {campaigns.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td colSpan={viewMode === 'all' ? 3 : 2}>ИТОГО</td>
                <td className="number">{totals.cost.toFixed(2)} AED</td>
                <td className="number">{totals.leads}</td>
                <td className="number">{totals.qualifiedLeads}</td>
                <td className="number">{formatCPL(totals.cost, totals.leads)}</td>
                <td className="number">{formatCPL(totals.cost, totals.qualifiedLeads)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}
