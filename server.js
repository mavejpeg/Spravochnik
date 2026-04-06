// server.js - ПОЛНАЯ ВЕРСИЯ
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
        ssl: { rejectUnauthorized: false },
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

        // Session table
        await client.query(`
            CREATE TABLE IF NOT EXISTS session (
                sid VARCHAR(255) PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP NOT NULL
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
                quality_class VARCHAR(20) DEFAULT 'medium',
                origin VARCHAR(255),
                description TEXT,
                photo_url TEXT,
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

        // Tobacco manufacturers and lines
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

        // Liquid manufacturers and lines
        await client.query(`
            CREATE TABLE IF NOT EXISTS liquid_manufacturers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                logo TEXT,
                quality_class VARCHAR(20) DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS liquid_lines (
                id SERIAL PRIMARY KEY,
                manufacturer_id INTEGER REFERENCES liquid_manufacturers(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                strength_color VARCHAR(20) DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(manufacturer_id, name)
            )
        `);

        // Disposables manufacturers and lines
        await client.query(`
            CREATE TABLE IF NOT EXISTS disposables_manufacturers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                logo TEXT,
                quality_class VARCHAR(20) DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS disposables_lines (
                id SERIAL PRIMARY KEY,
                manufacturer_id INTEGER REFERENCES disposables_manufacturers(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                strength_color VARCHAR(20) DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(manufacturer_id, name)
            )
        `);

        // Snus manufacturers and lines
        await client.query(`
            CREATE TABLE IF NOT EXISTS snus_manufacturers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                logo TEXT,
                quality_class VARCHAR(20) DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS snus_lines (
                id SERIAL PRIMARY KEY,
                manufacturer_id INTEGER REFERENCES snus_manufacturers(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                strength_color VARCHAR(20) DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(manufacturer_id, name)
            )
        `);

        // Points (торговые точки)
        await client.query(`
            CREATE TABLE IF NOT EXISTS points (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                address VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default point
        await client.query(`
            INSERT INTO points (name, address) VALUES ('Точка 1', 'Адрес не указан')
            ON CONFLICT DO NOTHING
        `).catch(e => {});

        // Add position and point_id to users if not exists
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(255)`).catch(e => {});
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS point_id INTEGER REFERENCES points(id) ON DELETE SET NULL`).catch(e => {});

        // Schedules (рабочий график)
        await client.query(`
            CREATE TABLE IF NOT EXISTS schedules (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                partner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                year INTEGER NOT NULL,
                month INTEGER NOT NULL,
                days JSONB NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by INTEGER REFERENCES users(id),
                UNIQUE(user_id, year, month)
            )
        `);

        // Add missing columns
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS quality_class VARCHAR(20) DEFAULT 'medium'`).catch(e => {});
        await client.query(`ALTER TABLE lines ADD COLUMN IF NOT EXISTS strength_color VARCHAR(20) DEFAULT 'medium'`).catch(e => {});

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

        // 1. Прогресс обучения
        await client.query(`
            CREATE TABLE IF NOT EXISTS learning_progress (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                page VARCHAR(100) NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP,
                last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, page)
            )
        `);

        // 2. Опросники (вопросы)
        await client.query(`
            CREATE TABLE IF NOT EXISTS quizzes (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                questions JSONB NOT NULL, -- [{text, options, correct, explanation}]
                is_active BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Результаты опросников
        await client.query(`
            CREATE TABLE IF NOT EXISTS quiz_results (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                answers JSONB,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Личные заметки
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_notes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                product_type VARCHAR(50) NOT NULL, -- 'manufacturer', 'line', 'product'
                product_id INTEGER NOT NULL,
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_type, product_id)
            )
        `);

        // 5. Глобальный поисковый индекс (для full-text search)
        await client.query(`
            CREATE TABLE IF NOT EXISTS search_index (
                id SERIAL PRIMARY KEY,
                entity_type VARCHAR(50) NOT NULL,
                entity_id INTEGER NOT NULL,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                search_vector TSVECTOR GENERATED ALWAYS AS (
                    setweight(to_tsvector('russian', COALESCE(title, '')), 'A') ||
                    setweight(to_tsvector('russian', COALESCE(description, '')), 'B')
                ) STORED
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_search_vector ON search_index USING GIN(search_vector)`);

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
app.use(cors({ 
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ========== SESSION MIDDLEWARE ==========
app.use(session({
    secret: process.env.SESSION_SECRET || 'spravochnik_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    },
    name: 'spravochnik.sid'
}));

// Trust proxy (для Railway)
app.set('trust proxy', 1);

// DEBUG логирование
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Session: ${req.session?.user?.username || 'none'}`);
    }
    next();
});

// ========== AUTH MIDDLEWARE ==========
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        console.log(`❌ Auth failed: ${req.path}`);
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

app.get('/editor.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'editor.js'));
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
        
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regenerate error:', err);
                return res.status(500).json({ error: 'Ошибка сессии' });
            }
            
            req.session.user = {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            };
            
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Ошибка сохранения сессии' });
                }
                
                console.log(`✅ User logged in: ${user.username}`);
                res.json({ success: true, user: req.session.user });
            });
        });
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
        
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regenerate error:', err);
                return res.status(500).json({ error: 'Ошибка сессии' });
            }
            
            req.session.user = {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            };
            
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Ошибка сохранения сессии' });
                }
                
                console.log(`✅ User logged in: ${user.username} (${user.role})`);
                res.json({ success: true, user: req.session.user });
            });
        });
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
        if (currentUser.role === 'root') canChange = true;
        else if (currentUser.role === 'rop' && target.role === 'user') canChange = true;
        
        if (!canChange) {
            return res.status(403).json({ error: 'Нет прав для смены пароля' });
        }
        
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка' });
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
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Пользователь уже существует' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    if (!req.session || !req.session.user || req.session.user.role !== 'root') {
        return res.status(403).json({ error: 'Root only' });
    }
    
    const { id } = req.params;
    if (parseInt(id) === req.session.user.id) {
        return res.status(400).json({ error: 'Нельзя удалить себя' });
    }
    
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка' });
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
    try {
        const result = await pool.query(
            'SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC',
            [req.params.category]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('GET products error:', error);
        res.json([]);
    }
});

app.post('/api/products/:category', requireRop, async (req, res) => {
    const { category } = req.params;
    const { id, name, strength, quality_class, origin, desc, photoUrl } = req.body;
    
    try {
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
    } catch (error) {
        console.error('POST product error:', error);
        res.status(500).json({ error: 'Failed to save: ' + error.message });
    }
});

app.put('/api/products/:category/:id', requireRop, async (req, res) => {
    const { category, id } = req.params;
    const { name, strength, quality_class, origin, desc, photoUrl } = req.body;
    
    try {
        const result = await pool.query(
            `UPDATE products 
             SET name=$1, strength=$2, quality_class=$3, origin=$4, description=$5, photo_url=$6
             WHERE category=$7 AND product_id=$8 RETURNING *`,
            [name, strength || 5, quality_class || 'medium', origin, desc, photoUrl, category, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('PUT product error:', error);
        res.status(500).json({ error: 'Failed to update: ' + error.message });
    }
});

app.delete('/api/products/:category/:id', requireRop, async (req, res) => {
    const { category, id } = req.params;
    try {
        await pool.query('DELETE FROM products WHERE category=$1 AND product_id=$2', [category, id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
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

// ========== MANUFACTURERS ROUTES (Tobacco) ==========

app.get('/api/manufacturers', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM manufacturers ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Get manufacturers error:', error);
        res.json([]);
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
        res.status(500).json({ error: 'Failed to get manufacturer' });
    }
});

app.post('/api/manufacturers', requireRop, async (req, res) => {
    const { name, description, logo, quality_class } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
        const result = await pool.query(
            'INSERT INTO manufacturers (name, description, logo, quality_class) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, logo, quality_class || 'medium']
        );
        res.json(result.rows[0]);
    } catch (error) {
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
        res.status(500).json({ error: 'Failed to update manufacturer' });
    }
});

app.delete('/api/manufacturers/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM manufacturers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete manufacturer' });
    }
});

// ========== LINES ROUTES (Tobacco) ==========

app.get('/api/lines/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM lines WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Line not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
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
        res.status(500).json({ error: 'Failed to create line' });
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
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update line' });
    }
});

app.delete('/api/lines/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM lines WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete line' });
    }
});

// ========== LIQUID MANUFACTURERS ==========

app.get('/api/liquid-manufacturers', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM liquid_manufacturers ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Get liquid manufacturers error:', error);
        res.json([]);
    }
});

app.get('/api/liquid-manufacturers/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const manufacturer = await pool.query('SELECT * FROM liquid_manufacturers WHERE id = $1', [id]);
        if (manufacturer.rows.length === 0) {
            return res.status(404).json({ error: 'Manufacturer not found' });
        }
        const lines = await pool.query('SELECT * FROM liquid_lines WHERE manufacturer_id = $1 ORDER BY name', [id]);
        res.json({ ...manufacturer.rows[0], lines: lines.rows });
    } catch (error) {
        console.error('Get liquid manufacturer error:', error);
        res.status(500).json({ error: 'Failed to get manufacturer' });
    }
});

app.post('/api/liquid-manufacturers', requireRop, async (req, res) => {
    const { name, description, logo, quality_class } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO liquid_manufacturers (name, description, logo, quality_class) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, logo, quality_class || 'medium']
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create liquid manufacturer error:', error);
        res.status(500).json({ error: 'Failed to create manufacturer' });
    }
});

app.put('/api/liquid-manufacturers/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { name, description, logo, quality_class } = req.body;
    try {
        const result = await pool.query(
            'UPDATE liquid_manufacturers SET name=$1, description=$2, logo=$3, quality_class=$4 WHERE id=$5 RETURNING *',
            [name, description, logo, quality_class || 'medium', id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update liquid manufacturer error:', error);
        res.status(500).json({ error: 'Failed to update manufacturer' });
    }
});

app.delete('/api/liquid-manufacturers/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM liquid_manufacturers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete liquid manufacturer error:', error);
        res.status(500).json({ error: 'Failed to delete manufacturer' });
    }
});

// ========== LIQUID LINES ==========

app.get('/api/liquid-lines/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM liquid_lines WHERE id = $1', [id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get liquid line error:', error);
        res.status(500).json({ error: 'Failed to get line' });
    }
});

app.post('/api/liquid-lines', requireRop, async (req, res) => {
    const { manufacturer_id, name, description, strength_color } = req.body;
    if (!manufacturer_id || !name) {
        return res.status(400).json({ error: 'Manufacturer ID and name are required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO liquid_lines (manufacturer_id, name, description, strength_color) VALUES ($1, $2, $3, $4) RETURNING *',
            [manufacturer_id, name, description || '', strength_color || 'medium']
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create liquid line error:', error);
        res.status(500).json({ error: 'Failed to create line' });
    }
});

app.put('/api/liquid-lines/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { name, description, strength_color } = req.body;
    try {
        const result = await pool.query(
            'UPDATE liquid_lines SET name=$1, description=$2, strength_color=$3 WHERE id=$4 RETURNING *',
            [name, description || '', strength_color || 'medium', id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update liquid line error:', error);
        res.status(500).json({ error: 'Failed to update line' });
    }
});

app.delete('/api/liquid-lines/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM liquid_lines WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete liquid line error:', error);
        res.status(500).json({ error: 'Failed to delete line' });
    }
});

// ========== DISPOSABLES MANUFACTURERS ==========

app.get('/api/disposables-manufacturers', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM disposables_manufacturers ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Get disposables manufacturers error:', error);
        res.json([]);
    }
});

app.get('/api/disposables-manufacturers/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const manufacturer = await pool.query('SELECT * FROM disposables_manufacturers WHERE id = $1', [id]);
        if (manufacturer.rows.length === 0) {
            return res.status(404).json({ error: 'Manufacturer not found' });
        }
        const lines = await pool.query('SELECT * FROM disposables_lines WHERE manufacturer_id = $1 ORDER BY name', [id]);
        res.json({ ...manufacturer.rows[0], lines: lines.rows });
    } catch (error) {
        console.error('Get disposables manufacturer error:', error);
        res.status(500).json({ error: 'Failed to get manufacturer' });
    }
});

app.post('/api/disposables-manufacturers', requireRop, async (req, res) => {
    const { name, description, logo, quality_class } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO disposables_manufacturers (name, description, logo, quality_class) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, logo, quality_class || 'medium']
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create disposables manufacturer error:', error);
        res.status(500).json({ error: 'Failed to create manufacturer' });
    }
});

app.put('/api/disposables-manufacturers/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { name, description, logo, quality_class } = req.body;
    try {
        const result = await pool.query(
            'UPDATE disposables_manufacturers SET name=$1, description=$2, logo=$3, quality_class=$4 WHERE id=$5 RETURNING *',
            [name, description, logo, quality_class || 'medium', id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update disposables manufacturer error:', error);
        res.status(500).json({ error: 'Failed to update manufacturer' });
    }
});

app.delete('/api/disposables-manufacturers/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM disposables_manufacturers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete disposables manufacturer error:', error);
        res.status(500).json({ error: 'Failed to delete manufacturer' });
    }
});

// ========== DISPOSABLES LINES ==========

app.get('/api/disposables-lines/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM disposables_lines WHERE id = $1', [id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get disposables line error:', error);
        res.status(500).json({ error: 'Failed to get line' });
    }
});

app.post('/api/disposables-lines', requireRop, async (req, res) => {
    const { manufacturer_id, name, description, strength_color } = req.body;
    if (!manufacturer_id || !name) {
        return res.status(400).json({ error: 'Manufacturer ID and name are required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO disposables_lines (manufacturer_id, name, description, strength_color) VALUES ($1, $2, $3, $4) RETURNING *',
            [manufacturer_id, name, description || '', strength_color || 'medium']
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create disposables line error:', error);
        res.status(500).json({ error: 'Failed to create line' });
    }
});

app.put('/api/disposables-lines/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { name, description, strength_color } = req.body;
    try {
        const result = await pool.query(
            'UPDATE disposables_lines SET name=$1, description=$2, strength_color=$3 WHERE id=$4 RETURNING *',
            [name, description || '', strength_color || 'medium', id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update disposables line error:', error);
        res.status(500).json({ error: 'Failed to update line' });
    }
});

app.delete('/api/disposables-lines/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM disposables_lines WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete disposables line error:', error);
        res.status(500).json({ error: 'Failed to delete line' });
    }
});

// ========== SNUS MANUFACTURERS ==========

app.get('/api/snus-manufacturers', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM snus_manufacturers ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Get snus manufacturers error:', error);
        res.json([]);
    }
});

app.get('/api/snus-manufacturers/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const manufacturer = await pool.query('SELECT * FROM snus_manufacturers WHERE id = $1', [id]);
        if (manufacturer.rows.length === 0) {
            return res.status(404).json({ error: 'Manufacturer not found' });
        }
        const lines = await pool.query('SELECT * FROM snus_lines WHERE manufacturer_id = $1 ORDER BY name', [id]);
        res.json({ ...manufacturer.rows[0], lines: lines.rows });
    } catch (error) {
        console.error('Get snus manufacturer error:', error);
        res.status(500).json({ error: 'Failed to get manufacturer' });
    }
});

app.post('/api/snus-manufacturers', requireRop, async (req, res) => {
    const { name, description, logo, quality_class } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO snus_manufacturers (name, description, logo, quality_class) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, logo, quality_class || 'medium']
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create snus manufacturer error:', error);
        res.status(500).json({ error: 'Failed to create manufacturer' });
    }
});

app.put('/api/snus-manufacturers/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { name, description, logo, quality_class } = req.body;
    try {
        const result = await pool.query(
            'UPDATE snus_manufacturers SET name=$1, description=$2, logo=$3, quality_class=$4 WHERE id=$5 RETURNING *',
            [name, description, logo, quality_class || 'medium', id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update snus manufacturer error:', error);
        res.status(500).json({ error: 'Failed to update manufacturer' });
    }
});

app.delete('/api/snus-manufacturers/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM snus_manufacturers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete snus manufacturer error:', error);
        res.status(500).json({ error: 'Failed to delete manufacturer' });
    }
});

// ========== SNUS LINES ==========

app.get('/api/snus-lines/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM snus_lines WHERE id = $1', [id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get snus line error:', error);
        res.status(500).json({ error: 'Failed to get line' });
    }
});

app.post('/api/snus-lines', requireRop, async (req, res) => {
    const { manufacturer_id, name, description, strength_color } = req.body;
    if (!manufacturer_id || !name) {
        return res.status(400).json({ error: 'Manufacturer ID and name are required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO snus_lines (manufacturer_id, name, description, strength_color) VALUES ($1, $2, $3, $4) RETURNING *',
            [manufacturer_id, name, description || '', strength_color || 'medium']
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create snus line error:', error);
        res.status(500).json({ error: 'Failed to create line' });
    }
});

app.put('/api/snus-lines/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { name, description, strength_color } = req.body;
    try {
        const result = await pool.query(
            'UPDATE snus_lines SET name=$1, description=$2, strength_color=$3 WHERE id=$4 RETURNING *',
            [name, description || '', strength_color || 'medium', id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update snus line error:', error);
        res.status(500).json({ error: 'Failed to update line' });
    }
});

app.delete('/api/snus-lines/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM snus_lines WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete snus line error:', error);
        res.status(500).json({ error: 'Failed to delete line' });
    }
});

app.get('/api/count/manufacturers', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM manufacturers');
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Count manufacturers error:', error);
        res.json({ count: 0 });
    }
});

app.post('/api/devtools-detected', requireAuth, (req, res) => {
    const username = req.session.user?.username || 'unknown';
    console.log(`⚠️ DevTools detected for user: ${username}`);
    res.json({ success: true });
});

// ========== POINTS API ==========
app.get('/api/points', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM points ORDER BY name');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to get points' });
    }
});

app.post('/api/points', requireRop, async (req, res) => {
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Название обязательно' });
    try {
        const result = await pool.query(
            'INSERT INTO points (name, address) VALUES ($1, $2) RETURNING *',
            [name, address || '']
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create point' });
    }
});

app.put('/api/points/:id', requireRop, async (req, res) => {
    const { name, address } = req.body;
    try {
        const result = await pool.query(
            'UPDATE points SET name=$1, address=$2 WHERE id=$3 RETURNING *',
            [name, address || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: 'Failed to update point' });
    }
});

app.delete('/api/points/:id', requireRop, async (req, res) => {
    try {
        await pool.query('DELETE FROM points WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete point' });
    }
});

// ========== PROFILE API ==========
app.get('/api/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const result = await pool.query(
            `SELECT u.id, u.username, u.full_name, u.role, u.position, u.point_id,
                    p.name as point_name, p.address as point_address
             FROM users u
             LEFT JOIN points p ON u.point_id = p.id
             WHERE u.id = $1`,
            [userId]
        );
        res.json(result.rows[0] || {});
    } catch (e) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

app.get('/api/profile/:userId', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.username, u.full_name, u.role, u.position, u.point_id,
                    p.name as point_name, p.address as point_address
             FROM users u
             LEFT JOIN points p ON u.point_id = p.id
             WHERE u.id = $1`,
            [req.params.userId]
        );
        res.json(result.rows[0] || {});
    } catch (e) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

app.put('/api/profile/:userId', requireRop, async (req, res) => {
    const { full_name, position, point_id, role } = req.body;
    const targetId = req.params.userId;
    const currentUser = req.session.user;
    try {
        const target = await pool.query('SELECT * FROM users WHERE id=$1', [targetId]);
        if (!target.rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
        // Only root can change roles
        const newRole = (currentUser.role === 'root' && role) ? role : target.rows[0].role;
        await pool.query(
            'UPDATE users SET full_name=$1, position=$2, point_id=$3, role=$4 WHERE id=$5',
            [full_name || target.rows[0].full_name, position || null, point_id || null, newRole, targetId]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ========== SCHEDULE API ==========
app.get('/api/schedule/point/:pointId/:year/:month', requireAuth, async (req, res) => {
    try {
        const { pointId, year, month } = req.params;
        const result = await pool.query(
            `SELECT s.*, u.full_name as user_name, u.position, p.full_name as partner_name
             FROM schedules s
             JOIN users u ON s.user_id = u.id
             LEFT JOIN users p ON s.partner_id = p.id
             WHERE u.point_id=$1 AND s.year=$2 AND s.month=$3`,
            [pointId, year, month]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to get schedules for point' });
    }
});

app.get('/api/schedule/:userId/:year/:month', requireAuth, async (req, res) => {
    try {
        const { userId, year, month } = req.params;
        const result = await pool.query(
            `SELECT s.*, 
                    u.full_name as user_name, u.position,
                    p.full_name as partner_name
             FROM schedules s
             LEFT JOIN users u ON s.user_id = u.id
             LEFT JOIN users p ON s.partner_id = p.id
             WHERE s.user_id=$1 AND s.year=$2 AND s.month=$3`,
            [userId, year, month]
        );
        res.json(result.rows[0] || null);
    } catch (e) {
        res.status(500).json({ error: 'Failed to get schedule' });
    }
});

app.post('/api/schedule', requireRop, async (req, res) => {
    const { user_id, partner_id, year, month, days } = req.body;
    if (!user_id || !year || !month || !days) return res.status(400).json({ error: 'Не хватает данных' });
    try {
        const result = await pool.query(
            `INSERT INTO schedules (user_id, partner_id, year, month, days, updated_by, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (user_id, year, month)
             DO UPDATE SET partner_id=$2, days=$5, updated_by=$6, updated_at=NOW()
             RETURNING *`,
            [user_id, partner_id || null, year, month, JSON.stringify(days), req.session.user.id]
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: 'Failed to save schedule' });
    }
});

// ========== USERS WITH PROFILES ==========
app.get('/api/users-full', requireRop, async (req, res) => {
    try {
        let result;
        if (req.session.user.role === 'root') {
            result = await pool.query(
                `SELECT u.id, u.username, u.full_name, u.role, u.position, u.point_id, p.name as point_name
                 FROM users u LEFT JOIN points p ON u.point_id = p.id ORDER BY u.full_name`
            );
        } else {
            result = await pool.query(
                `SELECT u.id, u.username, u.full_name, u.role, u.position, u.point_id, p.name as point_name
                 FROM users u LEFT JOIN points p ON u.point_id = p.id
                 WHERE u.role = 'user' ORDER BY u.full_name`
            );
        }
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// ========== PROFILE PAGE ROUTE ==========
app.get('/profile', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', session: !!req.session, sessionId: req.sessionID });
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

app.get('/training.html', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'training.html'));
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
        console.error('Get content error:', error);
        res.json({ content: '' });
    }
});

app.post('/api/content/:page/:section', requireRop, async (req, res) => {
    const { page, section } = req.params;
    const { content } = req.body;
    
    console.log(`Saving content: page=${page}, section=${section}, content length=${content?.length || 0}`);
    
    try {
        const result = await pool.query(
            `INSERT INTO content (page, section, content, updated_at, updated_by) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
             ON CONFLICT (page, section) 
             DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP, updated_by = EXCLUDED.updated_by
             RETURNING *`,
            [page, section, content, req.session.user?.username]
        );
        console.log('Content saved successfully:', result.rows[0]);
        res.json({ success: true });
    } catch (error) {
        console.error('Save content error:', error);
        res.status(500).json({ error: 'Failed to save content: ' + error.message });
    }
});

// Добавьте в server.js после всех app.get для HTML файлов

// ========== КРАСИВЫЕ URL (без .html) ==========
app.get('/login', (req, res) => {
    res.redirect('/login.html');
});

app.get('/', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tobacco', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'tobacco.html'));
});

app.get('/liquids', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'liquids.html'));
});

app.get('/snus', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'snus.html'));
});

app.get('/hookah', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'hookah.html'));
});

app.get('/sales', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'sales.html'));
});

app.get('/checks', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'checks.html'));
});

app.get('/cash', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'cash.html'));
});

app.get('/disposables', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'disposables.html'));
});

app.get('/training', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'training.html'));
});

// ---------- Learning Progress ----------
app.post('/api/learning/track', requireAuth, async (req, res) => {
    const { page } = req.body;
    const userId = req.session.user.id;
    
    try {
        // Проверяем, все ли страницы дня пройдены
        const dayPages = {
            'day1': ['day1'],
            'day2': ['day2'],
            'day3': ['day3'],
            'day4': ['day4'],
            'scripts': ['scripts'],
            'security': ['security']
        };
        
        await pool.query(
            `INSERT INTO learning_progress (user_id, page, completed, completed_at, last_viewed)
             VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, page) 
             DO UPDATE SET completed = TRUE, completed_at = CURRENT_TIMESTAMP, last_viewed = CURRENT_TIMESTAMP`,
            [userId, page]
        );
        
        // Получаем общий прогресс
        const result = await pool.query(
            `SELECT page, completed FROM learning_progress WHERE user_id = $1`,
            [userId]
        );
        
        const totalPages = Object.keys(dayPages).length;
        const completedPages = result.rows.filter(r => r.completed).length;
        const progress = Math.round((completedPages / totalPages) * 100);
        
        res.json({ success: true, progress, completedPages, totalPages });
    } catch (error) {
        console.error('Track learning error:', error);
        res.status(500).json({ error: 'Failed to track progress' });
    }
});

app.get('/api/learning/progress', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    
    try {
        const result = await pool.query(
            `SELECT page, completed, completed_at, last_viewed 
             FROM learning_progress WHERE user_id = $1`,
            [userId]
        );
        
        const totalPages = 6; // day1, day2, day3, day4, scripts, security
        const completedPages = result.rows.filter(r => r.completed).length;
        const progress = Math.round((completedPages / totalPages) * 100);
        
        res.json({ progress, completedPages, totalPages, details: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get progress' });
    }
});

// ---------- Quizzes (опросники) ----------
app.get('/api/quizzes', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT q.*, 
                    (SELECT COUNT(*) FROM quiz_results WHERE quiz_id = q.id AND user_id = $1) as attempts_count
             FROM quizzes q 
             WHERE q.is_active = TRUE 
             ORDER BY q.created_at DESC`,
            [req.session.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get quizzes' });
    }
});

app.get('/api/quizzes/:id', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM quizzes WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get quiz' });
    }
});

app.post('/api/quizzes', requireRop, async (req, res) => {
    const { title, description, questions } = req.body;
    
    if (!title || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Title and questions are required' });
    }
    
    try {
        const result = await pool.query(
            `INSERT INTO quizzes (title, description, questions, created_by, is_active)
             VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
            [title, description, JSON.stringify(questions), req.session.user.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

app.put('/api/quizzes/:id', requireRop, async (req, res) => {
    const { title, description, questions, is_active } = req.body;
    
    try {
        const result = await pool.query(
            `UPDATE quizzes SET title=$1, description=$2, questions=$3, is_active=$4 WHERE id=$5 RETURNING *`,
            [title, description, JSON.stringify(questions), is_active, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update quiz' });
    }
});

app.delete('/api/quizzes/:id', requireRop, async (req, res) => {
    try {
        await pool.query('DELETE FROM quizzes WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete quiz' });
    }
});

app.post('/api/quizzes/:id/submit', requireAuth, async (req, res) => {
    const { answers } = req.body; // [{questionIndex, selectedOption}]
    const userId = req.session.user.id;
    const quizId = parseInt(req.params.id);
    
    try {
        // Получаем quiz
        const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
        if (quizResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        
        const quiz = quizResult.rows[0];
        const questions = quiz.questions;
        
        // Подсчет баллов
        let correctCount = 0;
        const answerDetails = [];
        
        answers.forEach(answer => {
            const question = questions[answer.questionIndex];
            const isCorrect = question.correct === answer.selectedOption;
            if (isCorrect) correctCount++;
            answerDetails.push({
                questionIndex: answer.questionIndex,
                selected: answer.selectedOption,
                isCorrect,
                correctAnswer: question.correct,
                explanation: question.explanation
            });
        });
        
        const score = Math.round((correctCount / questions.length) * 100);
        
        // Сохраняем результат
        await pool.query(
            `INSERT INTO quiz_results (user_id, quiz_id, score, total_questions, answers, completed_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [userId, quizId, score, questions.length, JSON.stringify(answerDetails)]
        );
        
        // Удаляем старые результаты (старше 30 дней)
        await pool.query(
            `DELETE FROM quiz_results WHERE completed_at < NOW() - INTERVAL '30 days'`
        );
        
        // Проверяем, нужно ли повторно пройти (если балл меньше 70)
        const needsRetake = score < 70;
        
        res.json({ 
            success: true, 
            score, 
            total: questions.length,
            correct: correctCount,
            needsRetake,
            details: answerDetails
        });
    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({ error: 'Failed to submit quiz' });
    }
});

app.get('/api/quizzes/:id/results', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const quizId = parseInt(req.params.id);
    
    try {
        const result = await pool.query(
            `SELECT * FROM quiz_results 
             WHERE user_id = $1 AND quiz_id = $2 
             ORDER BY completed_at DESC 
             LIMIT 10`,
            [userId, quizId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get results' });
    }
});

// Получить информацию о необходимости повторной аттестации
app.get('/api/quizzes/retake-status', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    
    try {
        // Получаем все активные опросники
        const quizzesResult = await pool.query(
            `SELECT id, title FROM quizzes WHERE is_active = TRUE`
        );
        
        const status = {};
        
        for (const quiz of quizzesResult.rows) {
            // Получаем последний результат за последние 90 дней
            const lastResult = await pool.query(
                `SELECT score, completed_at FROM quiz_results 
                 WHERE user_id = $1 AND quiz_id = $2 
                 AND completed_at > NOW() - INTERVAL '90 days'
                 ORDER BY completed_at DESC LIMIT 1`,
                [userId, quiz.id]
            );
            
            if (lastResult.rows.length === 0) {
                status[quiz.id] = { needsRetake: true, lastScore: null, lastDate: null };
            } else {
                status[quiz.id] = {
                    needsRetake: lastResult.rows[0].score < 70,
                    lastScore: lastResult.rows[0].score,
                    lastDate: lastResult.rows[0].completed_at
                };
            }
        }
        
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get retake status' });
    }
});

// ---------- User Notes (личные заметки) ----------
app.get('/api/notes/:productType/:productId', requireAuth, async (req, res) => {
    const { productType, productId } = req.params;
    const userId = req.session.user.id;
    
    try {
        const result = await pool.query(
            `SELECT * FROM user_notes 
             WHERE user_id = $1 AND product_type = $2 AND product_id = $3`,
            [userId, productType, productId]
        );
        res.json({ note: result.rows[0]?.note || '' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get note' });
    }
});

app.post('/api/notes', requireAuth, async (req, res) => {
    const { product_type, product_id, note } = req.body;
    const userId = req.session.user.id;
    
    try {
        const result = await pool.query(
            `INSERT INTO user_notes (user_id, product_type, product_id, note, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, product_type, product_id)
             DO UPDATE SET note = EXCLUDED.note, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [userId, product_type, product_id, note]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Save note error:', error);
        res.status(500).json({ error: 'Failed to save note' });
    }
});

app.delete('/api/notes/:productType/:productId', requireAuth, async (req, res) => {
    const { productType, productId } = req.params;
    const userId = req.session.user.id;
    
    try {
        await pool.query(
            `DELETE FROM user_notes WHERE user_id = $1 AND product_type = $2 AND product_id = $3`,
            [userId, productType, productId]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// ---------- Global Search (глобальный поиск) ----------
// Функция для обновления поискового индекса
async function updateSearchIndex() {
    // Очищаем старый индекс
    await pool.query('TRUNCATE search_index');
    
    // Добавляем производителей табака
    await pool.query(`
        INSERT INTO search_index (entity_type, entity_id, title, description, category)
        SELECT 'tobacco_manufacturer', id, name, COALESCE(description, ''), 'tobacco'
        FROM manufacturers
    `);
    
    // Добавляем линейки табака
    await pool.query(`
        INSERT INTO search_index (entity_type, entity_id, title, description, category)
        SELECT 'tobacco_line', l.id, l.name, COALESCE(l.description, ''), 'tobacco'
        FROM lines l
    `);
    
    // Добавляем производителей жидкостей
    await pool.query(`
        INSERT INTO search_index (entity_type, entity_id, title, description, category)
        SELECT 'liquid_manufacturer', id, name, COALESCE(description, ''), 'liquids'
        FROM liquid_manufacturers
    `);
    
    // Добавляем линейки жидкостей
    await pool.query(`
        INSERT INTO search_index (entity_type, entity_id, title, description, category)
        SELECT 'liquid_line', l.id, l.name, COALESCE(l.description, ''), 'liquids'
        FROM liquid_lines l
    `);
    
    // Добавляем производителей одноразок
    await pool.query(`
        INSERT INTO search_index (entity_type, entity_id, title, description, category)
        SELECT 'disposables_manufacturer', id, name, COALESCE(description, ''), 'disposables'
        FROM disposables_manufacturers
    `);
    
    // Добавляем линейки одноразок
    await pool.query(`
        INSERT INTO search_index (entity_type, entity_id, title, description, category)
        SELECT 'disposables_line', l.id, l.name, COALESCE(l.description, ''), 'disposables'
        FROM disposables_lines l
    `);
    
    // Добавляем производителей снюса
    await pool.query(`
        INSERT INTO search_index (entity_type, entity_id, title, description, category)
        SELECT 'snus_manufacturer', id, name, COALESCE(description, ''), 'snus'
        FROM snus_manufacturers
    `);
    
    // Добавляем линейки снюса
    await pool.query(`
        INSERT INTO search_index (entity_type, entity_id, title, description, category)
        SELECT 'snus_line', l.id, l.name, COALESCE(l.description, ''), 'snus'
        FROM snus_lines l
    `);
    
    // Добавляем контент страниц
    await pool.query(`
        INSERT INTO search_index (entity_type, entity_id, title, description, category)
        SELECT 'content', id, page || ' - ' || section, COALESCE(content, ''), page
        FROM content
    `);
    
    console.log('✅ Search index updated');
}

// Простой алгоритм Левенштейна для нечеткого поиска
function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = a[j - 1] === b[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[b.length][a.length];
}

function suggestCorrection(query, candidates, maxDistance = 2) {
    let bestMatch = null;
    let bestDistance = Infinity;
    
    for (const candidate of candidates) {
        const distance = levenshteinDistance(query.toLowerCase(), candidate.toLowerCase());
        if (distance < bestDistance && distance <= maxDistance) {
            bestDistance = distance;
            bestMatch = candidate;
        }
    }
    
    return bestMatch;
}

app.get('/api/search', requireAuth, async (req, res) => {
    const { q, category, limit = 50 } = req.query;
    
    if (!q || q.length < 2) {
        return res.json({ results: [], suggestion: null });
    }
    
    try {
        // Получаем все популярные термины для автодополнения
        const allTermsResult = await pool.query(`
            SELECT DISTINCT title FROM search_index LIMIT 1000
        `);
        const allTerms = allTermsResult.rows.map(r => r.title);
        
        // Исправление опечаток
        const suggestion = suggestCorrection(q, allTerms, 2);
        
        // Поиск через full-text search
        let queryText = `
            SELECT 
                entity_type, 
                entity_id, 
                title, 
                description, 
                category,
                ts_rank(search_vector, plainto_tsquery('russian', $1)) as rank
            FROM search_index
            WHERE search_vector @@ plainto_tsquery('russian', $1)
        `;
        const params = [q];
        
        if (category && category !== 'all') {
            queryText += ` AND category = $2`;
            params.push(category);
        }
        
        queryText += ` ORDER BY rank DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        
        const result = await pool.query(queryText, params);
        
        // Группируем результаты по типу
        const grouped = {
            manufacturers: [],
            lines: [],
            content: [],
            other: []
        };
        
        for (const row of result.rows) {
            const item = {
                type: row.entity_type,
                id: row.entity_id,
                title: row.title,
                description: row.description,
                category: row.category,
                url: getUrlForEntity(row.entity_type, row.entity_id, row.category)
            };
            
            if (row.entity_type.includes('manufacturer')) {
                grouped.manufacturers.push(item);
            } else if (row.entity_type.includes('line')) {
                grouped.lines.push(item);
            } else if (row.entity_type === 'content') {
                grouped.content.push(item);
            } else {
                grouped.other.push(item);
            }
        }
        
        res.json({
            results: grouped,
            suggestion: suggestion !== q ? suggestion : null,
            query: q
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Вспомогательная функция для получения URL
function getUrlForEntity(entityType, entityId, category) {
    const urls = {
        'tobacco_manufacturer': `/tobacco#manufacturer-${entityId}`,
        'tobacco_line': `/tobacco#line-${entityId}`,
        'liquid_manufacturer': `/liquids#manufacturer-${entityId}`,
        'liquid_line': `/liquids#line-${entityId}`,
        'disposables_manufacturer': `/disposables#manufacturer-${entityId}`,
        'disposables_line': `/disposables#line-${entityId}`,
        'snus_manufacturer': `/snus#manufacturer-${entityId}`,
        'snus_line': `/snus#line-${entityId}`,
        'content': `/${category}#${entityId}`
    };
    return urls[entityType] || '#';
}

// Эндпоинт для автодополнения (autocomplete)
app.get('/api/search/autocomplete', requireAuth, async (req, res) => {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 1) {
        return res.json([]);
    }
    
    try {
        const result = await pool.query(`
            SELECT DISTINCT title 
            FROM search_index 
            WHERE title ILIKE $1 
            LIMIT $2
        `, [`%${q}%`, limit]);
        
        // Добавляем исправление опечаток
        const allTerms = result.rows.map(r => r.title);
        const suggestion = suggestCorrection(q, allTerms, 2);
        
        res.json({
            suggestions: result.rows.map(r => r.title),
            correction: suggestion !== q ? suggestion : null
        });
    } catch (error) {
        res.status(500).json([]);
    }
});

// Получить всех сотрудников с их точками
app.get('/api/users-with-points', requireRop, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.full_name, u.position, u.point_id, 
                   p.name as point_name, p.address as point_address
            FROM users u
            LEFT JOIN points p ON u.point_id = p.id
            WHERE u.role = 'user'
            ORDER BY p.name NULLS LAST, u.full_name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users with points:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Получить ВСЕ графики для точки за месяц
app.get('/api/schedule/point/:pointId/:year/:month', requireRop, async (req, res) => {
    const { pointId, year, month } = req.params;
    
    try {
        // Получаем всех сотрудников точки
        const usersResult = await pool.query(`
            SELECT id, full_name, position 
            FROM users 
            WHERE point_id = $1 AND role = 'user'
            ORDER BY full_name
        `, [pointId]);
        
        // Получаем графики для этих сотрудников
        const schedules = {};
        for (const user of usersResult.rows) {
            const scheduleResult = await pool.query(`
                SELECT days, partner_id
                FROM schedules 
                WHERE user_id = $1 AND year = $2 AND month = $3
            `, [user.id, year, month]);
            
            schedules[user.id] = {
                days: scheduleResult.rows[0]?.days || Array(new Date(year, month, 0).getDate()).fill('off'),
                partner_id: scheduleResult.rows[0]?.partner_id || null
            };
        }
        
        // Получаем список всех сотрудников для выбора сменщика
        const allUsersResult = await pool.query(`
            SELECT id, full_name FROM users WHERE role = 'user' ORDER BY full_name
        `);
        
        res.json({
            users: usersResult.rows,
            schedules: schedules,
            daysInMonth: new Date(year, month, 0).getDate(),
            allUsers: allUsersResult.rows
        });
    } catch (error) {
        console.error('Error fetching point schedules:', error);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

// Сохранить ВСЕ графики для точки за месяц
app.post('/api/schedule/point/:pointId', requireRop, async (req, res) => {
    const { pointId } = req.params;
    const { year, month, schedules } = req.body;
    
    if (!year || !month || !schedules) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const results = [];
        
        for (const [userId, scheduleData] of Object.entries(schedules)) {
            const { days, partner_id } = scheduleData;
            
            const result = await pool.query(`
                INSERT INTO schedules (user_id, partner_id, year, month, days, updated_by, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id, year, month)
                DO UPDATE SET partner_id = $2, days = $5, updated_by = $6, updated_at = NOW()
                RETURNING *
            `, [userId, partner_id || null, year, month, JSON.stringify(days), req.session.user.id]);
            
            results.push(result.rows[0]);
        }
        
        res.json({ success: true, results });
    } catch (error) {
        console.error('Error saving point schedules:', error);
        res.status(500).json({ error: 'Failed to save schedules' });
    }
});

// Скопировать график с прошлого месяца
app.post('/api/schedule/copy/:pointId', requireRop, async (req, res) => {
    const { pointId } = req.params;
    const { year, month } = req.body;
    
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) {
        prevMonth = 12;
        prevYear--;
    }
    
    try {
        // Получаем графики за прошлый месяц
        const usersResult = await pool.query(`
            SELECT id FROM users WHERE point_id = $1 AND role = 'user'
        `, [pointId]);
        
        const schedules = {};
        for (const user of usersResult.rows) {
            const scheduleResult = await pool.query(`
                SELECT days, partner_id
                FROM schedules 
                WHERE user_id = $1 AND year = $2 AND month = $3
            `, [user.id, prevYear, prevMonth]);
            
            if (scheduleResult.rows[0]) {
                let days = scheduleResult.rows[0].days;
                // Обрезаем или дополняем до нужного количества дней
                const daysInMonth = new Date(year, month, 0).getDate();
                if (days.length > daysInMonth) {
                    days = days.slice(0, daysInMonth);
                } else if (days.length < daysInMonth) {
                    while (days.length < daysInMonth) {
                        days.push('off');
                    }
                }
                schedules[user.id] = {
                    days: days,
                    partner_id: scheduleResult.rows[0].partner_id
                };
            }
        }
        
        res.json({ schedules });
    } catch (error) {
        console.error('Error copying schedule:', error);
        res.status(500).json({ error: 'Failed to copy schedule' });
    }
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ЭНДПОИНТЫ ДЛЯ ОТЛАДКИ ==========

// Проверить состояние пользователей
app.get('/api/debug/users-status', requireRop, async (req, res) => {
    try {
        // Все пользователи
        const allUsers = await pool.query(`
            SELECT id, full_name, username, role, point_id 
            FROM users 
            ORDER BY id
        `);
        
        // Все точки
        const points = await pool.query(`SELECT id, name FROM points ORDER BY id`);
        
        // Пользователи без точки
        const usersWithoutPoint = await pool.query(`
            SELECT id, full_name, role 
            FROM users 
            WHERE point_id IS NULL AND role = 'user'
        `);
        
        res.json({
            users: allUsers.rows,
            points: points.rows,
            usersWithoutPoint: usersWithoutPoint.rows,
            usersWithoutPointCount: usersWithoutPoint.rows.length
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Быстрое исправление - назначить всех сотрудников на первую точку
app.post('/api/debug/assign-users-to-first-point', requireRop, async (req, res) => {
    try {
        // Получаем первую точку
        const firstPoint = await pool.query(`SELECT id FROM points ORDER BY id LIMIT 1`);
        
        if (firstPoint.rows.length === 0) {
            return res.status(400).json({ error: 'Нет ни одной точки. Сначала создайте точку.' });
        }
        
        const pointId = firstPoint.rows[0].id;
        
        // Назначаем всех сотрудников на эту точку
        const result = await pool.query(`
            UPDATE users 
            SET point_id = $1 
            WHERE role = 'user' AND point_id IS NULL
            RETURNING id, full_name
        `, [pointId]);
        
        res.json({
            success: true,
            message: `Назначено ${result.rowCount} сотрудников на точку ID ${pointId}`,
            assignedUsers: result.rows,
            pointId: pointId
        });
    } catch (error) {
        console.error('Assign error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создать тестовую точку если нет ни одной
app.post('/api/debug/create-default-point', requireRop, async (req, res) => {
    try {
        const existingPoints = await pool.query(`SELECT id FROM points LIMIT 1`);
        
        if (existingPoints.rows.length > 0) {
            return res.json({ success: true, message: 'Точка уже существует', pointId: existingPoints.rows[0].id });
        }
        
        const result = await pool.query(`
            INSERT INTO points (name, address) 
            VALUES ('Основная точка', 'Адрес не указан')
            RETURNING id
        `);
        
        res.json({
            success: true,
            message: 'Создана тестовая точка',
            pointId: result.rows[0].id
        });
    } catch (error) {
        console.error('Create point error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновляем поисковый индекс после изменений в БД
// Вызывать после добавления/изменения производителей и линеек
async function rebuildSearchIndex() {
    await updateSearchIndex();
}

// Вызываем при старте сервера
setTimeout(() => {
    rebuildSearchIndex().catch(console.error);
}, 5000);

// Отладочный эндпоинт - проверить сотрудников точки
app.get('/api/debug/point-users/:pointId', requireRop, async (req, res) => {
    const { pointId } = req.params;
    try {
        const users = await pool.query(`
            SELECT id, full_name, position, point_id 
            FROM users 
            WHERE role = 'user'
        `);
        const pointUsers = await pool.query(`
            SELECT id, full_name, position 
            FROM users 
            WHERE point_id = $1 AND role = 'user'
        `, [pointId]);
        
        res.json({
            allUsers: users.rows,
            pointUsers: pointUsers.rows,
            pointId: pointId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Показать всех пользователей и их точки
app.get('/api/debug/all-users-with-points', requireRop, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.full_name, u.username, u.role, u.point_id, p.name as point_name
            FROM users u
            LEFT JOIN points p ON u.point_id = p.id
            ORDER BY u.id
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== START SERVER ==========
async function startServer() {
    console.log('\n🚀 Starting server...\n');
    
    const dbReady = await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`\n✅ Server running on port ${PORT}`);
        console.log(`📦 Database: ${dbReady ? 'CONNECTED' : 'NOT CONNECTED'}`);
        console.log(`🍪 Session cookie: spravochnik.sid`);
        console.log(`\n📋 Данные для входа:`);
        console.log(`   👤 Обычный пользователь: пароль 1111`);
        console.log(`   👑 РОП: rop / 1234`);
        console.log(`   👑 ROOT: root / root123`);
        console.log(`\n🔗 URL: http://localhost:${PORT}\n`);
    });
}

startServer();
