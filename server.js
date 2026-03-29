// server.js
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        product_id VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        strength INTEGER DEFAULT 5,
        origin VARCHAR(255),
        description TEXT,
        photo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
    `);

    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return false;
  } finally {
    client.release();
  }
}

// API Routes
// Get all products by category
app.get('/api/products/:category', async (req, res) => {
  const { category } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC',
      [category]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
app.get('/api/products/:category/:id', async (req, res) => {
  const { category, id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE category = $1 AND product_id = $2',
      [category, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new product
app.post('/api/products/:category', async (req, res) => {
  const { category } = req.params;
  const { id, name, strength, origin, desc, photo } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO products (category, product_id, name, strength, origin, description, photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (product_id) DO UPDATE SET
         name = EXCLUDED.name,
         strength = EXCLUDED.strength,
         origin = EXCLUDED.origin,
         description = EXCLUDED.description,
         photo = EXCLUDED.photo,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [category, id, name, strength, origin || null, desc || null, photo || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
app.put('/api/products/:category/:id', async (req, res) => {
  const { category, id } = req.params;
  const { name, strength, origin, desc, photo } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE products 
       SET name = $1, strength = $2, origin = $3, description = $4, photo = $5, updated_at = CURRENT_TIMESTAMP
       WHERE category = $6 AND product_id = $7
       RETURNING *`,
      [name, strength, origin || null, desc || null, photo || null, category, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
app.delete('/api/products/:category/:id', async (req, res) => {
  const { category, id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE category = $1 AND product_id = $2 RETURNING *',
      [category, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json({ message: 'Product deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:page', (req, res) => {
  const page = req.params.page;
  // Prevent directory traversal attacks
  if (page.includes('..') || page.includes('\\')) {
    return res.status(403).send('Forbidden');
  }
  
  // Check if file exists
  const possibleFiles = [page, `${page}.html`];
  for (const file of possibleFiles) {
    const filePath = path.join(__dirname, file);
    const fs = require('fs');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
  }
  
  res.status(404).send('Page not found');
});

// Start server
async function startServer() {
  const dbInitialized = await initDatabase();
  if (!dbInitialized) {
    console.error('Failed to initialize database. Exiting...');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Access at http://localhost:${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

startServer();
