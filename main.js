// Добавьте в server.js (если еще нет)

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
        console.log('Content saved successfully');
        res.json({ success: true });
    } catch (error) {
        console.error('Save content error:', error);
        res.status(500).json({ error: 'Failed to save content: ' + error.message });
    }
});
