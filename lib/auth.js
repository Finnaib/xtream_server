// File Location: lib/auth.js
// User authentication functions

import { getConnection } from './db';

export async function authenticateUser(username, password) {
  try {
    const conn = await getConnection();
    
    // Query user from database
    const [rows] = await conn.execute(
      'SELECT * FROM users WHERE username = ? AND password = ? AND active = ?',
      [username, password, 1]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const user = rows[0];
    
    // Check if account is expired
    if (user.exp_date) {
      const expDate = new Date(user.exp_date);
      const now = new Date();
      
      if (expDate < now) {
        console.log('User account expired:', username);
        return null;
      }
    }
    
    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}