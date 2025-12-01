import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      connectTimeout: 10000
    });
    
    const [rows] = await conn.execute('SELECT username FROM users LIMIT 1');
    await conn.end();
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Database connected!',
      user: rows[0]
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      message: error.message,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    }, { status: 500 });
  }
}