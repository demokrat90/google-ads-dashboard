'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  developers: any[];
  allDevelopers: any[];
  selectedId: number | null;
  projects: any[];
  showOnlyWithUnits: boolean;
  stats: { totalProjects: number; withUnits: number; withAds: number };
  favorites: number[];
}

export default function DevelopersClient({
  developers,
  allDevelopers,
  selectedId,
  projects,
  showOnlyWithUnits,
  stats,
  favorites
}: Props) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFavorites, setSelectedFavorites] = useState<number[]>(favorites);

  function selectDeveloper(id: string) {
    const url = `/developers?developer=${id}${showOnlyWithUnits ? '&filter=with_units' : ''}`;
    router.push(url);
  }

  function applyFilter(filter: string) {
    const url = `/developers?developer=${selectedId}${filter === 'with_units' ? '&filter=with_units' : ''}`;
    router.push(url);
  }

  function toggleFavorite(id: number) {
    setSelectedFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }

  async function saveFavorites() {
    try {
      const response = await fetch('/api/developers/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ developerIds: selectedFavorites })
      });

      if (response.ok) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        alert('Ошибка сохранения');
      }
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  }

  const filteredDevelopers = allDevelopers.filter((dev: any) =>
    dev.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="main">
      <div className="page-header">
        <h1 className="page-title">Застройщики и проекты</h1>
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <label htmlFor="developerSelect">Застройщик:</label>
          <select
            id="developerSelect"
            value={selectedId || ''}
            onChange={(e) => selectDeveloper(e.target.value)}
          >
            {developers.map((dev: any) => (
              <option key={dev.id} value={dev.id}>{dev.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="filter"
                value="all"
                checked={!showOnlyWithUnits}
                onChange={() => applyFilter('all')}
              />
              Все проекты
            </label>
            <label>
              <input
                type="radio"
                name="filter"
                value="with_units"
                checked={showOnlyWithUnits}
                onChange={() => applyFilter('with_units')}
              />
              Только с юнитами
            </label>
          </div>
        </div>

        <button className="settings-btn" onClick={() => setIsModalOpen(true)}>
          Настроить список
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Проект</th>
              <th className="number">Юнитов в продаже</th>
              <th>Реклама</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: '#5f6368', padding: '40px' }}>
                  {developers.length === 0
                    ? 'Нет данных. Проверьте подключение к MySQL.'
                    : `У этого застройщика нет проектов${showOnlyWithUnits ? ' с юнитами в продаже' : ''}.`
                  }
                </td>
              </tr>
            ) : (
              projects.map((project: any) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td className="number">{project.units_count}</td>
                  <td>
                    {project.hasAds ? (
                      <span className="badge badge-success">Есть</span>
                    ) : (
                      <span className="badge badge-danger">Нет</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="summary-row">
          <span className="summary-item">Всего проектов: <strong>{stats.totalProjects}</strong></span>
          <span className="summary-item">С юнитами: <strong>{stats.withUnits}</strong></span>
          <span className="summary-item">С рекламой: <strong>{stats.withAds}</strong></span>
        </div>
      </div>

      {/* Modal */}
      <div
        className={`modal-overlay ${isModalOpen ? 'open' : ''}`}
        onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
      >
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">Выбор застройщиков</h2>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
          </div>
          <div className="modal-body">
            <input
              type="text"
              className="search-input"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="checkbox-list">
              {filteredDevelopers.map((dev: any) => (
                <div key={dev.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`dev_${dev.id}`}
                    checked={selectedFavorites.includes(dev.id)}
                    onChange={() => toggleFavorite(dev.id)}
                  />
                  <label htmlFor={`dev_${dev.id}`}>{dev.name}</label>
                </div>
              ))}
            </div>
            <div className="selected-count">
              Выбрано: {selectedFavorites.length} из {allDevelopers.length}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Отмена
            </button>
            <button className="btn" onClick={saveFavorites}>
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
