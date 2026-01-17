// Неделя: суббота - пятница

export function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();

  let daysToSubtract: number;
  if (day === 6) {
    daysToSubtract = 0;
  } else {
    daysToSubtract = day + 1;
  }

  const saturday = new Date(now);
  saturday.setDate(now.getDate() - daysToSubtract);
  saturday.setHours(0, 0, 0, 0);

  return saturday;
}

export function getCurrentWeekEnd(): Date {
  const start = getCurrentWeekStart();
  const friday = new Date(start);
  friday.setDate(start.getDate() + 6);
  friday.setHours(23, 59, 59, 999);
  return friday;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatWeekRange(startDate: string | Date, endDate: string | Date): string {
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startDay = start.getDate();
  const startMonth = months[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = months[end.getMonth()];
  const year = end.getFullYear();

  if (start.getMonth() === end.getMonth()) {
    return `${startDay} — ${endDay} ${endMonth} ${year}`;
  } else {
    return `${startDay} ${startMonth} — ${endDay} ${endMonth} ${year}`;
  }
}

export function getCurrentWeekInfo() {
  const start = getCurrentWeekStart();
  const end = getCurrentWeekEnd();

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
    displayRange: formatWeekRange(start, end)
  };
}

export function getPreviousWeeks(count: number = 8) {
  const weeks = [];
  const currentStart = getCurrentWeekStart();

  for (let i = 1; i <= count; i++) {
    const weekStart = new Date(currentStart);
    weekStart.setDate(currentStart.getDate() - (7 * i));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    weeks.push({
      startDate: formatDate(weekStart),
      endDate: formatDate(weekEnd),
      displayRange: formatWeekRange(weekStart, weekEnd)
    });
  }

  return weeks;
}
