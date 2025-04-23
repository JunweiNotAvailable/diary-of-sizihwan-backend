import { Router, Request, Response } from 'express';
import { query, ApiResponse } from '../db';

const router = Router();

// Interface for parsed query parameters
interface QueryParams {
  [key: string]: string | number | boolean;
}

// Parse query string (field1:val1,field2:val2...)
const parseQueryString = (queryString: string): QueryParams => {
  const result: QueryParams = {};
  const pairs = queryString.split(',');
  
  pairs.forEach(pair => {
    const [key, value] = pair.split(':');
    if (key && value) {
      result[key.trim()] = value.trim();
    }
  });
  
  return result;
};

// Build WHERE clause from parsed query
const buildWhereClause = (params: QueryParams): { clause: string, values: any[] } => {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  Object.entries(params).forEach(([key, value]) => {
    conditions.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });
  
  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
};

// GET /data - Get data (with optional filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { table, id, query: queryString, limit = 50, offset = 0, sortBy, order } = req.query;
    
    if (!table) {
      return res.status(400).json({
        success: false,
        error: 'Table parameter is required'
      } as ApiResponse<null>);
    }

    // Use the table name as provided
    const tableName = String(table);

    // If ID is provided, get single item
    if (id) {
      const result = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        } as ApiResponse<null>);
      }
      
      return res.json({
        success: true,
        data: result.rows[0]
      } as ApiResponse<any>);
    }

    // Handle query filter
    let whereClause = '';
    let queryParams: any[] = [];
    
    if (queryString) {
      const parsedQuery = parseQueryString(String(queryString));
      const { clause, values } = buildWhereClause(parsedQuery);
      whereClause = clause;
      queryParams = values;
    }

    // Get count for pagination
    const countResult = await query(
      `SELECT COUNT(*) FROM ${tableName} ${whereClause}`, 
      queryParams
    );
    
    const count = parseInt(countResult.rows[0].count);

    // Parse pagination parameters
    const limitVal = parseInt(String(limit));
    const offsetVal = parseInt(String(offset));
    
    // Build the ORDER BY clause
    let orderByClause = 'ORDER BY id';
    if (sortBy) {
      const sortColumn = String(sortBy);
      const sortOrder = order ? String(order).toUpperCase() : 'ASC';
      // Only allow ASC or DESC for the order parameter
      const validOrder = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'ASC';
      orderByClause = `ORDER BY ${sortColumn} ${validOrder}`;
    }
    
    // Get data with pagination
    const queryText = `
      SELECT * FROM ${tableName} 
      ${whereClause} 
      ${orderByClause} 
      LIMIT ${limitVal} OFFSET ${offsetVal}
    `;
    
    const result = await query(queryText, queryParams);
    
    return res.json({
      success: true,
      data: result.rows,
      count
    } as ApiResponse<any[]>);

  } catch (error: any) {
    console.error('Error in getData:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

// POST /data - Create new data
router.post('/', async (req: Request, res: Response) => {
  try {
    const { table } = req.query;
    const data = req.body;
    
    if (!table) {
      return res.status(400).json({
        success: false,
        error: 'Table parameter is required'
      } as ApiResponse<null>);
    }

    // Use the table name as provided
    const tableName = String(table);

    // Build the INSERT query dynamically
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    
    const queryText = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (id) DO UPDATE SET ${columns.map(col => `${col} = EXCLUDED.${col}`).join(', ')}
      RETURNING *
    `;
    
    const result = await query(queryText, values);
    
    return res.status(201).json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);

  } catch (error: any) {
    console.error('Error in createData:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

// PUT /data - Update existing data
router.put('/', async (req: Request, res: Response) => {
  try {
    const { table, id } = req.query;
    const data = req.body;
    
    if (!table || !id) {
      return res.status(400).json({
        success: false,
        error: 'Table and ID parameters are required'
      } as ApiResponse<null>);
    }

    // Use the table name as provided
    const tableName = String(table);

    // Build the UPDATE query dynamically
    const setClause = Object.entries(data)
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = [...Object.values(data), id];
    
    const queryText = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    const result = await query(queryText, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      } as ApiResponse<null>);
    }
    
    return res.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);

  } catch (error: any) {
    console.error('Error in updateData:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

// DELETE /data - Delete data
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { table, id, query: queryString } = req.query;
    
    if (!table) {
      return res.status(400).json({
        success: false,
        error: 'Table parameter is required'
      } as ApiResponse<null>);
    }

    // Use the table name as provided
    const tableName = String(table);

    // If ID is provided, delete single item
    if (id) {
      const result = await query(
        `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        } as ApiResponse<null>);
      }
      
      return res.json({
        success: true,
        data: result.rows[0]
      } as ApiResponse<any>);
    } 
    // If query is provided, delete items matching query
    else if (queryString) {
      // Parse the query string and build the WHERE clause
      const parsedQuery = parseQueryString(String(queryString));
      const { clause, values } = buildWhereClause(parsedQuery);
      
      if (!clause) {
        return res.status(400).json({
          success: false,
          error: 'Valid query parameter is required for bulk delete'
        } as ApiResponse<null>);
      }
      
      // Execute delete with query parameters
      const result = await query(
        `DELETE FROM ${tableName} ${clause} RETURNING *`,
        values
      );
      
      return res.json({
        success: true,
        data: result.rows,
        count: result.rowCount
      } as ApiResponse<any[]>);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either ID or query parameter is required for delete operation'
      } as ApiResponse<null>);
    }

  } catch (error: any) {
    console.error('Error in deleteData:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

export default router; 