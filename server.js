// server.js - с Cloudinary облаком
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

// Cloudinary configuration
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured');
} else {
  console.log('⚠️ Cloudinary not configured, using base64 mode');
}

// Multer setup (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed (JPG, PNG, WEBP)'));
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

// Upload endpoint - with Cloudinary
app.post('/api/upload', upload.single('photo'), async (req, res) => {
  console.log('📸 Upload request received');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log(`File: ${req.file.originalname}, Size: ${Math.round(req.file.size / 1024)}KB`);
    
    let photoUrl;
    
    // If Cloudinary is configured, upload to Cloudinary
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('Uploading to Cloudinary...');
      
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'spravochnik',
            transformation: [
              { width: 500, height: 500, crop: 'limit' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      
      photoUrl = result.secure_url;
      console.log(`✅ Uploaded to Cloudinary: ${photoUrl}`);
    } else {
      // Fallback to base64
      photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      console.log(`✅ Converted to base64, size: ${Math.round(photoUrl.length / 1024)}KB`);
    }
    
    res.json({ photoUrl: photoUrl });
    
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
    
    console.log(`✅ Saved: ${result.rows[0].name}`);
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

// DELETE product
app.delete('/api/products/:category/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  
  const { category, id } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE category = $1 AND product_id = $2 RETURNING *',
      [category, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      console.log(`✅ Deleted: ${result.rows[0].name}`);
      res.json({ success: true, message: 'Deleted successfully' });
    }
  } catch (error) {
    console.error('DELETE error:', error);
    res.status(500).json({ error: 'Delete failed: ' + error.message });
  }
});

// Debug endpoint
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
    database: pool ? 'connected' : 'disconnected',
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'not configured'
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
  
  // Show Cloudinary status
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    console.log(`📸 Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  } else {
    console.log('📸 Cloudinary: NOT configured (using base64)');
  }
  
  const dbReady = await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`📦 Database: ${dbReady ? 'CONNECTED' : 'NOT CONNECTED'}`);
    console.log(`📸 Photos: ${process.env.CLOUDINARY_CLOUD_NAME ? 'CLOUDINARY' : 'BASE64'}`);
    console.log(`🔗 URL: http://localhost:${PORT}\n`);
  });
}

startServer();
