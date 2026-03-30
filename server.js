// server.js - полная версия
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

// ========== Создаем таблицы ==========
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

        // Content table for editable content
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

        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                category VARCHAR(50) NOT NULL,
                product_id VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                strength INTEGER DEFAULT 5,
                product_class VARCHAR(20) DEFAULT 'medium',
                origin VARCHAR(255),
                description TEXT,
                photo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(manufacturer_id, name)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS flavors (
                id SERIAL PRIMARY KEY,
                line_id INTEGER REFERENCES lines(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                strength INTEGER DEFAULT 5,
                quality_class VARCHAR(20) DEFAULT 'medium',
                description TEXT,
                photo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            VALUES ('root', 'root123', 'Главный администратор', 'root')
            ON CONFLICT (username) DO NOTHING
        `);

        // Insert default content for hookah page
        await client.query(`
            INSERT INTO content (page, section, content) 
            VALUES ('hookah', 'parts', '{"html":"<div class=\"info-card\" style=\"margin-bottom:16px\"><h3>ℹ️ Что такое кальян</h3><ul><li>Приспособление для курения кальянной смеси</li><li>Охлаждение испарений через воду</li><li>Вода фильтрует испарения от твёрдых частиц</li><li>Охлаждённый пар наносит меньше вреда дыхательным путям</li></ul></div><div class=\"two-col\"><div class=\"info-card\"><h3>🔝 Верхняя часть</h3><ul><li>Экран / Фольга / Калауд</li><li>Чаша (чашка)</li><li>Тарелка (блюдце) для пепла</li><li>Шахта</li><li>Держатель трубки</li></ul></div><div class=\"info-card\"><h3>🔽 Нижняя часть</h3><ul><li>Пружина от перегиба шланга</li><li>Коннектор трубки</li><li>Система фиксации</li><li>Нижняя часть шахты</li><li>Диффузор</li><li>Колба</li><li>Трубка / Шланг</li><li>Клапан</li><li>Мундштук</li></ul></div></div><div class=\"hl info\">Тарелка правильно называется блюдцем. Система фиксации удерживает шахту в колбе.</div>"}')
            ON CONFLICT (page, section) DO NOTHING
        `);

        await client.query(`
            INSERT INTO content (page, section, content) 
            VALUES ('hookah', 'bowls', '{"html":"<div class=\"alert-bar info\"><span>💡</span><span>Разные чаши по-разному раскрывают табак — влияют на крепость и вкус.</span></div><table class=\"ref-table\"><tr><th>Чаша</th><th>Описание</th><th>Для кого</th></tr><tr><td><strong>Турка / Универсальная</strong></td><td>5 отверстий. Классический баланс вкуса и крепости.</td><td>Все категории</td></tr><tr><td><strong>Убивашка</strong></td><td>5 отверстий, особая форма. Плотный дым, усиленная крепость.</td><td>Опытные</td></tr><tr><td><strong>Фанол / Фаннель</strong></td><td>1 центральное отверстие. Максимально чистый вкус.</td><td>Ценители вкуса</td></tr><tr><td><strong>Мелассоуловитель</strong></td><td>Ставится между чашей и шахтой. Собирает лишний сироп.</td><td>Для чистоты</td></tr></table>"}')
            ON CONFLICT (page, section) DO NOTHING
        `);

        await client.query(`
            INSERT INTO content (page, section, content) 
            VALUES ('hookah', 'coal', '{"html":"<table class=\"ref-table\" style=\"margin-bottom:20px\"><tr><th>Инструмент</th><th>Описание</th></tr><tr><td><strong>Щипцы дешёвые</strong></td><td>Короткие, быстро нагреваются, покрытие облезает</td></tr><tr><td><strong>Щипцы дорогие</strong></td><td>Длинные, прочные, надёжная фиксация угля</td></tr><tr><td><strong>Колпак</strong></td><td>Накрывает чашу — помогает разжечься, защищает от ветра</td></tr><tr><td><strong>Печка / Каляница</strong></td><td>Электроплитка для равномерного и быстрого нагрева</td></tr><tr><td><strong>Кадило</strong></td><td>Металлическая ёмкость для переноски раскалённых углей</td></tr><tr><td><strong>Шило / Прокалыватель</strong></td><td>Отверстия в фольге. Также для распределения табака в чаше.</td></tr></table><div class=\"info-card\"><h3>⚫ Размеры углей</h3><ul><li><strong>22 мм</strong> — компактный, для небольших чаш</li><li><strong>25 мм</strong> — стандарт, универсальный</li></ul></div>"}')
            ON CONFLICT (page, section) DO NOTHING
        `);

        await client.query(`
            INSERT INTO content (page, section, content) 
            VALUES ('hookah', 'clean', '{"html":"<table class=\"ref-table\"><tr><th>Аксессуар</th><th>Применение</th></tr><tr><td><strong>Уплотнитель для колбы</strong></td><td>Резиновое кольцо на горлышко колбы — герметичность</td></tr><tr><td><strong>Уплотнитель для чаши</strong></td><td>Резиновое кольцо на шахту — герметичность</td></tr><tr><td><strong>Ёршик для колбы</strong></td><td>Широкий, с изогнутой ручкой</td></tr><tr><td><strong>Ёршик для шахты</strong></td><td>Длинный и узкий — прочищает внутренние каналы</td></tr><tr><td><strong>Пружина для шланга</strong></td><td>Надевается на основание шланга — предотвращает перегиб</td></tr><tr><td><strong>Сетка на кальян</strong></td><td>Защитный экран от опрокидывания (животные, дети)</td></tr></table>"}')
            ON CONFLICT (page, section) DO NOTHING
        `);

        await client.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS product_class VARCHAR(20) DEFAULT 'medium'
        `);

        await client.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS quality_class VARCHAR(20) DEFAULT 'medium'
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
    secret: process.env.SESSION_SECRET || 'spravochnik_secret_key_2024',
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
    console.log('✅ Cloudinary configured');
}

// ========== Multer ==========
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ========== MIDDLEWARE ==========
app.use((req, res, next) => {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
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
    if (req.session.user && (req.session.user.role === 'rop' || req.session.user.role === 'root')) {
        next();
    } else {
        res.status(403).json({ error: 'ROP only' });
    }
}

function requireRoot(req, res, next) {
    if (req.session.user && req.session.user.role === 'root') {
        next();
    } else {
        res.status(403).json({ error: 'Root only' });
    }
}

// ========== STATIC FILES ==========
app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/core.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'core.js'));
});

// ========== AUTH ROUTES ==========

app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/main.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.js'));
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

// ========== USER MANAGEMENT ==========

app.get('/api/users', async (req, res) => {
    if (!req.session.user) {
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
    
    if (!req.session.user) {
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
    
    if (!req.session.user || (req.session.user.role !== 'root' && req.session.user.role !== 'rop')) {
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

// ========== CONTENT MANAGEMENT API ==========

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
    const { id, name, strength, product_class, origin, desc, photoUrl } = req.body;
    
    const result = await pool.query(
        `INSERT INTO products (category, product_id, name, strength, product_class, origin, description, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (product_id) DO UPDATE SET
           name = EXCLUDED.name, 
           strength = EXCLUDED.strength,
           product_class = EXCLUDED.product_class,
           origin = EXCLUDED.origin, 
           description = EXCLUDED.description,
           photo_url = EXCLUDED.photo_url
         RETURNING *`,
        [category, id, name, strength || 5, product_class || 'medium', origin, desc, photoUrl]
    );
    res.json(result.rows[0]);
});

app.put('/api/products/:category/:id', requireRop, async (req, res) => {
    const { category, id } = req.params;
    const { name, strength, product_class, origin, desc, photoUrl } = req.body;
    
    const result = await pool.query(
        `UPDATE products 
         SET name=$1, strength=$2, product_class=$3, origin=$4, description=$5, photo_url=$6
         WHERE category=$7 AND product_id=$8 RETURNING *`,
        [name, strength || 5, product_class || 'medium', origin, desc, photoUrl, category, id]
    );
    res.json(result.rows[0]);
});

// ========== HTML ROUTES ==========

app.get('/login.html', (req, res) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/index.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/tobacco.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'tobacco.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/liquids.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'liquids.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/snus.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'snus.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/hookah.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'hookah.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/sales.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'sales.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/checks.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'checks.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/cash.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'cash.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/disposables.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'disposables.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

// ========== MANUFACTURERS ROUTES ==========

app.get('/api/manufacturers', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM manufacturers ORDER BY name'
        );
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
    console.log('Creating line:', { manufacturer_id, name, description, strength_color });
    
    if (!manufacturer_id || !name) {
        return res.status(400).json({ error: 'Manufacturer ID and name are required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO lines (manufacturer_id, name, description, strength_color) VALUES ($1, $2, $3, $4) RETURNING *',
            [manufacturer_id, name, description || '', strength_color || 'medium']
        );
        console.log('Line created:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create line error:', error);
        res.status(500).json({ error: 'Failed to create line: ' + error.message });
    }
});

app.put('/api/lines/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { name, description, strength_color } = req.body;
    console.log('Updating line:', { id, name, description, strength_color });
    
    try {
        const result = await pool.query(
            'UPDATE lines SET name = $1, description = $2, strength_color = $3 WHERE id = $4 RETURNING *',
            [name, description || '', strength_color || 'medium', id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Line not found' });
        }
        console.log('Line updated:', result.rows[0]);
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

// ========== FLAVORS ROUTES ==========

// Создать вкус (ROP only)
app.post('/api/flavors', requireRop, async (req, res) => {
    const { line_id, name, strength, quality_class, description, photo_url } = req.body;
    if (!line_id || !name) {
        return res.status(400).json({ error: 'Line ID and name are required' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO flavors (line_id, name, strength, quality_class, description, photo_url) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [line_id, name, strength || 5, quality_class || 'medium', description, photo_url]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create flavor error:', error);
        res.status(500).json({ error: 'Failed to create flavor' });
    }
});

// Обновить вкус (ROP only)
app.put('/api/flavors/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    const { name, strength, quality_class, description, photo_url } = req.body;
    try {
        const result = await pool.query(
            `UPDATE flavors SET name = $1, strength = $2, quality_class = $3, description = $4, photo_url = $5 
             WHERE id = $6 RETURNING *`,
            [name, strength, quality_class, description, photo_url, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update flavor error:', error);
        res.status(500).json({ error: 'Failed to update flavor' });
    }
});

// Удалить вкус (ROP only)
app.delete('/api/flavors/:id', requireRop, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM flavors WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete flavor error:', error);
        res.status(500).json({ error: 'Failed to delete flavor' });
    }
});

// ========== START SERVER ==========
async function start() {
    await initTables();
    
    app.listen(PORT, () => {
        console.log(`\n✅ Server running on http://localhost:${PORT}`);
        console.log(`\n📋 Данные для входа:`);
        console.log(`   👤 Обычный пользователь: пароль 1111`);
        console.log(`   👑 РОП: rop / 1234`);
        console.log(`   👑 ROOT: root / root123`);
        console.log(`\n🌐 Open: http://localhost:${PORT}\n`);
    });
}

start();
