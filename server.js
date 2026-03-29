// server.js
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Cloudinary configuration (только если есть ключи)
if (process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured');
} else {
  console.log('⚠️ Cloudinary not configured - using local images only');
}

// Multer setup (для временного хранения, если Cloudinary не настроен)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// PostgreSQL connection
let pool = null;

function initPool() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    return null;
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// Initialize database
async function initDatabase() {
  if (!pool) {
    pool = initPool();
    if (!pool) return false;
  }
  
  try {
    const client = await pool.connect();
    
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
    
    // If Cloudinary is configured, upload to Cloudinary
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'spravochnik',
            transformation: [{ width: 500, height: 500, crop: 'limit' }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      
      return res.json({ photoUrl: result.secure_url });
    }
    
    // Fallback: convert to base64 (for testing without Cloudinary)
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    return res.json({ photoUrl: base64 });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// GET all products by category
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

// GET single product
app.get('/api/products/:category/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not connected' });
  
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE category = $1 AND product_id = $2',
      [req.params.category, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('GET one error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new product
app.post('/api/products/:category', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not connected' });
  
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
    res.status(500).json({ error: 'Failed to save' });
  }
});

// PUT update product
app.put('/api/products/:category/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not connected' });
  
  const { category, id } = req.params;
  const { name, strength, origin, desc, photoUrl } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE products 
       SET name = $1, strength = $2, origin = $3, description = $4, photo_url = $5, updated_at = CURRENT_TIMESTAMP
       WHERE category = $6 AND product_id = $7
       RETURNING *`,
      [name, strength, origin || null, desc || null, photoUrl || null, category, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('PUT error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE product
app.delete('/api/products/:category/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not connected' });
  
  const { category, id } = req.params;
  console.log(`Deleting: category=${category}, id=${id}`);
  
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE category = $1 AND product_id = $2 RETURNING *',
      [category, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      console.log(`Deleted: ${result.rows[0].name}`);
      res.json({ message: 'Deleted successfully', product: result.rows[0] });
    }
  } catch (error) {
    console.error('DELETE error:', error);
    res.status(500).json({ error: 'Delete failed: ' + error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disconnected',
    cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME
  });
});

// Serve HTML files
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
  const dbReady = await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Database: ${dbReady ? '✅ connected' : '❌ not connected'}`);
    console.log(`📸 Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ configured' : '⚠️ not configured (using base64)'}`);
    console.log(`\n📱 Open: http://localhost:${PORT}\n`);
  });
}

startServer();
