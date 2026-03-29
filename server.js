// server.js - с хранением пользователей в БД
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// PostgreSQL connection pool
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
        max: 20,
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
                photo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create session table
        await client.query(`
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL,
                CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
            )
        `);

        // Add columns if missing
        await client.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_url TEXT;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
        `);

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
            CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
            CREATE INDEX IF NOT EXISTS IDX_session_expire ON "session" ("expire");
        `);

        // Insert default users if not exists
        await client.query(`
            INSERT INTO users (username, password, full_name, role) 
            VALUES ('user', '1111', 'Обычный пользователь', 'user')
            ON CONFLICT (username) DO NOTHING
        `);
        
        await client.query(`
            INSERT INTO users (username, password, full_name, role) 
            VALUES ('rop', '1234', 'Руководитель отдела продаж', 'rop')
            ON CONFLICT (username) DO NOTHING
        `);
        
        await client.query(`
            INSERT INTO users (username, password, full_name, role) 
            VALUES ('root', 'root123', 'Главный администратор', 'rop')
            ON CONFLICT (username) DO NOTHING
        `);

        client.release();
        console.log('✅ Database tables ready');
        console.log('📋 Users in DB: user (1111), rop (1234), root (root123)');
        return true;
    } catch (error) {
        console.error('❌ Database init error:', error.message);
        return false;
    }
}

// Session middleware with PostgreSQL store
function setupSession() {
    if (!pool) {
        console.error('❌ Cannot setup session: no database pool');
        return null;
    }
    
    return session({
        store: new pgSession({
            pool: pool,
            tableName: 'session',
            createTableIfMissing: false
        }),
        secret: process.env.SESSION_SECRET || 'spravochnik_secret_key_2024',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000
        },
        name: 'spravochnik.sid'
    });
}

// Cloudinary configuration
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('✅ Cloudinary configured');
}

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

// ========== AUTH MIDDLEWARE ==========
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

function requireRop(req, res, next) {
    if (req.session.user && req.session.user.role === 'rop') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. ROP only.' });
    }
}

// ========== AUTH ROUTES ==========

// Check if user is authenticated
app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ 
            authenticated: true, 
            user: req.session.user 
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND password = $2',
            [username.toLowerCase(), password]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        const user = result.rows[0];
        req.session.user = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
        };
        
        res.json({ 
            success: true, 
            user: req.session.user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// Simple login for users (only password)
app.post('/api/simple-login', async (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(401).json({ error: 'Введите пароль' });
    }
    
    try {
        // Find user with role 'user' and matching password
        const result = await pool.query(
            'SELECT * FROM users WHERE role = $1 AND password = $2 LIMIT 1',
            ['user', password]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный пароль' });
        }
        
        const user = result.rows[0];
        req.session.user = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
        };
        
        res.json({ 
            success: true, 
            user: req.session.user
        });
    } catch (error) {
        console.error('Simple login error:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Logout error:', err);
        res.json({ success: true });
    });
});

// Get all users (ROP only)
app.get('/api/users', requireRop, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, full_name, role FROM users ORDER BY id'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Change user password (ROP only)
app.post('/api/users/:id/change-password', requireRop, async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || !/^\d{4}$/.test(newPassword)) {
        return res.status(400).json({ error: 'Пароль должен быть 4 цифры' });
    }
    
    try {
        const result = await pool.query(
            'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING username',
            [newPassword, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        console.log(`✅ Password changed for user: ${result.rows[0].username}`);
        res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Ошибка смены пароля' });
    }
});

// Create new user (ROP only)
app.post('/api/users', requireRop, async (req, res) => {
    const { username, password, full_name, role } = req.body;
    
    if (!username || !password || !full_name) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    if (!/^\d{4}$/.test(password)) {
        return res.status(400).json({ error: 'Пароль должен быть 4 цифры' });
    }
    
    try {
        await pool.query(
            'INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4)',
            [username.toLowerCase(), password, full_name, role || 'user']
        );
        console.log(`✅ User created: ${username}`);
        res.json({ success: true, message: 'Пользователь создан' });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Пользователь уже существует' });
    }
});

// Delete user (ROP only, cannot delete self)
app.delete('/api/users/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.session.user.id;
    
    if (parseInt(id) === currentUserId) {
        return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }
    
    try {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 AND role != $2 RETURNING username',
            [id, 'rop']
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        console.log(`✅ User deleted: ${result.rows[0].username}`);
        res.json({ success: true, message: 'Пользователь удален' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

// Get current user info
app.get('/api/me', requireAuth, (req, res) => {
    res.json(req.session.user);
});

// ========== PRODUCT ROUTES ==========

// Upload photo (requires auth)
app.post('/api/upload', requireAuth, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        let photoUrl;
        
        if (process.env.CLOUDINARY_CLOUD_NAME) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'spravochnik', transformation: [{ width: 500, height: 500, crop: 'limit' }] },
                    (error, result) => error ? reject(error) : resolve(result)
                );
                uploadStream.end(req.file.buffer);
            });
            photoUrl = result.secure_url;
        } else {
            photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
        
        res.json({ photoUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// GET products (requires auth)
app.get('/api/products/:category', requireAuth, async (req, res) => {
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

// POST product (ROP only)
app.post('/api/products/:category', requireRop, async (req, res) => {
    const { category } = req.params;
    const { id, name, strength, origin, desc, photoUrl } = req.body;
    
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

// PUT product (ROP only)
app.put('/api/products/:category/:id', requireRop, async (req, res) => {
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
        res.status(500).json({ error: 'Update failed' });
    }
});

// DELETE product (ROP only)
app.delete('/api/products/:category/:id', requireRop, async (req, res) => {
    const { category, id } = req.params;
    
    try {
        const result = await pool.query(
            'DELETE FROM products WHERE category = $1 AND product_id = $2 RETURNING *',
            [category, id]
        );
        
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Product not found' });
        } else {
            res.json({ success: true });
        }
    } catch (error) {
        console.error('DELETE error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: pool ? 'connected' : 'disconnected',
        sessionStore: 'postgresql'
    });
});

// Serve HTML - all pages require auth
const requirePageAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
};

app.get('/', requirePageAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tobacco.html', requirePageAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'tobacco.html'));
});

app.get('/liquids.html', requirePageAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'liquids.html'));
});

app.get('/snus.html', requirePageAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'snus.html'));
});

app.get('/hookah.html', requirePageAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'hookah.html'));
});

app.get('/sales.html', requirePageAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'sales.html'));
});

app.get('/checks.html', requirePageAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'checks.html'));
});

app.get('/cash.html', requirePageAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'cash.html'));
});

app.get('/disposables.html', requirePageAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'disposables.html'));
});

app.get('/login.html', (req, res) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

// Start server
async function startServer() {
    console.log('\n🚀 Starting server...\n');
    
    const dbReady = await initDatabase();
    
    if (dbReady && pool) {
        const sessionMiddleware = setupSession();
        if (sessionMiddleware) {
            app.use(sessionMiddleware);
            console.log('✅ Session store: PostgreSQL');
        }
    }
    
    app.listen(PORT, () => {
        console.log(`\n✅ Server running on port ${PORT}`);
        console.log(`📦 Database: ${dbReady ? 'CONNECTED' : 'NOT CONNECTED'}`);
        console.log(`🔐 Auth: Enabled (users in database)`);
        console.log(`\n📋 Пользователи в БД:`);
        console.log(`   👤 Обычный пароль: 1111`);
        console.log(`   👑 РОП: rop / 1234`);
        console.log(`   👑 ROOT: root / root123`);
        console.log(`\n🔗 URL: http://localhost:${PORT}\n`);
    });
}

startServer();
