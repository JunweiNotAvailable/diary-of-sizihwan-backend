import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Create a neon SQL interface with the connection string
const sql = neon(process.env.DATABASE_URL!);

// Function to execute SQL queries with parameters
export const query = async (text: string, params: any[] = []) => {
  try {
    const start = Date.now();
    
    // Use the query method for parameterized queries
    const result = await sql.query(text, params);
    
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.length });
    
    return {
      rows: result,
      rowCount: result.length
    };
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Type definitions
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export default sql;