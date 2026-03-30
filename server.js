// server.js - упрощенная версия с memory store
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('\n🚀 STARTING SERVER...\n');

// ========== PostgreSQL connection ==========
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

// ========== Create tables ==========
async function initDatabase() {
    pool = initPool();
    if (!pool) return false;
    
    try {
        const client = await pool.connect();
        console.log('✅ Database connected');

        // Products table
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                category VARCHAR(50) NOT NULL,
                product_id VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                strength INTEGER DEFAULT 5,
                quality_class VARCHAR(20) DEFAULT 'medium',
                origin VARCHAR(255),
                description TEXT,
                photo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Content table
        await client.query(`
            CREATE TABLE IF NOT EXISTS content (
                id SERIAL PRIMARY KEY,
                page VARCHAR(100) NOT NULL,
                section VARCHAR(100) NOT NULL,
                content TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by VARCHAR(50),
                UNIQUE(page, section)
            )
        `);

        // Manufacturers table
        await client.query(`
            CREATE TABLE IF NOT EXISTS manufacturers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                logo TEXT,
                quality_class VARCHAR(20) DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Lines table
        await client.query(`
            CREATE TABLE IF NOT EXISTS lines (
                id SERIAL PRIMARY KEY,
                manufacturer_id INTEGER REFERENCES manufacturers(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                strength_color VARCHAR(20) DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(manufacturer_id, name)
            )
        `);

        // Add columns if missing
        await client.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS quality_class VARCHAR(20) DEFAULT 'medium'
        `).catch(e => console.log('Column check:', e.message));
        
        await client.query(`
            ALTER TABLE lines ADD COLUMN IF NOT EXISTS strength_color VARCHAR(20) DEFAULT 'medium'
        `).catch(e => console.log('Column check:', e.message));

        // Insert default users
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
            VALUES ('root', 'root123', 'Главный администратор', 'root')
            ON CONFLICT (username) DO NOTHING
        `);

        client.release();
        console.log('✅ Database tables ready');
        return true;
    } catch (error) {
        console.error('❌ Database init error:', error.message);
        return false;
    }
}

// ========== Cloudinary ==========
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('✅ Cloudinary configured');
}

// ========== Multer ==========
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ========== MIDDLEWARE ==========
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ========== SESSION MIDDLEWARE (memory store) ==========
app.use(session({
    secret: 'spravochnik_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
    },
    name: 'spravochnik.sid'
}));

// ========== AUTH MIDDLEWARE ==========
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

function requireRop(req, res, next) {
    if (req.session && req.session.user && (req.session.user.role === 'rop' || req.session.user.role === 'root')) {
        next();
    } else {
        res.status(403).json({ error: 'ROP only' });
    }
}

function requireRoot(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'root') {
        next();
    } else {
        res.status(403).json({ error: 'Root only' });
    }
}

function protectPage(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
}

// ========== STATIC FILES ==========
app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/core.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'core.js'));
});

app.get('/main.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.js'));
});



// ========== AUTH ROUTES ==========

app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

app.post('/api/simple-login', async (req, res) => {
    console.log('Simple login attempt');
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ error: 'Введите пароль' });
    }
    
    try {
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
        
        console.log('Simple login success:', user.username);
        res.json({ success: true, user: req.session.user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/login', async (req, res) => {
    console.log('Login attempt:', req.body.username);
    const { username, password } = req.body;
    
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
        
        console.log('Login success:', user.username);
        res.json({ success: true, user: req.session.user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// ========== USER MANAGEMENT ==========

app.get('/api/users', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        let result;
        if (req.session.user.role === 'root') {
            result = await pool.query('SELECT id, username, full_name, role FROM users');
        } else if (req.session.user.role === 'rop') {
            result = await pool.query('SELECT id, username, full_name, role FROM users WHERE role = $1', ['user']);
        } else {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get users' });
    }
});

app.post('/api/users/:id/change-password', async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!/^\d{4}$/.test(newPassword)) {
        return res.status(400).json({ error: 'Пароль должен быть 4 цифры' });
    }
    
    try {
        const targetUser = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [id]);
        
        if (targetUser.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const target = targetUser.rows[0];
        const currentUser = req.session.user;
        
        let canChange = false;
        
        if (currentUser.role === 'root') {
            canChange = true;
        } else if (currentUser.role === 'rop' && target.role === 'user') {
            canChange = true;
        }
        
        if (!canChange) {
            return res.status(403).json({ error: 'Нет прав для смены пароля этому пользователю' });
        }
        
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, id]);
        
        res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Ошибка смены пароля' });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, password, full_name, role } = req.body;
    
    if (!req.session || !req.session.user || (req.session.user.role !== 'root' && req.session.user.role !== 'rop')) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!username || !password || !full_name) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    if (!/^\d{4}$/.test(password)) {
        return res.status(400).json({ error: 'Пароль должен быть 4 цифры' });
    }
    
    let finalRole = role || 'user';
    if (req.session.user.role === 'rop' && finalRole !== 'user') {
        finalRole = 'user';
    }
    
    try {
        await pool.query(
            'INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4)',
            [username.toLowerCase(), password, full_name, finalRole]
        );
        res.json({ success: true, message: 'Пользователь создан' });
    } catch (error) {
        res.status(500).json({ error: 'Пользователь уже существует' });
    }
});

app.delete('/api/users/:id', requireRoot, async (req, res) => {
    const { id } = req.params;
    
    if (parseInt(id) === req.session.user.id) {
        return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }
    
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true, message: 'Пользователь удален' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

// ========== CONTENT MANAGEMENT ==========

app.get('/api/content/:page/:section', async (req, res) => {
    const { page, section } = req.params;
    try {
        const result = await pool.query(
            'SELECT content FROM content WHERE page = $1 AND section = $2',
            [page, section]
        );
        res.json({ content: result.rows[0]?.content || '' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get content' });
    }
});

app.post('/api/content/:page/:section', requireRop, async (req, res) => {
    const { page, section } = req.params;
    const { content } = req.body;
    
    try {
        await pool.query(
            `INSERT INTO content (page, section, content, updated_at, updated_by) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
             ON CONFLICT (page, section) 
             DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP, updated_by = EXCLUDED.updated_by`,
            [page, section, content, req.session.user?.username]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Save content error:', error);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// ========== COUNT ==========

app.get('/api/count/:category', requireAuth, async (req, res) => {
    const { category } = req.params;
    try {
        const result = await pool.query(
            'SELECT COUNT(*) FROM products WHERE category = $1',
            [category]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Count error:', error);
        res.json({ count: 0 });
    }
});

// ========== MANUFACTURERS ROUTES ==========

app.get('/api/manufacturers', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM manufacturers ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Get manufacturers error:', error);
        res.status(500).json({ error: 'Failed to get manufacturers' });
    }
});

app.get('/api/manufacturers/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const manufacturer = await pool.query('SELECT * FROM manufacturers WHERE id = $1', [id]);
        if (manufacturer.rows.length === 0) {
            return res.status(404).json({ error: 'Manufacturer not found' });
        }
        
        const lines = await pool.query(
            'SELECT * FROM lines WHERE manufacturer_id = $1 ORDER BY name',
            [id]
        );
        
        res.json({
            ...manufacturer.rows[0],
            lines: lines.rows
        });
    } catch (error) {
        console.error('Get manufacturer error:', error);
        res.status(500).json({ error: 'Failed to get manufacturer' });
    }
});

app.post('/api/manufacturers', requireRop, async (req, res) => {
    const { name, description, logo, quality_class } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO manufacturers (name, description, logo, quality_class) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, logo, quality_class || 'medium']
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create manufacturer error:', error);
        res.status(500).json({ error: 'Failed to create manufacturer' });
    }
});

app.put('/api/manufacturers/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { name, description, logo, quality_class } = req.body;
    try {
        const result = await pool.query(
            'UPDATE manufacturers SET name = $1, description = $2, logo = $3, quality_class = $4 WHERE id = $5 RETURNING *',
            [name, description, logo, quality_class || 'medium', id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update manufacturer error:', error);
        res.status(500).json({ error: 'Failed to update manufacturer' });
    }
});

app.delete('/api/manufacturers/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM manufacturers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete manufacturer error:', error);
        res.status(500).json({ error: 'Failed to delete manufacturer' });
    }
});

// ========== LINES ROUTES ==========

app.get('/api/lines/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM lines WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Line not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get line error:', error);
        res.status(500).json({ error: 'Failed to get line' });
    }
});

app.post('/api/lines', requireRop, async (req, res) => {
    const { manufacturer_id, name, description, strength_color } = req.body;
    
    if (!manufacturer_id || !name) {
        return res.status(400).json({ error: 'Manufacturer ID and name are required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO lines (manufacturer_id, name, description, strength_color) VALUES ($1, $2, $3, $4) RETURNING *',
            [manufacturer_id, name, description || '', strength_color || 'medium']
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create line error:', error);
        res.status(500).json({ error: 'Failed to create line: ' + error.message });
    }
});

app.put('/api/lines/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { name, description, strength_color } = req.body;
    
    try {
        const result = await pool.query(
            'UPDATE lines SET name = $1, description = $2, strength_color = $3 WHERE id = $4 RETURNING *',
            [name, description || '', strength_color || 'medium', id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Line not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update line error:', error);
        res.status(500).json({ error: 'Failed to update line: ' + error.message });
    }
});

app.delete('/api/lines/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM lines WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete line error:', error);
        res.status(500).json({ error: 'Failed to delete line' });
    }
});

// ========== PRODUCT ROUTES ==========

app.post('/api/upload', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    
    let photoUrl;
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'spravochnik' },
                (err, result) => err ? reject(err) : resolve(result)
            ).end(req.file.buffer);
        });
        photoUrl = result.secure_url;
    } else {
        photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    res.json({ photoUrl });
});

app.get('/api/products/:category', requireAuth, async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC',
        [req.params.category]
    );
    res.json(result.rows);
});

app.post('/api/products/:category', requireRop, async (req, res) => {
    const { category } = req.params;
    const { id, name, strength, quality_class, origin, desc, photoUrl } = req.body;
    
    const result = await pool.query(
        `INSERT INTO products (category, product_id, name, strength, quality_class, origin, description, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (product_id) DO UPDATE SET
           name = EXCLUDED.name, 
           strength = EXCLUDED.strength,
           quality_class = EXCLUDED.quality_class,
           origin = EXCLUDED.origin, 
           description = EXCLUDED.description,
           photo_url = EXCLUDED.photo_url
         RETURNING *`,
        [category, id, name, strength || 5, quality_class || 'medium', origin, desc, photoUrl]
    );
    res.json(result.rows[0]);
});

app.put('/api/products/:category/:id', requireRop, async (req, res) => {
    const { category, id } = req.params;
    const { name, strength, quality_class, origin, desc, photoUrl } = req.body;
    
    const result = await pool.query(
        `UPDATE products 
         SET name=$1, strength=$2, quality_class=$3, origin=$4, description=$5, photo_url=$6
         WHERE category=$7 AND product_id=$8 RETURNING *`,
        [name, strength || 5, quality_class || 'medium', origin, desc, photoUrl, category, id]
    );
    res.json(result.rows[0]);
});

app.delete('/api/products/:category/:id', requireRop, async (req, res) => {
    const { category, id } = req.params;
    await pool.query('DELETE FROM products WHERE category=$1 AND product_id=$2', [category, id]);
    res.json({ success: true });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', session: !!req.session });
});

// ========== HTML ROUTES ==========

app.get('/login.html', (req, res) => {
    if (req.session && req.session.user) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tobacco.html', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'tobacco.html'));
});

app.get('/liquids.html', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'liquids.html'));
});

app.get('/snus.html', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'snus.html'));
});

app.get('/hookah.html', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'hookah.html'));
});

app.get('/sales.html', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'sales.html'));
});

app.get('/checks.html', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'checks.html'));
});

app.get('/cash.html', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'cash.html'));
});

app.get('/disposables.html', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'disposables.html'));
});

// ========== START SERVER ==========
async function startServer() {
    console.log('\n🚀 Starting server...\n');
    
    const dbReady = await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`\n✅ Server running on port ${PORT}`);
        console.log(`📦 Database: ${dbReady ? 'CONNECTED' : 'NOT CONNECTED'}`);
        console.log(`🔐 Auth: Enabled (memory store)`);
        console.log(`\n📋 Данные для входа:`);
        console.log(`   👤 Обычный пользователь: пароль 1111`);
        console.log(`   👑 РОП: rop / 1234`);
        console.log(`   👑 ROOT: root / root123`);
        console.log(`\n🔗 URL: http://localhost:${PORT}\n`);
    });
}

startServer();
