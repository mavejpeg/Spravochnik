// server.js - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ
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
                position VARCHAR(255),
                point_id INTEGER,
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

        // Learning progress
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

        // Quizzes
        await client.query(`
            CREATE TABLE IF NOT EXISTS quizzes (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                questions JSONB NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Quiz results
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

        // User notes
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_notes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                product_type VARCHAR(50) NOT NULL,
                product_id INTEGER NOT NULL,
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_type, product_id)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS registration_requests (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                point_id INTEGER REFERENCES points(id),
                status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
                reviewed_by INTEGER REFERENCES users(id),
                reviewed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица подмен
        await client.query(`
            CREATE TABLE IF NOT EXISTS substitutions (
                id SERIAL PRIMARY KEY,
                original_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                substitute_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                substitute_point_id INTEGER REFERENCES points(id) ON DELETE SET NULL,
                date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, completed
                requested_by INTEGER REFERENCES users(id),
                approved_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                note TEXT,
                UNIQUE(original_user_id, date)
            )
        `);

        // Таблица ролей (должностей)
        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                description TEXT,
                permissions JSONB DEFAULT '[]',
                level INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица прав доступа
        await client.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                category VARCHAR(50),
                description TEXT
            )
        `);

        // Добавляем колонку role_id в users вместо role (сохраняем для совместимости)
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id)`).catch(e => {});
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_role VARCHAR(50)`).catch(e => {});

        // ========== НЕ СОЗДАЕМ ПОЛЬЗОВАТЕЛЕЙ И ТОЧКИ АВТОМАТИЧЕСКИ ==========
        // Пользователи и точки добавляются только через админ-панель
        console.log('✅ All tables created');
        console.log('ℹ️ No default users or points created - add them via admin panel');

        client.release();
        console.log('✅ Database initialization complete');
        return true;
    } catch (error) {
        console.error('❌ Database init error:', error.message);
        return false;
    }
}

// ========== БАЗОВЫЕ РОЛИ ==========
// Добавляем стандартные роли
const defaultRoles = [
    { name: 'root', display_name: 'Главный администратор', description: 'Полный доступ ко всем функциям', level: 100 },
    { name: 'rop', display_name: 'Руководитель отдела продаж', description: 'Управление сотрудниками и графиками', level: 80 }
];

for (const role of defaultRoles) {
    await client.query(`
        INSERT INTO roles (name, display_name, description, level, permissions)
        VALUES ($1, $2, $3, $4, '[]')
        ON CONFLICT (name) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            level = EXCLUDED.level
    `, [role.name, role.display_name, role.description, role.level]);
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

app.set('trust proxy', 1);

// DEBUG логирование
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
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

app.get('/utils.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'utils.js'));
});

app.get('/schedule-editor.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'schedule-editor.js'));
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

app.get('/api/users-full', requireRop, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.full_name, u.role, u.position, u.point_id, p.name as point_name
            FROM users u
            LEFT JOIN points p ON u.point_id = p.id
            ORDER BY u.full_name
        `);
        res.json(result.rows);
    } catch (e) {
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
    const { position, point_id, role } = req.body;
    const targetId = req.params.userId;
    const currentUser = req.session.user;
    
    try {
        const target = await pool.query('SELECT * FROM users WHERE id=$1', [targetId]);
        if (!target.rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
        
        let newRole = target.rows[0].role;
        if (currentUser.role === 'root' && role) {
            newRole = role;
        }
        
        await pool.query(
            'UPDATE users SET position=$1, point_id=$2, role=$3 WHERE id=$4',
            [position || null, point_id || null, newRole, targetId]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
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

// ========== SCHEDULE API (ИСПРАВЛЕННЫЙ) ==========

// Получить ВСЕХ пользователей на точке (БЕЗ фильтрации по роли)
app.get('/api/schedule/point/:pointId/:year/:month', requireRop, async (req, res) => {
    const { pointId, year, month } = req.params;
    
    console.log(`📅 Schedule request: pointId=${pointId}, year=${year}, month=${month}`);
    
    try {
        // Получаем ВСЕХ сотрудников точки (БЕЗ условия role = 'user')
        const usersResult = await pool.query(`
            SELECT id, full_name, position 
            FROM users 
            WHERE point_id = $1
            ORDER BY full_name
        `, [pointId]);
        
        console.log(`✅ Found ${usersResult.rows.length} users on point ${pointId}`);
        
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // Получаем графики для этих сотрудников
        const schedules = {};
        for (const user of usersResult.rows) {
            const scheduleResult = await pool.query(`
                SELECT days, partner_id
                FROM schedules 
                WHERE user_id = $1 AND year = $2 AND month = $3
            `, [user.id, year, month]);
            
            schedules[user.id] = {
                days: scheduleResult.rows[0]?.days || Array(daysInMonth).fill('off'),
                partner_id: scheduleResult.rows[0]?.partner_id || null
            };
        }
        
        // Получаем список ВСЕХ сотрудников для выбора сменщика
        const allUsersResult = await pool.query(`
            SELECT id, full_name FROM users ORDER BY full_name
        `);
        
        res.json({
            users: usersResult.rows,
            schedules: schedules,
            daysInMonth: daysInMonth,
            allUsers: allUsersResult.rows
        });
    } catch (error) {
        console.error('❌ Error fetching point schedules:', error);
        res.status(500).json({ error: 'Failed to fetch schedules: ' + error.message });
    }
});

// Сохранить ВСЕ графики для точки за месяц
app.post('/api/schedule/point/:pointId', requireRop, async (req, res) => {
    const { pointId } = req.params;
    const { year, month, schedules } = req.body;
    
    console.log(`💾 Saving schedules for point ${pointId}, ${year}/${month}`);
    
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
        console.error('❌ Error saving point schedules:', error);
        res.status(500).json({ error: 'Failed to save schedules: ' + error.message });
    }
});

// Получить график одного сотрудника
app.get('/api/schedule/:userId/:year/:month', requireAuth, async (req, res) => {
    const { userId, year, month } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT s.*, u.full_name as user_name, p.full_name as partner_name
            FROM schedules s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN users p ON s.partner_id = p.id
            WHERE s.user_id = $1 AND s.year = $2 AND s.month = $3
        `, [userId, year, month]);
        
        res.json(result.rows[0] || null);
    } catch (e) {
        res.status(500).json({ error: 'Failed to get schedule' });
    }
});

// ========== LEARNING PROGRESS API ==========
app.post('/api/learning/track', requireAuth, async (req, res) => {
    const { page } = req.body;
    const userId = req.session.user.id;
    
    try {
        await pool.query(
            `INSERT INTO learning_progress (user_id, page, completed, completed_at, last_viewed)
             VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, page) 
             DO UPDATE SET completed = TRUE, completed_at = CURRENT_TIMESTAMP, last_viewed = CURRENT_TIMESTAMP`,
            [userId, page]
        );
        
        const result = await pool.query(
            `SELECT page, completed FROM learning_progress WHERE user_id = $1`,
            [userId]
        );
        
        const totalPages = 6;
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
        
        const totalPages = 6;
        const completedPages = result.rows.filter(r => r.completed).length;
        const progress = Math.round((completedPages / totalPages) * 100);
        
        res.json({ progress, completedPages, totalPages, details: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get progress' });
    }
});

// ========== QUIZZES API ==========
app.get('/api/quizzes', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT q.*, 
                    (SELECT COUNT(*) FROM quiz_results WHERE quiz_id = q.id AND user_id = $1) as attempts_count
             FROM quizzes q 
             ORDER BY q.created_at DESC
        `, [req.session.user.id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get quizzes error:', error);
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
    const { answers } = req.body;
    const userId = req.session.user.id;
    const quizId = parseInt(req.params.id);
    
    try {
        const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
        if (quizResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        
        const quiz = quizResult.rows[0];
        const questions = quiz.questions;
        
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
        
        await pool.query(
            `INSERT INTO quiz_results (user_id, quiz_id, score, total_questions, answers, completed_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [userId, quizId, score, questions.length, JSON.stringify(answerDetails)]
        );
        
        await pool.query(`DELETE FROM quiz_results WHERE completed_at < NOW() - INTERVAL '30 days'`);
        
        res.json({ 
            success: true, 
            score, 
            total: questions.length,
            correct: correctCount,
            needsRetake: score < 70,
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

app.get('/api/quizzes/retake-status', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    
    try {
        const quizzesResult = await pool.query(`SELECT id, title FROM quizzes WHERE is_active = TRUE`);
        
        const status = {};
        for (const quiz of quizzesResult.rows) {
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

// ========== USER NOTES API ==========
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

// ========== DEBUG ENDPOINTS ==========
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

app.get('/api/debug/point-users-direct/:pointId', requireRop, async (req, res) => {
    const { pointId } = req.params;
    try {
        const result = await pool.query(`
            SELECT id, full_name, username, role, point_id 
            FROM users 
            WHERE point_id = $1
        `, [pointId]);
        res.json({
            pointId: pointId,
            count: result.rows.length,
            users: result.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/debug/users-status', requireRop, async (req, res) => {
    try {
        const allUsers = await pool.query(`
            SELECT id, full_name, username, role, point_id 
            FROM users 
            ORDER BY id
        `);
        const points = await pool.query(`SELECT id, name FROM points ORDER BY id`);
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
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/debug/assign-users-to-first-point', requireRop, async (req, res) => {
    try {
        const firstPoint = await pool.query(`SELECT id FROM points ORDER BY id LIMIT 1`);
        if (firstPoint.rows.length === 0) {
            return res.status(400).json({ error: 'Нет ни одной точки' });
        }
        const pointId = firstPoint.rows[0].id;
        const result = await pool.query(`
            UPDATE users SET point_id = $1 
            WHERE role = 'user' AND point_id IS NULL
            RETURNING id, full_name
        `, [pointId]);
        res.json({ success: true, message: `Назначено ${result.rowCount} сотрудников`, assignedUsers: result.rows, pointId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== HTML ROUTES ==========
app.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

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

app.get('/profile', protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
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

app.get('/health', (req, res) => {
    res.json({ status: 'ok', session: !!req.session });
});

// ========== ПУБЛИЧНЫЕ ЭНДПОИНТЫ (без авторизации) ==========
app.get('/api/points-public', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, address FROM points ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get points' });
    }
});

// ========== РЕГИСТРАЦИЯ (ЗАЯВКИ) ==========
app.post('/api/register-request', async (req, res) => {
    const { full_name, username, password, point_id } = req.body;
    
    if (!full_name || !username || !password || !point_id) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    // Проверка сложности пароля
    const passwordStrength = checkPasswordStrength(password);
    if (passwordStrength.level === 'weak') {
        return res.status(400).json({ error: 'Пароль слишком простой. Используйте минимум 8 символов, буквы и цифры.' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ error: 'Логин должен быть не менее 3 символов' });
    }
    
    try {
        // Проверяем, не существует ли уже такой пользователь
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username.toLowerCase()]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
        }
        
        // Проверяем, нет ли уже pending заявки
        const existingRequest = await pool.query(
            'SELECT id FROM registration_requests WHERE username = $1 AND status = $2',
            [username.toLowerCase(), 'pending']
        );
        
        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'Заявка на этот логин уже отправлена' });
        }
        
        // Создаем заявку
        await pool.query(
            `INSERT INTO registration_requests (full_name, username, password, point_id, status)
             VALUES ($1, $2, $3, $4, 'pending')`,
            [full_name, username.toLowerCase(), password, point_id]
        );
        
        res.json({ success: true, message: 'Заявка отправлена' });
    } catch (error) {
        console.error('Registration request error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вспомогательная функция для проверки пароля
function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return { level: 'weak', text: 'Слабый пароль' };
    if (strength <= 4) return { level: 'medium', text: 'Средний пароль' };
    return { level: 'strong', text: 'Сложный пароль' };
}

// ========== ЗАЯВКИ НА РЕГИСТРАЦИЮ (ДЛЯ РОП) ==========
app.get('/api/registration-requests', requireRop, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, p.name as point_name
            FROM registration_requests r
            LEFT JOIN points p ON r.point_id = p.id
            WHERE r.status = 'pending'
            ORDER BY r.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get requests' });
    }
});

app.post('/api/registration-requests/:id/:action', requireRop, async (req, res) => {
    const { id, action } = req.params;
    const userId = req.session.user.id;
    
    if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    try {
        const requestResult = await pool.query(
            'SELECT * FROM registration_requests WHERE id = $1',
            [id]
        );
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        const request = requestResult.rows[0];
        
        if (action === 'approve') {
            // Создаем пользователя
            await pool.query(
                `INSERT INTO users (username, password, full_name, role, point_id)
                 VALUES ($1, $2, $3, 'user', $4)`,
                [request.username, request.password, request.full_name, request.point_id]
            );
        }
        
        // Обновляем статус заявки
        await pool.query(
            `UPDATE registration_requests 
             SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [action === 'approve' ? 'approved' : 'rejected', userId, id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Process request error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// ========== РОП ИНФОРМАЦИЯ ==========
app.get('/api/rop-info', requireAuth, async (req, res) => {
    try {
        // Получаем всех пользователей с ролью rop или root
        const ropList = await pool.query(`
            SELECT id, full_name, username, position, point_id
            FROM users 
            WHERE role IN ('rop', 'root')
            ORDER BY role DESC
        `);
        
        // Получаем график работы РОП (можно получить из schedules или задать стандартный)
        const schedule = await pool.query(`
            SELECT days FROM schedules 
            WHERE user_id = $1 AND year = $2 AND month = $3
            LIMIT 1
        `, [ropList.rows[0]?.id, new Date().getFullYear(), new Date().getMonth() + 1]);
        
        res.json({
            rop: ropList.rows[0] || null,
            allRops: ropList.rows,
            schedule: schedule.rows[0]?.days || null
        });
    } catch (error) {
        console.error('Error fetching ROP info:', error);
        res.status(500).json({ error: 'Failed to get ROP info' });
    }
});

// ========== ПОДМЕНЫ ==========
// Получить подмены для сотрудника
app.get('/api/substitutions/:userId', requireAuth, async (req, res) => {
    const { userId } = req.params;
    const { year, month } = req.query;
    
    try {
        let query = `
            SELECT s.*, 
                   u.full_name as original_name,
                   sub.full_name as substitute_name,
                   p.name as point_name,
                   p.address as point_address
            FROM substitutions s
            LEFT JOIN users u ON s.original_user_id = u.id
            LEFT JOIN users sub ON s.substitute_user_id = sub.id
            LEFT JOIN points p ON s.substitute_point_id = p.id
            WHERE (s.original_user_id = $1 OR s.substitute_user_id = $1)
        `;
        const params = [userId];
        
        if (year && month) {
            query += ` AND EXTRACT(YEAR FROM s.date) = $2 AND EXTRACT(MONTH FROM s.date) = $3`;
            params.push(year, month);
        }
        
        query += ` ORDER BY s.date ASC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching substitutions:', error);
        res.status(500).json({ error: 'Failed to get substitutions' });
    }
});

// Создать подмену (только РОП)
app.post('/api/substitutions', requireRop, async (req, res) => {
    const { original_user_id, substitute_user_id, substitute_point_id, date, note } = req.body;
    
    // Проверка: нельзя подменить за час до смены
    const subDate = new Date(date);
    const now = new Date();
    const hoursDiff = (subDate - now) / (1000 * 60 * 60);
    
    if (hoursDiff < 1) {
        return res.status(400).json({ error: 'Нельзя создать подмену менее чем за час до начала смены' });
    }
    
    try {
        // Проверяем, нет ли уже подмены на эту дату
        const existing = await pool.query(
            'SELECT id FROM substitutions WHERE original_user_id = $1 AND date = $2',
            [original_user_id, date]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'На эту дату уже есть подмена' });
        }
        
        const result = await pool.query(`
            INSERT INTO substitutions (original_user_id, substitute_user_id, substitute_point_id, date, status, requested_by, approved_by, note)
            VALUES ($1, $2, $3, $4, 'approved', $5, $5, $6)
            RETURNING *
        `, [original_user_id, substitute_user_id, substitute_point_id, date, req.session.user.id, note]);
        
        // Обновляем график оригинального сотрудника (делаем его выходным)
        const [year, month, day] = date.split('-');
        const scheduleResult = await pool.query(
            'SELECT days FROM schedules WHERE user_id = $1 AND year = $2 AND month = $3',
            [original_user_id, year, month]
        );
        
        if (scheduleResult.rows.length > 0) {
            let days = scheduleResult.rows[0].days;
            const dayIndex = parseInt(day) - 1;
            if (days[dayIndex] === 'work') {
                days[dayIndex] = 'off';
                await pool.query(
                    'UPDATE schedules SET days = $1 WHERE user_id = $2 AND year = $3 AND month = $4',
                    [JSON.stringify(days), original_user_id, year, month]
                );
            }
        }
        
        // Обновляем график подменяющего сотрудника (делаем его рабочим)
        const subScheduleResult = await pool.query(
            'SELECT days FROM schedules WHERE user_id = $1 AND year = $2 AND month = $3',
            [substitute_user_id, year, month]
        );
        
        if (subScheduleResult.rows.length > 0) {
            let days = subScheduleResult.rows[0].days;
            const dayIndex = parseInt(day) - 1;
            if (days[dayIndex] !== 'work') {
                days[dayIndex] = 'work';
                await pool.query(
                    'UPDATE schedules SET days = $1 WHERE user_id = $2 AND year = $3 AND month = $4',
                    [JSON.stringify(days), substitute_user_id, year, month]
                );
            }
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating substitution:', error);
        res.status(500).json({ error: 'Failed to create substitution' });
    }
});

// Отменить подмену (только РОП)
app.delete('/api/substitutions/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Получаем информацию о подмене перед удалением
        const subResult = await pool.query('SELECT * FROM substitutions WHERE id = $1', [id]);
        const substitution = subResult.rows[0];
        
        if (substitution) {
            // Восстанавливаем оригинальный график
            const [year, month, day] = substitution.date.split('-');
            
            // Возвращаем рабочий день оригинальному сотруднику
            const origSchedule = await pool.query(
                'SELECT days FROM schedules WHERE user_id = $1 AND year = $2 AND month = $3',
                [substitution.original_user_id, year, month]
            );
            
            if (origSchedule.rows.length > 0) {
                let days = origSchedule.rows[0].days;
                const dayIndex = parseInt(day) - 1;
                days[dayIndex] = 'work';
                await pool.query(
                    'UPDATE schedules SET days = $1 WHERE user_id = $2 AND year = $3 AND month = $4',
                    [JSON.stringify(days), substitution.original_user_id, year, month]
                );
            }
            
            // Убираем рабочий день у подменяющего
            const subSchedule = await pool.query(
                'SELECT days FROM schedules WHERE user_id = $1 AND year = $2 AND month = $3',
                [substitution.substitute_user_id, year, month]
            );
            
            if (subSchedule.rows.length > 0) {
                let days = subSchedule.rows[0].days;
                const dayIndex = parseInt(day) - 1;
                days[dayIndex] = 'off';
                await pool.query(
                    'UPDATE schedules SET days = $1 WHERE user_id = $2 AND year = $3 AND month = $4',
                    [JSON.stringify(days), substitution.substitute_user_id, year, month]
                );
            }
        }
        
        await pool.query('DELETE FROM substitutions WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting substitution:', error);
        res.status(500).json({ error: 'Failed to delete substitution' });
    }
});

// Запросить подмену (от сотрудника)
app.post('/api/substitutions/request', requireAuth, async (req, res) => {
    const { date, reason } = req.body;
    const userId = req.session.user.id;
    
    const subDate = new Date(date);
    const now = new Date();
    const hoursDiff = (subDate - now) / (1000 * 60 * 60);
    
    if (hoursDiff < 24) {
        return res.status(400).json({ error: 'Запрос на подмену нужно отправлять минимум за 24 часа' });
    }
    
    try {
        // Проверяем, есть ли уже подмена
        const existing = await pool.query(
            'SELECT id FROM substitutions WHERE original_user_id = $1 AND date = $2',
            [userId, date]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'На эту дату уже есть подмена' });
        }
        
        // Создаем запрос (без утвержденного подменяющего)
        const result = await pool.query(`
            INSERT INTO substitutions (original_user_id, date, status, requested_by, note)
            VALUES ($1, $2, 'pending', $3, $4)
            RETURNING *
        `, [userId, date, userId, reason]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error requesting substitution:', error);
        res.status(500).json({ error: 'Failed to request substitution' });
    }
});

// Получить список всех РОП и администраторов
app.get('/api/rop-list', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, full_name, username, role, position
            FROM users 
            WHERE role IN ('rop', 'root')
            ORDER BY 
                CASE role 
                    WHEN 'root' THEN 1 
                    WHEN 'rop' THEN 2 
                    ELSE 3 
                END,
                full_name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching ROP list:', error);
        res.status(500).json({ error: 'Failed to get ROP list' });
    }
});

// Обновить информацию о РОП (телефон, описание, график)
app.put('/api/rop-info/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { phone, description, schedule_info } = req.body;
    
    try {
        await pool.query(`
            UPDATE users 
            SET phone = $1, description = $2, schedule_info = $3
            WHERE id = $4
        `, [phone, description, schedule_info, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating ROP info:', error);
        res.status(500).json({ error: 'Failed to update ROP info' });
    }
});

// ========== УПРАВЛЕНИЕ РОП (только для root) ==========
// Получить список всех РОП и администраторов с полной информацией
app.get('/api/rop-full-list', requireRop, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, full_name, username, role, position, 
                   COALESCE(phone, '') as phone,
                   COALESCE(description, '') as description,
                   COALESCE(schedule_info, '') as schedule_info,
                   point_id
            FROM users 
            WHERE role IN ('rop', 'root')
            ORDER BY 
                CASE role 
                    WHEN 'root' THEN 1 
                    WHEN 'rop' THEN 2 
                    ELSE 3 
                END,
                full_name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching ROP full list:', error);
        res.status(500).json({ error: 'Failed to get ROP list' });
    }
});

// Обновить информацию о РОП (только для root)
app.put('/api/rop-info/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { phone, description, schedule_info } = req.body;
    
    // Только root может редактировать
    if (req.session.user.role !== 'root') {
        return res.status(403).json({ error: 'Только главный администратор может редактировать' });
    }
    
    try {
        await pool.query(`
            UPDATE users 
            SET phone = $1, description = $2, schedule_info = $3
            WHERE id = $4 AND role IN ('rop', 'root')
        `, [phone, description, schedule_info, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating ROP info:', error);
        res.status(500).json({ error: 'Failed to update ROP info' });
    }
});

// Получить графики всех РОП и администраторов за месяц
app.get('/api/rop-schedules/:year/:month', requireAuth, async (req, res) => {
    const { year, month } = req.params;
    
    try {
        const rops = await pool.query(`
            SELECT id, full_name, role
            FROM users 
            WHERE role IN ('rop', 'root')
            ORDER BY 
                CASE role 
                    WHEN 'root' THEN 1 
                    WHEN 'rop' THEN 2 
                    ELSE 3 
                END,
                full_name
        `);
        
        const schedules = {};
        for (const rop of rops.rows) {
            const scheduleResult = await pool.query(`
                SELECT days FROM schedules 
                WHERE user_id = $1 AND year = $2 AND month = $3
            `, [rop.id, year, month]);
            
            schedules[rop.id] = {
                days: scheduleResult.rows[0]?.days || Array(new Date(year, month, 0).getDate()).fill('off'),
                full_name: rop.full_name,
                role: rop.role
            };
        }
        
        res.json({
            schedules: schedules,
            daysInMonth: new Date(year, month, 0).getDate()
        });
    } catch (error) {
        console.error('Error fetching ROP schedules:', error);
        res.status(500).json({ error: 'Failed to get ROP schedules' });
    }
});

// Создать служебную точку для РОП (если нет)
app.get('/api/ensure-rop-point', requireRop, async (req, res) => {
    try {
        // Проверяем, есть ли служебная точка
        let point = await pool.query(`
            SELECT id FROM points WHERE name = '🔧 Служебная точка РОП'
        `);
        
        if (point.rows.length === 0) {
            point = await pool.query(`
                INSERT INTO points (name, address) 
                VALUES ('🔧 Служебная точка РОП', 'Служебная точка для руководителей')
                RETURNING id
            `);
        }
        
        const pointId = point.rows[0].id;
        
        // Назначаем всех РОП и root на эту точку
        await pool.query(`
            UPDATE users 
            SET point_id = $1 
            WHERE role IN ('rop', 'root') AND (point_id IS NULL OR point_id != $1)
        `, [pointId]);
        
        res.json({ success: true, pointId: pointId });
    } catch (error) {
        console.error('Error ensuring ROP point:', error);
        res.status(500).json({ error: 'Failed to ensure ROP point' });
    }
});

// Получить все роли (только для root)
app.get('/api/roles', requireRop, async (req, res) => {
    // Только root может управлять ролями
    if (req.session.user.role !== 'root') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    try {
        const result = await pool.query(`
            SELECT r.*, COUNT(u.id) as users_count
            FROM roles r
            LEFT JOIN users u ON u.role_id = r.id
            GROUP BY r.id
            ORDER BY r.level DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

// Создать новую роль
app.post('/api/roles', requireRop, async (req, res) => {
    if (req.session.user.role !== 'root') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const { name, display_name, description, level, permissions } = req.body;
    
    if (!name || !display_name) {
        return res.status(400).json({ error: 'Название и отображаемое имя обязательны' });
    }
    
    try {
        const result = await pool.query(`
            INSERT INTO roles (name, display_name, description, level, permissions)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [name.toLowerCase(), display_name, description || '', level || 0, JSON.stringify(permissions || [])]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ error: 'Failed to create role' });
    }
});

// Обновить роль
app.put('/api/roles/:id', requireRop, async (req, res) => {
    if (req.session.user.role !== 'root') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const { id } = req.params;
    const { display_name, description, level, permissions, is_active } = req.body;
    
    try {
        const result = await pool.query(`
            UPDATE roles 
            SET display_name = COALESCE($1, display_name),
                description = COALESCE($2, description),
                level = COALESCE($3, level),
                permissions = COALESCE($4, permissions),
                is_active = COALESCE($5, is_active)
            WHERE id = $6
            RETURNING *
        `, [display_name, description, level, JSON.stringify(permissions), is_active, id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// Удалить роль (только если нет пользователей с этой ролью)
app.delete('/api/roles/:id', requireRop, async (req, res) => {
    if (req.session.user.role !== 'root') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const { id } = req.params;
    
    try {
        const usersCount = await pool.query('SELECT COUNT(*) FROM users WHERE role_id = $1', [id]);
        if (parseInt(usersCount.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Нельзя удалить роль, у которой есть пользователи' });
        }
        
        await pool.query('DELETE FROM roles WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

// Получить список доступных прав
app.get('/api/permissions', requireRop, async (req, res) => {
    if (req.session.user.role !== 'root') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const permissions = [
        { name: 'view_products', display_name: 'Просмотр товаров', category: 'products' },
        { name: 'edit_products', display_name: 'Редактирование товаров', category: 'products' },
        { name: 'delete_products', display_name: 'Удаление товаров', category: 'products' },
        { name: 'view_schedule', display_name: 'Просмотр графика', category: 'schedule' },
        { name: 'edit_schedule', display_name: 'Редактирование графика', category: 'schedule' },
        { name: 'view_users', display_name: 'Просмотр пользователей', category: 'users' },
        { name: 'edit_users', display_name: 'Редактирование пользователей', category: 'users' },
        { name: 'delete_users', display_name: 'Удаление пользователей', category: 'users' },
        { name: 'view_reports', display_name: 'Просмотр отчетов', category: 'reports' },
        { name: 'manage_quizzes', display_name: 'Управление опросниками', category: 'quizzes' },
        { name: 'manage_points', display_name: 'Управление точками', category: 'points' },
        { name: 'manage_substitutions', display_name: 'Управление подменами', category: 'substitutions' }
    ];
    
    res.json(permissions);
});

// Назначить роль пользователю
app.put('/api/users/:id/role', requireRop, async (req, res) => {
    if (req.session.user.role !== 'root') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const { id } = req.params;
    const { role_id, custom_role } = req.body;
    
    try {
        // Получаем информацию о роли
        let roleInfo = null;
        if (role_id) {
            const roleResult = await pool.query('SELECT name FROM roles WHERE id = $1', [role_id]);
            roleInfo = roleResult.rows[0];
        }
        
        await pool.query(`
            UPDATE users 
            SET role_id = $1, 
                role = COALESCE($2, 'user'),
                custom_role = $3
            WHERE id = $4
        `, [role_id, roleInfo?.name || custom_role || 'user', custom_role, id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error assigning role:', error);
        res.status(500).json({ error: 'Failed to assign role' });
    }
});

// Получить пользователей с их ролями
app.get('/api/users-with-roles', requireRop, async (req, res) => {
    try {
        let result;
        if (req.session.user.role === 'root') {
            result = await pool.query(`
                SELECT u.id, u.username, u.full_name, u.role, u.custom_role, u.position, u.point_id,
                       r.id as role_id, r.display_name as role_display, r.level as role_level,
                       p.name as point_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                LEFT JOIN points p ON u.point_id = p.id
                ORDER BY COALESCE(r.level, 0) DESC, u.full_name
            `);
        } else if (req.session.user.role === 'rop') {
            result = await pool.query(`
                SELECT u.id, u.username, u.full_name, u.role, u.custom_role, u.position, u.point_id,
                       r.id as role_id, r.display_name as role_display,
                       p.name as point_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                LEFT JOIN points p ON u.point_id = p.id
                WHERE u.role = 'user' OR r.level <= 40
                ORDER BY u.full_name
            `);
        } else {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users with roles:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ========== START SERVER ==========
async function startServer() {
    console.log('\n🚀 Starting server...\n');
    const dbReady = await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`\n✅ Server running on port ${PORT}`);
        console.log(`📦 Database: ${dbReady ? 'CONNECTED' : 'NOT CONNECTED'}`);
        console.log(`\n📋 Данные для входа:`);
        console.log(`   👤 Обычный пользователь: пароль 1111`);
        console.log(`   👑 РОП: rop / 1234`);
        console.log(`   👑 ROOT: root / root123`);
        console.log(`\n🔗 URL: http://localhost:${PORT}\n`);
    });
}

startServer();
