// server.js - исправленное удаление
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

// PostgreSQL connection
let pool = null;

function initPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set!');
    return null;
  }
  return new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// Initialize database
async function initDatabase() {
  pool = initPool();
  if (!pool) return false;
  
  try {
    const client = await pool.connect();
    console.log('✅ Database connected');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        product_id VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        strength INTEGER DEFAULT 5,
        origin VARCHAR(255),
        description TEXT,
        photo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add missing columns if needed
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
    `);
    
    client.release();
    console.log('✅ Database ready');
    return true;
  } catch (error) {
    console.error('❌ Database init error:', error.message);
    return false;
  }
}

// Upload endpoint
app.post('/api/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    res.json({ photoUrl: base64 });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// GET products by category
app.get('/api/products/:category', async (req, res) => {
  if (!pool) return res.status(503).json([]);
  
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC',
      [req.params.category]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET error:', error);
    res.status(500).json([]);
  }
});

// POST new product
app.post('/api/products/:category', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  
  const { category } = req.params;
  const { id, name, strength, origin, desc, photoUrl } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO products (category, product_id, name, strength, origin, description, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (product_id) DO UPDATE SET
         name = EXCLUDED.name,
         strength = EXCLUDED.strength,
         origin = EXCLUDED.origin,
         description = EXCLUDED.description,
         photo_url = EXCLUDED.photo_url,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [category, id, name.trim(), strength || 5, origin || null, desc || null, photoUrl || null]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('POST error:', error);
    res.status(500).json({ error: 'Failed to save: ' + error.message });
  }
});

// PUT update product
app.put('/api/products/:category/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  
  const { category, id } = req.params;
  const { name, strength, origin, desc, photoUrl } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE products 
       SET name = $1, strength = $2, origin = $3, description = $4, photo_url = $5, updated_at = CURRENT_TIMESTAMP
       WHERE category = $6 AND product_id = $7
       RETURNING *`,
      [name, strength || 5, origin || null, desc || null, photoUrl || null, category, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('PUT error:', error);
    res.status(500).json({ error: 'Update failed: ' + error.message });
  }
});

// DELETE product - FIXED with better logging
app.delete('/api/products/:category/:id', async (req, res) => {
  console.log('='.repeat(50));
  console.log('DELETE REQUEST RECEIVED');
  console.log('Category:', req.params.category);
  console.log('ID:', req.params.id);
  console.log('='.repeat(50));
  
  if (!pool) {
    console.log('No database pool');
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  const { category, id } = req.params;
  
  if (!id) {
    console.log('Missing ID');
    return res.status(400).json({ error: 'Product ID is required' });
  }
  
  try {
    // First, check if product exists
    const checkResult = await pool.query(
      'SELECT * FROM products WHERE category = $1 AND product_id = $2',
      [category, id]
    );
    
    console.log('Found products:', checkResult.rows.length);
    
    if (checkResult.rows.length === 0) {
      console.log('Product not found in database');
      return res.status(404).json({ error: 'Product not found' });
    }
    
    console.log('Product to delete:', checkResult.rows[0].name);
    
    // Delete the product
    const deleteResult = await pool.query(
      'DELETE FROM products WHERE category = $1 AND product_id = $2 RETURNING *',
      [category, id]
    );
    
    console.log('Deleted successfully:', deleteResult.rows[0].name);
    console.log('='.repeat(50));
    
    res.json({ 
      success: true, 
      message: 'Product deleted successfully',
      deleted: deleteResult.rows[0]
    });
    
  } catch (error) {
    console.error('DELETE error:', error);
    res.status(500).json({ error: 'Delete failed: ' + error.message });
  }
});

// Debug endpoint - list all products
app.get('/api/debug/:category', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'No database' });
  
  try {
    const result = await pool.query(
      'SELECT category, product_id, name FROM products WHERE category = $1',
      [req.params.category]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disconnected'
  });
});

// Serve HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:page', (req, res) => {
  const page = req.params.page;
  if (page.includes('..') || page.includes('\\')) {
    return res.status(403).send('Forbidden');
  }
  
  const fs = require('fs');
  const possibleFiles = [page, `${page}.html`];
  for (const file of possibleFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
  }
  res.status(404).send('Page not found');
});

// Start server
async function startServer() {
  console.log('\n🚀 Starting server...\n');
  const dbReady = await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`📦 Database: ${dbReady ? 'CONNECTED' : 'NOT CONNECTED'}`);
    console.log(`🔗 URL: http://localhost:${PORT}\n`);
  });
}

startServer();
