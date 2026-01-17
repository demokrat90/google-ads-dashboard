import { NextRequest, NextResponse } from 'next/server';
import { saveFavoriteDevelopers } from '@/lib/db-dashboard';

export async function POST(request: NextRequest) {
  try {
    const { developerIds } = await request.json();

    if (!Array.isArray(developerIds)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    await saveFavoriteDevelopers(developerIds);

    return NextResponse.json({ success: true, count: developerIds.length });
  } catch (error: any) {
    console.error('[Developers] Ошибка сохранения избранных:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
