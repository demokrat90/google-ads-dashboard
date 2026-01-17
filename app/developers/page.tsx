import { getAllDevelopers, getProjectsByDeveloper } from '@/lib/db-main';
import { getFavoriteDevelopers, getCampaignNames } from '@/lib/db-dashboard';
import DevelopersClient from './DevelopersClient';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ developer?: string; filter?: string }>;
}

export default async function DevelopersPage({ searchParams }: Props) {
  const params = await searchParams;

  // Получаем данные
  const [allDevelopers, favorites, campaignNames] = await Promise.all([
    getAllDevelopers(),
    getFavoriteDevelopers(),
    getCampaignNames()
  ]);

  // Фильтруем только избранных (или первые 20)
  let developers: any[];
  if (favorites.length > 0) {
    developers = allDevelopers.filter((d: any) => favorites.includes(d.id));
  } else {
    developers = allDevelopers.slice(0, 20);
  }

  // Выбранный застройщик
  const selectedId = parseInt(params.developer || '') || (developers[0]?.id || null);
  const showOnlyWithUnits = params.filter === 'with_units';

  // Получаем проекты
  let projects: any[] = [];
  if (selectedId) {
    projects = await getProjectsByDeveloper(selectedId);

    // Помечаем проекты с рекламой
    projects = projects.map((project: any) => ({
      ...project,
      hasAds: campaignNames.some((c: string) => c.includes(project.name.toLowerCase()))
    }));

    // Фильтруем по наличию юнитов
    if (showOnlyWithUnits) {
      projects = projects.filter((p: any) => p.units_count > 0);
    }
  }

  // Статистика
  const stats = {
    totalProjects: projects.length,
    withUnits: projects.filter((p: any) => p.units_count > 0).length,
    withAds: projects.filter((p: any) => p.hasAds).length
  };

  return (
    <DevelopersClient
      developers={developers}
      allDevelopers={allDevelopers}
      selectedId={selectedId}
      projects={projects}
      showOnlyWithUnits={showOnlyWithUnits}
      stats={stats}
      favorites={favorites}
    />
  );
}
