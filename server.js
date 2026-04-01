// server-debug.js - упрощенная версия для отладки сессии
const express = require('express');
const path = require('path');
const session = require('express-session');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('\n🔧 DEBUG MODE - Testing session\n');

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
    });
}

async function initDatabase() {
    pool = initPool();
    if (!pool) return false;
    
    try {
        const client = await pool.connect();
        console.log('✅ Database connected');
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user'
            )
        `);
        
        await client.query(`
            INSERT INTO users (username, password, full_name, role) 
            VALUES ('user', '1111', 'Обычный пользователь', 'user')
            ON CONFLICT (username) DO NOTHING
        `);
        
        client.release();
        console.log('✅ Database ready');
        return true;
    } catch (error) {
        console.error('Database error:', error.message);
        return false;
    }
}

// ========== MIDDLEWARE ==========
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ========== САМАЯ ПРОСТАЯ СЕССИЯ ==========
app.use(session({
    secret: 'debug_secret_key',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    },
    name: 'debug_sid'
}));

// Логируем все запросы
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} | Session ID: ${req.sessionID?.substring(0, 10)}... | User: ${req.session?.user?.username || 'none'}`);
    next();
});

// ========== ТЕСТОВЫЕ ЭНДПОИНТЫ ==========

// 1. Проверка сессии (всегда доступен)
app.get('/api/debug-session', (req, res) => {
    res.json({
        sessionId: req.sessionID,
        session: req.session,
        user: req.session?.user || null,
        cookie: req.headers.cookie || 'none'
    });
});

// 2. Установка тестовой сессии
app.post('/api/debug-set-session', (req, res) => {
    req.session.test = { value: 'test', time: Date.now() };
    req.session.save(() => {
        res.json({ success: true, sessionId: req.sessionID });
    });
});

// 3. Простой логин (без пароля - только для теста)
app.post('/api/debug-login', (req, res) => {
    req.session.user = {
        id: 1,
        username: 'test_user',
        full_name: 'Тестовый Пользователь',
        role: 'user'
    };
    req.session.save(() => {
        console.log('✅ Test user logged in');
        res.json({ success: true, user: req.session.user });
    });
});

// 4. Простой логаут
app.post('/api/debug-logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// 5. Защищенный эндпоинт для теста
app.get('/api/debug-protected', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// ========== СТАТИЧЕСКИЕ ФАЙЛЫ ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'debug.html'));
});

app.get('/debug.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'debug.html'));
});

// ========== ЗАПУСК ==========
async function start() {
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`\n✅ Debug server on port ${PORT}`);
        console.log(`🔗 http://localhost:${PORT}/debug.html\n`);
    });
}

start();
