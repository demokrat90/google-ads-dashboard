import mysql from 'mysql2/promise';

// Основная БД - только чтение (застройщики, проекты, юниты)
export async function getMainConnection() {
  return mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectTimeout: 10000,
  });
}

// Получить всех застройщиков
export async function getAllDevelopers() {
  const conn = await getMainConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id, name FROM developers ORDER BY name'
    );
    return rows;
  } finally {
    await conn.end();
  }
}

// Получить проекты застройщика
export async function getProjectsByDeveloper(developerId: number) {
  const conn = await getMainConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT
        p.id,
        p.name,
        p.developer_id,
        p.status,
        COUNT(CASE WHEN u.status = 'available' OR u.status = 'for_sale' THEN 1 END) as units_count
      FROM projects p
      LEFT JOIN units u ON u.project_id = p.id
      WHERE p.developer_id = ?
      GROUP BY p.id
      ORDER BY units_count DESC, p.name`,
      [developerId]
    );
    return rows;
  } finally {
    await conn.end();
  }
}
