// server.js - рабочий с PostgreSQL сессиями
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

console.log('\n🚀 STARTING SERVER...\n');

// ========== PostgreSQL connection ==========
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ========== Сначала создаем таблицы ==========
async function initTables() {
    const client = await pool.connect();
    try {
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

        // Products table
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Session table
        await client.query(`
            CREATE TABLE IF NOT EXISTS session (
                sid VARCHAR(255) PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP NOT NULL
            )
        `);

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
            VALUES ('root', 'root123', 'Главный администратор', 'rop')
            ON CONFLICT (username) DO NOTHING
        `);

        console.log('✅ Database tables ready');
        return true;
    } catch (err) {
        console.error('❌ Table creation error:', err.message);
        return false;
    } finally {
        client.release();
    }
}

// ========== Session middleware ==========
const sessionMiddleware = session({
    store: new pgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: false
    }),
    secret: 'spravochnik_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
    },
    name: 'spravochnik.sid'
});

// ========== Cloudinary ==========
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
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

// ПРИМЕНЯЕМ SESSION MIDDLEWARE
app.use(sessionMiddleware);

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
        res.status(403).json({ error: 'ROP only' });
    }
}

function protectPage(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
}

// ========== API ROUTES ==========

app.get('/api/check-auth', (req, res) => {
    console.log('Check auth - user:', req.session.user?.username);
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

app.post('/api/simple-login', async (req, res) => {
    console.log('Simple login attempt with password:', req.body.password);
    
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
        
        console.log('Login success:', user.username);
        res.json({ success: true, user: req.session.user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/login', async (req, res) => {
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

// User management (ROP only)
app.get('/api/users', requireRop, async (req, res) => {
    const result = await pool.query('SELECT id, username, full_name, role FROM users');
    res.json(result.rows);
});

app.post('/api/users/:id/change-password', requireRop, async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!/^\d{4}$/.test(newPassword)) {
        return res.status(400).json({ error: 'Пароль должен быть 4 цифры' });
    }
    
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, id]);
    res.json({ success: true });
});

app.post('/api/users', requireRop, async (req, res) => {
    const { username, password, full_name, role } = req.body;
    
    if (!/^\d{4}$/.test(password)) {
        return res.status(400).json({ error: 'Пароль должен быть 4 цифры' });
    }
    
    await pool.query(
        'INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4)',
        [username.toLowerCase(), password, full_name, role || 'user']
    );
    res.json({ success: true });
});

app.delete('/api/users/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
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
    const { id, name, strength, origin, desc, photoUrl } = req.body;
    
    const result = await pool.query(
        `INSERT INTO products (category, product_id, name, strength, origin, description, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (product_id) DO UPDATE SET
           name = EXCLUDED.name, strength = EXCLUDED.strength,
           origin = EXCLUDED.origin, description = EXCLUDED.description,
           photo_url = EXCLUDED.photo_url
         RETURNING *`,
        [category, id, name, strength || 5, origin, desc, photoUrl]
    );
    res.json(result.rows[0]);
});

app.put('/api/products/:category/:id', requireRop, async (req, res) => {
    const { category, id } = req.params;
    const { name, strength, origin, desc, photoUrl } = req.body;
    
    const result = await pool.query(
        `UPDATE products SET name=$1, strength=$2, origin=$3, description=$4, photo_url=$5
         WHERE category=$6 AND product_id=$7 RETURNING *`,
        [name, strength, origin, desc, photoUrl, category, id]
    );
    res.json(result.rows[0]);
});

app.delete('/api/products/:category/:id', requireRop, async (req, res) => {
    const { category, id } = req.params;
    await pool.query('DELETE FROM products WHERE category=$1 AND product_id=$2', [category, id]);
    res.json({ success: true });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', session: !!req.session.user });
});

// ========== HTML ROUTES ==========

app.get('/login.html', (req, res) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:page', protectPage, (req, res) => {
    const page = req.params.page;
    if (page.endsWith('.html')) {
        res.sendFile(path.join(__dirname, page));
    } else {
        res.sendFile(path.join(__dirname, `${page}.html`));
    }
});

// ========== START SERVER ==========
async function start() {
    await initTables();
    
    app.listen(PORT, () => {
        console.log(`\n✅ Server running on http://localhost:${PORT}`);
        console.log(`📋 Пароли из БД:`);
        console.log(`   👤 user / 1111 (обычный пользователь)`);
        console.log(`   👑 rop / 1234 (РОП)`);
        console.log(`   👑 root / root123 (РОП)`);
        console.log(`\n🌐 Open: http://localhost:${PORT}\n`);
    });
}

start();
