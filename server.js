// server.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
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
                phone VARCHAR(50),
                description TEXT,
                schedule_info VARCHAR(255),
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

        // Substitutions (подмены)
        await client.query(`
            CREATE TABLE IF NOT EXISTS substitutions (
                id SERIAL PRIMARY KEY,
                original_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                substitute_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                substitute_point_id INTEGER REFERENCES points(id) ON DELETE SET NULL,
                date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                requested_by INTEGER REFERENCES users(id),
                approved_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                note TEXT,
                UNIQUE(original_user_id, date)
            )
        `);

        // Roles table
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

        // Add role_id to users
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id)`).catch(e => {});
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_role VARCHAR(50)`).catch(e => {});

        // Insert default roles
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

        // Служебная точка для РОП
        const ropPoint = await client.query(`
            SELECT id FROM points WHERE name = '🔧 Служебная точка РОП'
        `);
        
        if (ropPoint.rows.length === 0) {
            await client.query(`
                INSERT INTO points (name, address) 
                VALUES ('🔧 Служебная точка РОП', 'Служебная точка для руководителей')
            `);
            console.log('✅ Created ROP service point');
        }

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

// ========== PROFILE ROUTES ==========
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

// ========== SCHEDULE ROUTES ==========
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

app.get('/api/schedule/point/:pointId/:year/:month', requireRop, async (req, res) => {
    const { pointId, year, month } = req.params;
    
    try {
        const usersResult = await pool.query(`
            SELECT id, full_name, position 
            FROM users 
            WHERE point_id = $1
            ORDER BY full_name
        `, [pointId]);
        
        const daysInMonth = new Date(year, month, 0).getDate();
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
        
        const allUsersResult = await pool.query(`SELECT id, full_name FROM users ORDER BY full_name`);
        
        res.json({
            users: usersResult.rows,
            schedules: schedules,
            daysInMonth: daysInMonth,
            allUsers: allUsersResult.rows
        });
    } catch (error) {
        console.error('Error fetching point schedules:', error);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

app.post('/api/schedule/point/:pointId', requireRop, async (req, res) => {
    const { pointId } = req.params;
    const { year, month, schedules } = req.body;
    
    try {
        for (const [userId, scheduleData] of Object.entries(schedules)) {
            const { days, partner_id } = scheduleData;
            await pool.query(`
                INSERT INTO schedules (user_id, partner_id, year, month, days, updated_by, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id, year, month)
                DO UPDATE SET partner_id = $2, days = $5, updated_by = $6, updated_at = NOW()
            `, [userId, partner_id || null, year, month, JSON.stringify(days), req.session.user.id]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving point schedules:', error);
        res.status(500).json({ error: 'Failed to save schedules' });
    }
});

// ========== POINTS ROUTES ==========
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

// ========== ROP ROUTES ==========
app.get('/api/rop-list', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, full_name, username, role, position,
                   COALESCE(phone, '') as phone,
                   COALESCE(description, '') as description,
                   COALESCE(schedule_info, '') as schedule_info
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

// ========== ROLES ROUTES ==========
app.get('/api/roles', requireRop, async (req, res) => {
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

app.put('/api/users/:id/role', requireRop, async (req, res) => {
    if (req.session.user.role !== 'root') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const { id } = req.params;
    const { role_id, custom_role } = req.body;
    
    try {
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

app.get('/api/users-with-roles', requireRop, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.full_name, u.role, u.custom_role, u.position, u.point_id,
                   r.id as role_id, r.display_name as role_display, r.level as role_level,
                   p.name as point_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN points p ON u.point_id = p.id
            ORDER BY COALESCE(r.level, 0) DESC, u.full_name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users with roles:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ========== LEARNING PROGRESS ==========
app.post('/api/learning/track', requireAuth, async (req, res) => {
    const { page } = req.body;
    const userId = req.session.user.id;
    
    try {
        await pool.query(`
            INSERT INTO learning_progress (user_id, page, completed, completed_at, last_viewed)
            VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, page) 
            DO UPDATE SET completed = TRUE, completed_at = CURRENT_TIMESTAMP, last_viewed = CURRENT_TIMESTAMP
        `, [userId, page]);
        
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

// ========== QUIZZES ==========
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
        const result = await pool.query(`
            INSERT INTO quizzes (title, description, questions, created_by, is_active)
            VALUES ($1, $2, $3, $4, TRUE) RETURNING *
        `, [title, description, JSON.stringify(questions), req.session.user.id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

app.put('/api/quizzes/:id', requireRop, async (req, res) => {
    const { title, description, questions, is_active } = req.body;
    
    try {
        const result = await pool.query(`
            UPDATE quizzes SET title=$1, description=$2, questions=$3, is_active=$4 WHERE id=$5 RETURNING *
        `, [title, description, JSON.stringify(questions), is_active, req.params.id]);
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
        
        await pool.query(`
            INSERT INTO quiz_results (user_id, quiz_id, score, total_questions, answers, completed_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [userId, quizId, score, questions.length, JSON.stringify(answerDetails)]);
        
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
        const result = await pool.query(`
            SELECT * FROM quiz_results 
            WHERE user_id = $1 AND quiz_id = $2 
            ORDER BY completed_at DESC 
            LIMIT 10
        `, [userId, quizId]);
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
            const lastResult = await pool.query(`
                SELECT score, completed_at FROM quiz_results 
                WHERE user_id = $1 AND quiz_id = $2 
                AND completed_at > NOW() - INTERVAL '90 days'
                ORDER BY completed_at DESC LIMIT 1
            `, [userId, quiz.id]);
            
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

// ========== HTML ROUTES ==========
app.get('/login', (req, res) => {
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

// ========== START SERVER ==========
async function startServer() {
    console.log('\n🚀 Starting server...\n');
    const dbReady = await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`\n✅ Server running on port ${PORT}`);
        console.log(`📦 Database: ${dbReady ? 'CONNECTED' : 'NOT CONNECTED'}`);
        console.log(`\n📋 Данные для входа:`);
        console.log(`   👑 ROOT: root / root123`);
        console.log(`\n🔗 URL: http://localhost:${PORT}\n`);
    });
}

startServer();
