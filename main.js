// main.js - полная версия
let isRop = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js loaded');
    initTabs();
    initAccordionsToDetails();
    initSearch();
    loadUserInfo();
    setupLogout();
    setupRopPanel();
});

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.removeEventListener('click', handleTabClick);
        btn.addEventListener('click', handleTabClick);
    });
}

function handleTabClick(e) {
    const btn = e.currentTarget;
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const sec = document.getElementById(target);
    if (sec) sec.classList.add('active');
}

function initAccordionsToDetails() {
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(acc => {
        if (!acc.classList.contains('converted')) {
            const header = acc.querySelector('.acc-header');
            const body = acc.querySelector('.acc-body');
            if (header && body) {
                const title = header.querySelector('.acc-title')?.innerHTML || '';
                const details = document.createElement('details');
                const summary = document.createElement('summary');
                summary.innerHTML = title;
                summary.style.cssText = 'cursor: pointer; padding: 12px 16px; font-weight: 600; color: var(--accent); list-style: none; display: flex; justify-content: space-between; align-items: center;';
                summary.innerHTML = title + '<span style="font-size: 12px;">▼</span>';
                details.appendChild(summary);
                details.appendChild(body.cloneNode(true));
                details.style.cssText = 'background: var(--surface); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px;';
                details.open = acc.classList.contains('open');
                acc.parentNode.replaceChild(details, acc);
                details.classList.add('converted');
            }
        }
    });
    
    const details = document.querySelectorAll('details');
    details.forEach(detail => {
        const summary = detail.querySelector('summary');
        if (summary && !detail.hasAttribute('data-initialized')) {
            summary.removeEventListener('click', handleDetailsClick);
            summary.addEventListener('click', handleDetailsClick);
            detail.setAttribute('data-initialized', 'true');
        }
    });
}

function handleDetailsClick(e) {
    e.preventDefault();
    const detail = e.currentTarget.closest('details');
    if (detail) detail.open = !detail.open;
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.removeEventListener('input', handleSearch);
        searchInput.addEventListener('input', handleSearch);
    }
}

function handleSearch(e) {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('[data-searchable]').forEach(el => {
        if (el.textContent.toLowerCase().includes(val)) {
            el.classList.remove('search-hidden');
        } else {
            el.classList.add('search-hidden');
        }
    });
}

async function loadUserInfo() {
    try {
        const response = await fetch('/api/check-auth', { credentials: 'include' });
        const data = await response.json();
        
        const userNameSpan = document.getElementById('userName');
        const ropBtn = document.getElementById('ropBtn');
        
        if (data.authenticated) {
            if (userNameSpan) userNameSpan.textContent = data.user.full_name;
            isRop = (data.user.role === 'rop' || data.user.role === 'root');
            window.isRopGlobal = isRop;
            setupEditButtons();
            if (ropBtn) ropBtn.style.display = isRop ? 'block' : 'none';
            
            // ДОБАВЬТЕ ЭТУ СТРОКУ:
            setupEditButtons();
            
            const addBtn = document.querySelector('.btn-add');
            if (addBtn) addBtn.style.display = isRop ? 'flex' : 'none';
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login.html';
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.removeEventListener('click', handleLogout);
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login.html';
}

function setupRopPanel() {
    const ropBtn = document.getElementById('ropBtn');
    if (ropBtn) {
        ropBtn.removeEventListener('click', handleRopPanel);
        ropBtn.addEventListener('click', handleRopPanel);
    }
}

async function handleRopPanel() {
    await openRopPanel();
}

function setupEditButtons() {
    // Находим все кнопки редактирования на странице
    const editBtns = document.querySelectorAll('.btn-edit-content');
    console.log('Found edit buttons:', editBtns.length);
    
    editBtns.forEach(btn => {
        // Удаляем старые обработчики
        btn.removeEventListener('click', handleEditClick);
        // Добавляем новый
        btn.addEventListener('click', handleEditClick);
        // Показываем кнопку если РОП
        btn.style.display = isRop ? 'inline-flex' : 'none';
        console.log('Edit button for:', btn.dataset.page, btn.dataset.section, 'display:', btn.style.display);
    });
}

function handleEditClick(e) {
    const btn = e.currentTarget;
    const page = btn.dataset.page;
    const section = btn.dataset.section;
    console.log('Edit clicked:', page, section);
    openVisualEditor(page, section);
}

// Обновляем openVisualEditor для работы с любыми страницами
function openVisualEditor(page, section) {
    const contentDiv = document.getElementById(`${section}-content`);
    if (!contentDiv) {
        console.error('Content div not found:', `${section}-content`);
        return;
    }
    
    const existingModal = document.getElementById('visualEditorModal');
    if (existingModal) existingModal.remove();
    
    const currentHtml = contentDiv.innerHTML;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'visualEditorModal';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
        <div class="modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <span class="modal-title">✏️ Редактировать: ${getSectionTitle(section)}</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="editor-toolbar">
                    <button class="tool-btn" data-action="add-text">📝 Добавить текст</button>
                    <button class="tool-btn" data-action="add-list">📋 Добавить список</button>
                    <button class="tool-btn" data-action="add-numbered-list">🔢 Нумерованный список</button>
                    <button class="tool-btn" data-action="add-table">📊 Добавить таблицу</button>
                    <button class="tool-btn" data-action="add-alert">⚠️ Предупреждение</button>
                    <button class="tool-btn" data-action="add-note">💡 Примечание</button>
                    <button class="tool-btn" data-action="add-dropdown">📁 Выпадающий список</button>
                    <button class="tool-btn" data-action="add-card">🃏 Карточка</button>
                    <button class="tool-btn" data-action="add-quiz">📋 Опросник</button>
                </div>
                <div class="editor-area" id="editorArea">
                    <textarea id="contentEditor" style="width:100%; min-height:400px; font-family:monospace; font-size:13px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 12px; color: var(--text);">${escapeHtml(currentHtml)}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel">Отмена</button>
                <button class="btn-save">💾 Сохранить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);
    
    const textarea = modal.querySelector('#contentEditor');
    
    const toolBtns = modal.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            addHtmlToEditor(textarea, action);
        });
    });
    
    const closeModal = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    modal.querySelector('.btn-save').addEventListener('click', async () => {
        const newContent = textarea.value;
        
        let url = `/api/content/${page}/${section}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: newContent })
            });
            
            if (response.ok) {
                contentDiv.innerHTML = newContent;
                alert('✅ Сохранено успешно!');
                closeModal();
                if (typeof initAccordionsToDetails === 'function') {
                    initAccordionsToDetails();
                }
            } else {
                alert('❌ Ошибка сохранения');
            }
        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
        }
    });
}

function addMoveButtonsToEditor(textarea) {
    // Разбиваем текст на блоки (по пустым строкам или по HTML тегам)
    let html = textarea.value;
    
    // Простой способ: разбиваем по закрывающим тегам
    const blocks = [];
    let currentBlock = '';
    let depth = 0;
    
    for (let i = 0; i < html.length; i++) {
        currentBlock += html[i];
        if (html[i] === '<') {
            depth++;
        } else if (html[i] === '>') {
            depth--;
            if (depth === 0 && (html[i+1] === '\n' || html[i+1] === '\r' || i === html.length-1)) {
                blocks.push(currentBlock);
                currentBlock = '';
                i++;
            }
        }
    }
    if (currentBlock) blocks.push(currentBlock);
    
    if (blocks.length <= 1) return;
    
    // Создаем визуальное представление с кнопками перемещения
    let blocksHtml = '';
    blocks.forEach((block, index) => {
        const isFirst = index === 0;
        const isLast = index === blocks.length - 1;
        
        blocksHtml += `
            <div class="movable-block" data-index="${index}" style="position: relative; margin-bottom: 16px; border-left: 3px solid var(--accent); padding-left: 12px;">
                <div style="position: absolute; right: 0; top: 0; display: flex; gap: 4px; background: var(--surface2); border-radius: 6px; padding: 2px;">
                    ${!isFirst ? '<button class="move-up-btn" data-index="' + index + '" style="background: var(--accent-glow); border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer;">↑</button>' : '<span style="width: 24px;"></span>'}
                    ${!isLast ? '<button class="move-down-btn" data-index="' + index + '" style="background: var(--accent-glow); border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer;">↓</button>' : '<span style="width: 24px;"></span>'}
                </div>
                <pre style="white-space: pre-wrap; margin: 0; padding-right: 50px;">${escapeHtml(block)}</pre>
            </div>
        `;
    });
    
    // Заменяем textarea на визуальное представление
    const editorArea = document.querySelector('#editorArea');
    if (editorArea) {
        editorArea.innerHTML = blocksHtml;
        
        // Добавляем обработчики для кнопок перемещения
        document.querySelectorAll('.move-up-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                if (index > 0) {
                    [blocks[index], blocks[index-1]] = [blocks[index-1], blocks[index]];
                    updateTextareaFromBlocks(textarea, blocks);
                    addMoveButtonsToEditor(textarea);
                }
            });
        });
        
        document.querySelectorAll('.move-down-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                if (index < blocks.length - 1) {
                    [blocks[index], blocks[index+1]] = [blocks[index+1], blocks[index]];
                    updateTextareaFromBlocks(textarea, blocks);
                    addMoveButtonsToEditor(textarea);
                }
            });
        });
    }
}

function updateTextareaFromBlocks(textarea, blocks) {
    textarea.value = blocks.join('\n');
}

function updateTextareaFromBlocks(textarea, blocks) {
    textarea.value = blocks.join('\n');
}

function addHtmlToEditor(textarea, action) {
    let html = '';
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    
    switch(action) {
        case 'add-text':
            html = '<div>Новый текст</div>\n';
            break;
        case 'add-list':
            html = '<ul>\n  <li>Пункт списка</li>\n  <li>Пункт списка</li>\n</ul>\n';
            break;
        case 'add-numbered-list':
            html = '<div class="steps">\n  <div class="step">\n    <div class="step-num">1</div>\n    <div class="step-body">\n      <strong>Заголовок</strong>\n      <span>Описание</span>\n    </div>\n  </div>\n</div>\n';
            break;
        case 'add-table':
            html = '<table class="ref-table">\n  <thead>\n      <tr><th>Заголовок 1</th><th>Заголовок 2</th></tr>\n  </thead>\n  <tbody>\n      <tr><td>Данные 1</td><td>Данные 2</td></tr>\n  </tbody>\n</table>\n';
            break;
        case 'add-alert':
            html = '<div class="alert-bar info">\n  <span>ℹ️</span>\n  <span>Текст предупреждения</span>\n</div>\n';
            break;
        case 'add-note':
            html = '<div class="hl info">Текст примечания</div>\n';
            break;
        case 'add-dropdown':
            html = '<details>\n  <summary>Заголовок</summary>\n  <div class="acc-body">Содержимое</div>\n</details>\n';
            break;
        case 'add-card':
            html = '<div class="info-card">\n  <h3>Заголовок</h3>\n  <ul>\n    <li>Пункт 1</li>\n    <li>Пункт 2</li>\n  </ul>\n</div>\n';
            break;
        case 'add-quiz':
            html = '<div class="quiz-block">\n  <div class="quiz-title">📋 Опросник</div>\n  <div class="quiz-question">\n    <div class="quiz-question-text">Вопрос?</div>\n    <div class="quiz-options">\n      <label class="quiz-option"><input type="radio" name="q1"><span>Ответ 1</span></label>\n      <label class="quiz-option"><input type="radio" name="q1"><span>Ответ 2</span></label>\n    </div>\n    <div class="quiz-answer"></div>\n  </div>\n  <button class="quiz-btn" onclick="checkQuiz(this)">✅ Проверить</button>\n  <div class="quiz-result"></div>\n</div>\n';
            break;
    }
    
    textarea.value = text.slice(0, cursorPos) + html + text.slice(cursorPos);
    textarea.focus();
    textarea.setSelectionRange(cursorPos + html.length, cursorPos + html.length);
}

function getSectionTitle(section) {
    const titles = {
        'parts': 'Комплектация кальяна', 'bowls': 'Чаши', 'coal': 'Уголь и управление', 'clean': 'Обслуживание и чистка',
        'info': 'Общая информация', 'alternatives': 'Альтернативы', 'coils': 'Совместимость испарителей',
        'howto': 'Как применять', 'formats': 'Форматы паучей', 'strength': 'Классификация по крепости',
        'returns': 'Возврат картриджа', 'price': 'Отработка возражения по цене', 'color': 'Цвет жидкости',
        'upsell': 'Добивание комбо', 'official': 'Официальная инструкция', 'practical': 'Практические советы',
        'after': 'По окончании проверки', 'types': 'Типы товаров', 'qr': 'Работа с QR-кодами',
        'register': 'Кассовый аппарат', 'syrye': 'Типы сырья', 'tips': 'Советы продавцу', 'guide': 'Гид по брендам'
    };
    return titles[section] || section;
}

function getSectionTitle(section) {
    const titles = {
        'parts': 'Комплектация кальяна', 'bowls': 'Чаши', 'coal': 'Уголь и управление', 'clean': 'Обслуживание и чистка',
        'info': 'Общая информация', 'alternatives': 'Альтернативы', 'coils': 'Совместимость испарителей',
        'howto': 'Как применять', 'formats': 'Форматы паучей', 'strength': 'Классификация по крепости',
        'returns': 'Возврат картриджа', 'price': 'Отработка возражения по цене', 'color': 'Цвет жидкости',
        'upsell': 'Добивание комбо', 'official': 'Официальная инструкция', 'practical': 'Практические советы',
        'after': 'По окончании проверки', 'types': 'Типы товаров', 'qr': 'Работа с QR-кодами',
        'register': 'Кассовый аппарат', 'syrye': 'Типы сырья', 'tips': 'Советы продавцу', 'guide': 'Гид по брендам',
        'day1': 'День 1: Основы', 'day2': 'День 2: Кальянная тематика', 'day3': 'День 3: Касса и маркировка',
        'day4': 'День 4: Закрепление', 'scripts': 'Скрипты продаж', 'security': 'Безопасность'
    };
    return titles[section] || section;
}

function parseContentToEditor(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    let result = '';
    
    const elements = tempDiv.children;
    for (let i = 0; i < elements.length; i++) {
        result += convertElementToEditorItem(elements[i]);
    }
    return result || '<div class="editor-empty">Нажмите кнопку выше, чтобы добавить элемент</div>';
}

function convertElementToEditorItem(el) {
    const className = el.className;
    const tagName = el.tagName.toLowerCase();
    
    if (tagName === 'details') {
        const title = el.querySelector('summary')?.innerHTML.replace(/<span.*<\/span>/, '').trim() || '';
        const content = Array.from(el.querySelectorAll(':scope > :not(summary)')).map(c => c.outerHTML).join('');
        return `
            <div class="editor-item dropdown-item" data-type="dropdown">
                <div class="editor-item-header"><span>📁 Выпадающий список</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <input type="text" class="dropdown-title" placeholder="Заголовок" value="${escapeHtml(title)}">
                    <div class="rich-editor-container">
                        <div class="format-toolbar">
                            <button class="format-btn" data-format="bold"><b>B</b></button>
                            <button class="format-btn" data-format="italic"><i>I</i></button>
                            <button class="format-btn" data-format="underline"><u>U</u></button>
                            <button class="format-btn" data-format="h3">H3</button>
                            <button class="format-btn" data-format="insertUnorderedList">• Список</button>
                            <button class="format-btn" data-format="insertOrderedList">1. Нумер.</button>
                        </div>
                        <div class="rich-editor" contenteditable="true">${content}</div>
                    </div>
                </div>
            </div>
        `;
    }
    else if (className.includes('info-card')) {
        const title = el.querySelector('h3')?.innerHTML || '';
        const items = Array.from(el.querySelectorAll('ul li')).map(li => li.innerHTML).join('\n');
        return `
            <div class="editor-item card-item" data-type="card">
                <div class="editor-item-header"><span>🃏 Карточка</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <input type="text" class="card-title" placeholder="Заголовок" value="${escapeHtml(title)}">
                    <div class="list-editor" data-type="unordered">
                        <div class="list-items">${items.split('\n').filter(i => i.trim()).map(item => `<div class="list-item"><input type="text" value="${escapeHtml(item)}" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div>`).join('')}</div>
                        <button class="add-list-item">➕ Добавить пункт</button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (tagName === 'table') {
        const rows = [];
        const trs = el.querySelectorAll('tr');
        trs.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('th, td')).map(cell => cell.innerHTML);
            rows.push(cells);
        });
        return `
            <div class="editor-item table-item" data-type="table">
                <div class="editor-item-header"><span>📊 Таблица</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <div class="table-editor" data-rows='${JSON.stringify(rows)}'></div>
                    <div class="table-buttons">
                        <button class="add-table-row">➕ Добавить строку</button>
                        <button class="add-table-col">➕ Добавить столбец</button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (className.includes('alert-bar')) {
        const text = el.querySelector('span:last-child')?.innerHTML || el.innerHTML;
        const type = className.includes('danger') ? 'danger' : (className.includes('success') ? 'success' : 'info');
        return `
            <div class="editor-item alert-item" data-type="alert">
                <div class="editor-item-header"><span>⚠️ Предупреждение</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <select class="alert-type">
                        <option value="danger" ${type === 'danger' ? 'selected' : ''}>🔴 Важное</option>
                        <option value="success" ${type === 'success' ? 'selected' : ''}>🟢 Успех</option>
                        <option value="info" ${type === 'info' ? 'selected' : ''}>🔵 Информация</option>
                    </select>
                    <textarea class="alert-text" rows="2" placeholder="Текст">${escapeHtml(text)}</textarea>
                </div>
            </div>
        `;
    }
    else if (className.includes('hl')) {
        const text = el.innerHTML;
        const type = className.includes('warn') ? 'warn' : (className.includes('ok') ? 'ok' : 'info');
        return `
            <div class="editor-item note-item" data-type="note">
                <div class="editor-item-header"><span>💡 Примечание</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <select class="note-type">
                        <option value="info" ${type === 'info' ? 'selected' : ''}>📘 Обычное</option>
                        <option value="ok" ${type === 'ok' ? 'selected' : ''}>✅ Успех</option>
                        <option value="warn" ${type === 'warn' ? 'selected' : ''}>⚠️ Важное</option>
                    </select>
                    <textarea class="note-text" rows="2" placeholder="Текст">${escapeHtml(text)}</textarea>
                </div>
            </div>
        `;
    }
    else if (className.includes('steps') || (el.querySelector('.step') && el.querySelector('.step-num'))) {
        const steps = [];
        const stepDivs = el.querySelectorAll('.step');
        stepDivs.forEach(step => {
            const num = step.querySelector('.step-num')?.textContent.trim() || '';
            const title = step.querySelector('.step-body strong')?.innerHTML || '';
            const desc = step.querySelector('.step-body span')?.innerHTML || '';
            steps.push({ num, title, desc });
        });
        let stepsHtml = '';
        steps.forEach((step, idx) => {
            stepsHtml += `
                <div class="step-item">
                    <div class="step-header"><span class="step-num-display">${step.num || idx+1}</span><input type="text" class="step-title" value="${escapeHtml(step.title)}" placeholder="Заголовок"></div>
                    <textarea class="step-desc" rows="2" placeholder="Описание">${escapeHtml(step.desc)}</textarea>
                    <button class="remove-step-btn">🗑 Удалить шаг</button>
                </div>
            `;
        });
        return `
            <div class="editor-item steps-item" data-type="steps">
                <div class="editor-item-header"><span>🔢 Нумерованный список</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <div class="steps-editor">${stepsHtml}</div>
                    <button class="add-step-btn">➕ Добавить шаг</button>
                </div>
            </div>
        `;
    }
    else if (className.includes('quiz-block')) {
        const questions = [];
        const questionDivs = el.querySelectorAll('.quiz-question');
        questionDivs.forEach(q => {
            const text = q.querySelector('.quiz-question-text')?.textContent.trim() || '';
            const options = [];
            const optionSpans = q.querySelectorAll('.quiz-option span');
            optionSpans.forEach(opt => options.push(opt.textContent.trim()));
            const correct = q.querySelector('input[type="radio"]:checked')?.value || 0;
            if (text && options.length) {
                questions.push({ text, options, correct: parseInt(correct) });
            }
        });
        return `
            <div class="editor-item quiz-item" data-type="quiz">
                <div class="editor-item-header"><span>📋 Опросник</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <div class="quiz-editor" data-questions='${JSON.stringify(questions)}'></div>
                    <button class="add-quiz-question">➕ Добавить вопрос</button>
                </div>
            </div>
        `;
    }
    else if (el.querySelector('ul') && !className.includes('info-card')) {
        const items = Array.from(el.querySelectorAll('li')).map(li => li.innerHTML);
        return `
            <div class="editor-item list-item" data-type="list">
                <div class="editor-item-header"><span>📋 Маркированный список</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <div class="list-editor" data-type="unordered">
                        <div class="list-items">${items.map(item => `<div class="list-item"><input type="text" value="${escapeHtml(item)}" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div>`).join('')}</div>
                        <button class="add-list-item">➕ Добавить пункт</button>
                    </div>
                </div>
            </div>
        `;
    }
    else {
        return `
            <div class="editor-item text-item" data-type="text">
                <div class="editor-item-header"><span>📝 Текст</span><button class="remove-editor-item">🗑</button></div>
                <div class="editor-item-content">
                    <div class="rich-editor-container">
                        <div class="format-toolbar">
                            <button class="format-btn" data-format="bold"><b>B</b></button>
                            <button class="format-btn" data-format="italic"><i>I</i></button>
                            <button class="format-btn" data-format="underline"><u>U</u></button>
                            <button class="format-btn" data-format="h3">H3</button>
                            <button class="format-btn" data-format="insertUnorderedList">• Список</button>
                            <button class="format-btn" data-format="insertOrderedList">1. Нумер.</button>
                        </div>
                        <div class="rich-editor" contenteditable="true">${el.innerHTML}</div>
                    </div>
                </div>
            </div>
        `;
    }
}

function addElementToEditor(editorArea, type) {
    let html = '';
    
    switch(type) {
        case 'add-text':
            html = `
                <div class="editor-item text-item" data-type="text">
                    <div class="editor-item-header"><span>📝 Текст</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <div class="rich-editor-container">
                            <div class="format-toolbar">
                                <button class="format-btn" data-format="bold"><b>B</b></button>
                                <button class="format-btn" data-format="italic"><i>I</i></button>
                                <button class="format-btn" data-format="underline"><u>U</u></button>
                                <button class="format-btn" data-format="h3">H3</button>
                                <button class="format-btn" data-format="insertUnorderedList">• Список</button>
                                <button class="format-btn" data-format="insertOrderedList">1. Нумер.</button>
                            </div>
                            <div class="rich-editor" contenteditable="true"></div>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'add-list':
            html = `
                <div class="editor-item list-item" data-type="list">
                    <div class="editor-item-header"><span>📋 Маркированный список</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <div class="list-editor" data-type="unordered">
                            <div class="list-items"><div class="list-item"><input type="text" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div></div>
                            <button class="add-list-item">➕ Добавить пункт</button>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'add-numbered-list':
            html = `
                <div class="editor-item steps-item" data-type="steps">
                    <div class="editor-item-header"><span>🔢 Нумерованный список</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <div class="steps-editor">
                            <div class="step-item">
                                <div class="step-header"><span class="step-num-display">1</span><input type="text" class="step-title" placeholder="Заголовок"></div>
                                <textarea class="step-desc" rows="2" placeholder="Описание"></textarea>
                                <button class="remove-step-btn">🗑 Удалить шаг</button>
                            </div>
                        </div>
                        <button class="add-step-btn">➕ Добавить шаг</button>
                    </div>
                </div>
            `;
            break;
        case 'add-table':
            html = `
                <div class="editor-item table-item" data-type="table">
                    <div class="editor-item-header"><span>📊 Таблица</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <div class="table-editor" data-rows='[["Заголовок 1", "Заголовок 2"], ["Данные 1", "Данные 2"]]'></div>
                        <div class="table-buttons">
                            <button class="add-table-row">➕ Добавить строку</button>
                            <button class="add-table-col">➕ Добавить столбец</button>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'add-alert':
            html = `
                <div class="editor-item alert-item" data-type="alert">
                    <div class="editor-item-header"><span>⚠️ Предупреждение</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <select class="alert-type">
                            <option value="danger">🔴 Важное</option>
                            <option value="success">🟢 Успех</option>
                            <option value="info">🔵 Информация</option>
                        </select>
                        <textarea class="alert-text" rows="2" placeholder="Текст"></textarea>
                    </div>
                </div>
            `;
            break;
        case 'add-note':
            html = `
                <div class="editor-item note-item" data-type="note">
                    <div class="editor-item-header"><span>💡 Примечание</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <select class="note-type">
                            <option value="info">📘 Обычное</option>
                            <option value="ok">✅ Успех</option>
                            <option value="warn">⚠️ Важное</option>
                        </select>
                        <textarea class="note-text" rows="2" placeholder="Текст"></textarea>
                    </div>
                </div>
            `;
            break;
        case 'add-dropdown':
            html = `
                <div class="editor-item dropdown-item" data-type="dropdown">
                    <div class="editor-item-header"><span>📁 Выпадающий список</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <input type="text" class="dropdown-title" placeholder="Заголовок">
                        <div class="rich-editor-container">
                            <div class="format-toolbar">
                                <button class="format-btn" data-format="bold"><b>B</b></button>
                                <button class="format-btn" data-format="italic"><i>I</i></button>
                                <button class="format-btn" data-format="underline"><u>U</u></button>
                                <button class="format-btn" data-format="h3">H3</button>
                                <button class="format-btn" data-format="insertUnorderedList">• Список</button>
                                <button class="format-btn" data-format="insertOrderedList">1. Нумер.</button>
                            </div>
                            <div class="rich-editor" contenteditable="true"></div>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'add-card':
            html = `
                <div class="editor-item card-item" data-type="card">
                    <div class="editor-item-header"><span>🃏 Карточка</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <input type="text" class="card-title" placeholder="Заголовок">
                        <div class="list-editor" data-type="unordered">
                            <div class="list-items"><div class="list-item"><input type="text" placeholder="Пункт списка"><button class="remove-list-item">✕</button></div></div>
                            <button class="add-list-item">➕ Добавить пункт</button>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'add-quiz':
            html = `
                <div class="editor-item quiz-item" data-type="quiz">
                    <div class="editor-item-header"><span>📋 Опросник</span><button class="remove-editor-item">🗑</button></div>
                    <div class="editor-item-content">
                        <div class="quiz-editor" data-questions='[]'></div>
                        <button class="add-quiz-question">➕ Добавить вопрос</button>
                    </div>
                </div>
            `;
            break;
    }
    
    const emptyMsg = editorArea.querySelector('.editor-empty');
    if (emptyMsg) emptyMsg.remove();
    
    editorArea.insertAdjacentHTML('beforeend', html);
    setupRemoveButtons(editorArea);
    setupRichEditors(editorArea);
    setupListEditors(editorArea);
    setupStepsEditors(editorArea);
    setupQuizEditors(editorArea);
    
    const newTable = editorArea.querySelector('.table-item:last-child .table-editor');
    if (newTable) initTableEditor(newTable);
}

function setupRichEditors(container) {
    const richEditors = container.querySelectorAll('.rich-editor');
    richEditors.forEach(editor => {
        const toolbar = editor.closest('.rich-editor-container')?.querySelector('.format-toolbar');
        if (toolbar) {
            toolbar.querySelectorAll('.format-btn').forEach(btn => {
                btn.removeEventListener('click', handleFormatClick);
                btn.addEventListener('click', handleFormatClick);
            });
        }
    });
}

function handleFormatClick(e) {
    e.preventDefault();
    const format = e.currentTarget.dataset.format;
    document.execCommand(format, false, null);
    const editor = e.currentTarget.closest('.rich-editor-container')?.querySelector('.rich-editor');
    if (editor) editor.focus();
}

function setupListEditors(container) {
    const listEditors = container.querySelectorAll('.list-editor');
    listEditors.forEach(editor => {
        const addBtn = editor.querySelector('.add-list-item');
        if (addBtn) {
            addBtn.removeEventListener('click', handleAddListItem);
            addBtn.addEventListener('click', handleAddListItem);
        }
        
        editor.querySelectorAll('.remove-list-item').forEach(btn => {
            btn.removeEventListener('click', handleRemoveListItem);
            btn.addEventListener('click', handleRemoveListItem);
        });
    });
}

function handleAddListItem(e) {
    const editor = e.currentTarget.closest('.list-editor');
    const itemsContainer = editor.querySelector('.list-items');
    const newItem = document.createElement('div');
    newItem.className = 'list-item';
    newItem.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
    newItem.innerHTML = `<input type="text" placeholder="Пункт списка" style="flex:1; padding: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px;"><button class="remove-list-item" style="background: rgba(252,92,124,0.2); border: none; border-radius: 6px; padding: 4px 8px; cursor: pointer;">✕</button>`;
    newItem.querySelector('.remove-list-item').addEventListener('click', () => newItem.remove());
    itemsContainer.appendChild(newItem);
}

function handleRemoveListItem(e) {
    e.currentTarget.closest('.list-item').remove();
}

function setupStepsEditors(container) {
    const stepsEditors = container.querySelectorAll('.steps-editor');
    stepsEditors.forEach(editor => {
        const addBtn = editor.closest('.editor-item-content')?.querySelector('.add-step-btn');
        if (addBtn) {
            addBtn.removeEventListener('click', handleAddStep);
            addBtn.addEventListener('click', handleAddStep);
        }
        
        editor.querySelectorAll('.remove-step-btn').forEach(btn => {
            btn.removeEventListener('click', handleRemoveStep);
            btn.addEventListener('click', handleRemoveStep);
        });
    });
}

function handleAddStep(e) {
    const editor = e.currentTarget.closest('.editor-item-content')?.querySelector('.steps-editor');
    if (editor) {
        const stepNum = editor.querySelectorAll('.step-item').length + 1;
        const newStep = document.createElement('div');
        newStep.className = 'step-item';
        newStep.style.cssText = 'background: var(--surface2); border-radius: 10px; padding: 12px; margin-bottom: 10px;';
        newStep.innerHTML = `
            <div class="step-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <span class="step-num-display" style="background: var(--accent); color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;">${stepNum}</span>
                <input type="text" class="step-title" placeholder="Заголовок" style="flex:1; padding: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px;">
            </div>
            <textarea class="step-desc" rows="2" placeholder="Описание" style="width:100%; padding: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px;"></textarea>
            <button class="remove-step-btn" style="background: rgba(252,92,124,0.2); border: none; border-radius: 6px; padding: 4px 12px; cursor: pointer;">🗑 Удалить шаг</button>
        `;
        editor.appendChild(newStep);
        updateStepNumbers(editor);
    }
}

function handleRemoveStep(e) {
    e.currentTarget.closest('.step-item').remove();
    const editor = e.currentTarget.closest('.steps-editor');
    if (editor) updateStepNumbers(editor);
}

function updateStepNumbers(editor) {
    const steps = editor.querySelectorAll('.step-item');
    steps.forEach((step, idx) => {
        const numSpan = step.querySelector('.step-num-display');
        if (numSpan) numSpan.textContent = idx + 1;
    });
}

function setupQuizEditors(container) {
    const quizEditors = container.querySelectorAll('.quiz-editor');
    quizEditors.forEach(editor => {
        initQuizEditor(editor);
        
        const addBtn = editor.closest('.editor-item-content')?.querySelector('.add-quiz-question');
        if (addBtn) {
            addBtn.removeEventListener('click', () => handleAddQuestion(editor));
            addBtn.addEventListener('click', () => handleAddQuestion(editor));
        }
    });
}

function handleAddQuestion(editor) {
    const questionId = Date.now();
    const questionDiv = document.createElement('div');
    questionDiv.className = 'quiz-question-editor';
    questionDiv.dataset.id = questionId;
    questionDiv.style.cssText = 'background: var(--surface2); border-radius: 12px; padding: 16px; margin-bottom: 16px; border-left: 3px solid var(--accent);';
    questionDiv.innerHTML = `
        <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--muted);">📝 Вопрос:</label>
            <input type="text" class="quiz-question-text" placeholder="Введите вопрос" style="width: 100%; padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text);">
        </div>
        <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--muted);">📋 Варианты ответов:</label>
            <div class="quiz-options-editor" style="display: flex; flex-direction: column; gap: 8px;">
                <div class="quiz-option-editor" style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" placeholder="Вариант ответа" style="flex: 1; padding: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                        <input type="radio" name="correct_${questionId}" value="0" class="correct-radio">
                        <span style="font-size: 12px; color: var(--accent3);">✓ Правильный</span>
                    </label>
                    <button class="remove-option-btn" style="background: rgba(252,92,124,0.2); border: none; border-radius: 6px; padding: 6px 10px; color: var(--accent2); cursor: pointer;">🗑</button>
                </div>
            </div>
            <button class="add-option-btn" style="margin-top: 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 6px 12px; color: var(--text); cursor: pointer;">➕ Добавить вариант</button>
        </div>
        <button class="remove-question-btn" style="margin-top: 8px; background: rgba(252,92,124,0.2); border: 1px solid rgba(252,92,124,0.3); border-radius: 6px; padding: 6px 12px; color: var(--accent2); cursor: pointer;">🗑 Удалить вопрос</button>
    `;
    
    setupQuestionHandlers(questionDiv, questionId);
    
    const placeholder = editor.querySelector('.quiz-placeholder');
    if (placeholder) placeholder.remove();
    
    editor.appendChild(questionDiv);
}

function setupQuestionHandlers(questionDiv, questionId) {
    const addOptionBtn = questionDiv.querySelector('.add-option-btn');
    if (addOptionBtn) {
        addOptionBtn.removeEventListener('click', () => handleAddOption(questionDiv, questionId));
        addOptionBtn.addEventListener('click', () => handleAddOption(questionDiv, questionId));
    }
    
    const removeQuestionBtn = questionDiv.querySelector('.remove-question-btn');
    if (removeQuestionBtn) {
        removeQuestionBtn.removeEventListener('click', () => questionDiv.remove());
        removeQuestionBtn.addEventListener('click', () => questionDiv.remove());
    }
    
    const optionEditors = questionDiv.querySelectorAll('.quiz-option-editor');
    optionEditors.forEach(option => {
        setupOptionHandlers(option, questionId);
    });
}

function handleAddOption(questionDiv, questionId) {
    const optionsContainer = questionDiv.querySelector('.quiz-options-editor');
    const optionCount = optionsContainer.querySelectorAll('.quiz-option-editor').length;
    const newOption = document.createElement('div');
    newOption.className = 'quiz-option-editor';
    newOption.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-top: 8px;';
    newOption.innerHTML = `
        <input type="text" placeholder="Вариант ответа" style="flex: 1; padding: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <input type="radio" name="correct_${questionId}" value="${optionCount}" class="correct-radio">
            <span style="font-size: 12px; color: var(--accent3);">✓ Правильный</span>
        </label>
        <button class="remove-option-btn" style="background: rgba(252,92,124,0.2); border: none; border-radius: 6px; padding: 6px 10px; color: var(--accent2); cursor: pointer;">🗑</button>
    `;
    optionsContainer.appendChild(newOption);
    setupOptionHandlers(newOption, questionId);
}

function setupOptionHandlers(optionDiv, questionId) {
    const radio = optionDiv.querySelector('.correct-radio');
    const removeBtn = optionDiv.querySelector('.remove-option-btn');
    
    if (radio) {
        const index = Array.from(optionDiv.parentNode.children).indexOf(optionDiv);
        radio.value = index;
    }
    
    if (removeBtn) {
        removeBtn.removeEventListener('click', () => optionDiv.remove());
        removeBtn.addEventListener('click', () => {
            const container = optionDiv.parentNode;
            optionDiv.remove();
            const remainingOptions = container.querySelectorAll('.quiz-option-editor');
            remainingOptions.forEach((opt, newIdx) => {
                const radioBtn = opt.querySelector('.correct-radio');
                if (radioBtn) radioBtn.value = newIdx;
            });
        });
    }
}

function initQuizEditor(container) {
    const questions = JSON.parse(container.dataset.questions || '[]');
    container.innerHTML = '';
    
    if (questions.length === 0) {
        container.innerHTML = `
            <div class="quiz-placeholder" style="text-align: center; padding: 40px; color: var(--muted);">
                📋 Нажмите "Добавить вопрос" чтобы создать опросник
            </div>
        `;
    } else {
        questions.forEach((q, idx) => {
            const questionId = Date.now() + idx;
            const questionDiv = document.createElement('div');
            questionDiv.className = 'quiz-question-editor';
            questionDiv.style.cssText = 'background: var(--surface2); border-radius: 12px; padding: 16px; margin-bottom: 16px; border-left: 3px solid var(--accent);';
            
            let optionsHtml = '';
            q.options.forEach((opt, optIdx) => {
                optionsHtml += `
                    <div class="quiz-option-editor" style="display: flex; gap: 10px; align-items: center; margin-top: 8px;">
                        <input type="text" value="${escapeHtml(opt)}" placeholder="Вариант ответа" style="flex: 1; padding: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                            <input type="radio" name="correct_${questionId}" value="${optIdx}" class="correct-radio" ${q.correct === optIdx ? 'checked' : ''}>
                            <span style="font-size: 12px; color: var(--accent3);">✓ Правильный</span>
                        </label>
                        <button class="remove-option-btn" style="background: rgba(252,92,124,0.2); border: none; border-radius: 6px; padding: 6px 10px; color: var(--accent2); cursor: pointer;">🗑</button>
                    </div>
                `;
            });
            
            questionDiv.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--muted);">📝 Вопрос:</label>
                    <input type="text" class="quiz-question-text" value="${escapeHtml(q.text)}" placeholder="Введите вопрос" style="width: 100%; padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text);">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--muted);">📋 Варианты ответов:</label>
                    <div class="quiz-options-editor" style="display: flex; flex-direction: column; gap: 8px;">
                        ${optionsHtml}
                    </div>
                    <button class="add-option-btn" style="margin-top: 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 6px 12px; color: var(--text); cursor: pointer;">➕ Добавить вариант</button>
                </div>
                <button class="remove-question-btn" style="margin-top: 8px; background: rgba(252,92,124,0.2); border: 1px solid rgba(252,92,124,0.3); border-radius: 6px; padding: 6px 12px; color: var(--accent2); cursor: pointer;">🗑 Удалить вопрос</button>
            `;
            
            container.appendChild(questionDiv);
            setupQuestionHandlers(questionDiv, questionId);
        });
    }
}

function setupRemoveButtons(container) {
    const removeBtns = container.querySelectorAll('.remove-editor-item');
    removeBtns.forEach(btn => {
        btn.removeEventListener('click', handleRemoveEditorItem);
        btn.addEventListener('click', handleRemoveEditorItem);
    });
    
    const addRowBtns = container.querySelectorAll('.add-table-row');
    addRowBtns.forEach(btn => {
        btn.removeEventListener('click', handleAddTableRow);
        btn.addEventListener('click', handleAddTableRow);
    });
    
    const addColBtns = container.querySelectorAll('.add-table-col');
    addColBtns.forEach(btn => {
        btn.removeEventListener('click', handleAddTableCol);
        btn.addEventListener('click', handleAddTableCol);
    });
}

function handleRemoveEditorItem(e) {
    e.currentTarget.closest('.editor-item').remove();
    const editorArea = e.currentTarget.closest('#editorArea');
    if (editorArea && editorArea.children.length === 0) {
        editorArea.innerHTML = '<div class="editor-empty">Нажмите кнопку выше, чтобы добавить элемент</div>';
    }
}

function handleAddTableRow(e) {
    const tableItem = e.currentTarget.closest('.table-item');
    const tableEditor = tableItem.querySelector('.table-editor');
    const rows = JSON.parse(tableEditor.dataset.rows || '[]');
    const cols = rows[0]?.length || 2;
    rows.push(Array(cols).fill(''));
    tableEditor.dataset.rows = JSON.stringify(rows);
    initTableEditor(tableEditor);
}

function handleAddTableCol(e) {
    const tableItem = e.currentTarget.closest('.table-item');
    const tableEditor = tableItem.querySelector('.table-editor');
    let rows = JSON.parse(tableEditor.dataset.rows || '[]');
    rows = rows.map(row => [...row, '']);
    tableEditor.dataset.rows = JSON.stringify(rows);
    initTableEditor(tableEditor);
}

function initTableEditor(container) {
    const rows = JSON.parse(container.dataset.rows || '[]');
    if (rows.length === 0) rows.push(['', '']);
    
    let html = '<table class="editor-table" style="width:100%; border-collapse: collapse;"><thead>  <tr>';
    for (let i = 0; i < rows[0].length; i++) {
        html += `<th style="border: 1px solid var(--border); padding: 8px;"><input type="text" class="table-header" value="${escapeHtml(rows[0][i] || '')}" placeholder="Заголовок ${i+1}" style="width:100%; background: transparent; border: none; padding: 4px;"></th>`;
    }
    html += '<th style="width:40px;"></th>  </tr></thead><tbody>';
    for (let i = 1; i < rows.length; i++) {
        html += '  <tr>';
        for (let j = 0; j < rows[i].length; j++) {
            html += `<td style="border: 1px solid var(--border); padding: 8px;"><input type="text" class="table-cell" value="${escapeHtml(rows[i][j] || '')}" placeholder="Значение" style="width:100%; background: transparent; border: none; padding: 4px;"></td>`;
        }
        html += `<td style="border: 1px solid var(--border); text-align: center;"><button class="remove-table-row" style="background: rgba(252,92,124,0.2); border: none; border-radius: 6px; padding: 4px 8px; cursor: pointer;">🗑</button></td>`;
        html += '  </tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
    
    container.querySelectorAll('.remove-table-row').forEach(btn => {
        btn.removeEventListener('click', handleRemoveTableRow);
        btn.addEventListener('click', handleRemoveTableRow);
    });
    
    container.querySelectorAll('input').forEach(input => {
        input.removeEventListener('change', () => updateTableData(container));
        input.addEventListener('change', () => updateTableData(container));
    });
}

function handleRemoveTableRow(e) {
    e.currentTarget.closest('tr').remove();
    const container = e.currentTarget.closest('.table-editor');
    if (container) updateTableData(container);
}

function updateTableData(container) {
    const rows = [];
    const headers = container.querySelectorAll('thead input');
    const headerRow = Array.from(headers).map(h => h.value);
    rows.push(headerRow);
    
    const bodyRows = container.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
        const cells = row.querySelectorAll('td input');
        const rowData = Array.from(cells).map(c => c.value);
        rows.push(rowData);
    });
    
    container.dataset.rows = JSON.stringify(rows);
}

function convertEditorToHtml(editorArea) {
    const items = editorArea.querySelectorAll('.editor-item');
    let html = '';
    
    items.forEach(item => {
        const type = item.dataset.type;
        
        switch(type) {
            case 'text':
                const textEditor = item.querySelector('.rich-editor');
                const textContent = textEditor ? textEditor.innerHTML : '';
                if (textContent) html += `<div>${textContent}</div>`;
                break;
            case 'list':
                const listItems = Array.from(item.querySelectorAll('.list-item input')).map(i => i.value.trim()).filter(v => v);
                if (listItems.length) html += `<ul>${listItems.map(li => `<li>${escapeHtml(li)}</li>`).join('')}</ul>`;
                break;
            case 'steps':
                const steps = [];
                item.querySelectorAll('.step-item').forEach(step => {
                    const title = step.querySelector('.step-title')?.value.trim() || '';
                    const desc = step.querySelector('.step-desc')?.value.trim() || '';
                    if (title || desc) steps.push({ title, desc });
                });
                if (steps.length) {
                    let stepsHtml = '<div class="steps">';
                    steps.forEach((step, idx) => {
                        stepsHtml += `
                            <div class="step">
                                <div class="step-num">${idx + 1}</div>
                                <div class="step-body">
                                    <strong>${escapeHtml(step.title)}</strong>
                                    <span>${escapeHtml(step.desc)}</span>
                                </div>
                            </div>
                        `;
                    });
                    stepsHtml += '</div>';
                    html += stepsHtml;
                }
                break;
            case 'table':
                const tableData = JSON.parse(item.querySelector('.table-editor')?.dataset.rows || '[]');
                if (tableData.length > 1) {
                    let tableHtml = '<table class="ref-table"><thead>  <tr>';
                    tableData[0].forEach(cell => tableHtml += `<th>${escapeHtml(cell)}</th>`);
                    tableHtml += '  </tr></thead><tbody>';
                    for (let i = 1; i < tableData.length; i++) {
                        tableHtml += '  <tr>';
                        tableData[i].forEach(cell => tableHtml += `<td>${escapeHtml(cell)}</td>`);
                        tableHtml += '  </tr>';
                    }
                    tableHtml += '</tbody></table>';
                    html += tableHtml;
                }
                break;
            case 'alert':
                const alertType = item.querySelector('.alert-type')?.value || 'info';
                const alertText = item.querySelector('.alert-text')?.value || '';
                if (alertText) {
                    const icon = alertType === 'danger' ? '🚨' : (alertType === 'success' ? '✅' : 'ℹ️');
                    html += `<div class="alert-bar ${alertType}"><span>${icon}</span><span>${escapeHtml(alertText)}</span></div>`;
                }
                break;
            case 'note':
                const noteType = item.querySelector('.note-type')?.value || 'info';
                const noteText = item.querySelector('.note-text')?.value || '';
                if (noteText) {
                    const className = noteType === 'warn' ? 'hl warn' : (noteType === 'ok' ? 'hl ok' : 'hl info');
                    html += `<div class="${className}">${escapeHtml(noteText)}</div>`;
                }
                break;
            case 'dropdown':
                const dropdownTitle = item.querySelector('.dropdown-title')?.value || '';
                const dropdownContent = item.querySelector('.rich-editor')?.innerHTML || '';
                if (dropdownTitle && dropdownContent) {
                    html += `
                        <details style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px;">
                            <summary style="cursor: pointer; padding: 12px 16px; font-weight: 600; color: var(--accent); list-style: none; display: flex; justify-content: space-between;">${escapeHtml(dropdownTitle)}<span style="font-size: 12px;">▼</span></summary>
                            ${dropdownContent}
                        </details>
                    `;
                }
                break;
            case 'card':
                const cardTitle = item.querySelector('.card-title')?.value || '';
                const cardItems = Array.from(item.querySelectorAll('.list-item input')).map(i => i.value.trim()).filter(v => v);
                if (cardTitle || cardItems.length) {
                    let cardHtml = '<div class="info-card">';
                    if (cardTitle) cardHtml += `<h3>${escapeHtml(cardTitle)}</h3>`;
                    if (cardItems.length) cardHtml += `<ul>${cardItems.map(li => `<li>${escapeHtml(li)}</li>`).join('')}</ul>`;
                    cardHtml += '</div>';
                    html += cardHtml;
                }
                break;
            case 'quiz':
                const questionsData = [];
                const questionEditors = item.querySelectorAll('.quiz-question-editor');
                questionEditors.forEach(q => {
                    const text = q.querySelector('.quiz-question-text')?.value.trim() || '';
                    const options = [];
                    const optionInputs = q.querySelectorAll('.quiz-option-editor input[type="text"]');
                    optionInputs.forEach(opt => options.push(opt.value.trim()));
                    const correctRadio = q.querySelector('input[type="radio"]:checked');
                    const correct = correctRadio ? parseInt(correctRadio.value) : 0;
                    if (text && options.length >= 2) {
                        questionsData.push({ text, options, correct });
                    }
                });
                if (questionsData.length) {
                    let quizHtml = '<div class="quiz-block"><div class="quiz-title">📋 Опросник</div>';
                    questionsData.forEach((q, idx) => {
                        quizHtml += `
                            <div class="quiz-question">
                                <div class="quiz-question-text">${idx + 1}. ${escapeHtml(q.text)}</div>
                                <div class="quiz-options">
                                    ${q.options.map((opt, optIdx) => `
                                        <label class="quiz-option">
                                            <input type="radio" name="quiz_q${Date.now()}_${idx}" value="${optIdx}">
                                            <span>${escapeHtml(opt)}</span>
                                        </label>
                                    `).join('')}
                                </div>
                                <div class="quiz-answer" id="quiz-answer-${Date.now()}-${idx}"></div>
                            </div>
                        `;
                    });
                    quizHtml += `<button class="quiz-btn" onclick="checkQuizInline(this)">✅ Проверить ответы</button>
                                 <button class="quiz-btn quiz-reset" onclick="resetQuizInline(this)">🔄 Сбросить</button>
                                 <div class="quiz-result"></div></div>`;
                    html += quizHtml;
                }
                break;
        }
    });
    
    return html;
}

// Глобальные функции для проверки опросников
window.checkQuizInline = function(btn) {
    const quizBlock = btn.closest('.quiz-block');
    const questions = quizBlock.querySelectorAll('.quiz-question');
    let correctCount = 0;
    
    questions.forEach((q, idx) => {
        const selected = q.querySelector('input[type="radio"]:checked');
        const answerDiv = q.querySelector('.quiz-answer');
        const isCorrect = selected && selected.value === '0';
        
        if (isCorrect) correctCount++;
        
        if (answerDiv) {
            answerDiv.innerHTML = isCorrect ? '✅ Правильно!' : '❌ Неправильно.';
            answerDiv.classList.add('show');
            answerDiv.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
    });
    
    const resultDiv = quizBlock.querySelector('.quiz-result');
    const total = questions.length;
    const percentage = Math.round((correctCount / total) * 100);
    
    resultDiv.innerHTML = `Результат: ${correctCount} из ${total} (${percentage}%)`;
    resultDiv.classList.add('show');
    resultDiv.classList.add(percentage >= 70 ? 'success' : 'fail');
};

window.resetQuizInline = function(btn) {
    const quizBlock = btn.closest('.quiz-block');
    const radios = quizBlock.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => radio.checked = false);
    
    const answers = quizBlock.querySelectorAll('.quiz-answer');
    answers.forEach(ans => {
        ans.innerHTML = '';
        ans.classList.remove('show', 'correct', 'incorrect');
    });
    
    const resultDiv = quizBlock.querySelector('.quiz-result');
    resultDiv.innerHTML = '';
    resultDiv.classList.remove('show', 'success', 'fail');
};

// ========== ПАНЕЛЬ УПРАВЛЕНИЯ РОП ==========

async function openRopPanel() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 600px;">
            <div class="modal-header">
                <span class="modal-title">👑 Панель управления</span>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label>➕ Добавить пользователя</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="newUsername" placeholder="Логин" style="flex:1">
                        <input type="text" id="newPassword" placeholder="Пароль (4 цифры)" maxlength="4" style="width:100px">
                        <input type="text" id="newFullName" placeholder="ФИО" style="flex:1">
                        <button id="addUserBtn" class="btn-add">Добавить</button>
                    </div>
                </div>
                <div class="field">
                    <label>📋 Список пользователей</label>
                    <div id="usersList" style="max-height: 300px; overflow-y: auto;"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);
    
    const closeModal = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    
    await loadUsersList(modal);
    
    document.getElementById('addUserBtn').addEventListener('click', async () => {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const full_name = document.getElementById('newFullName').value.trim();
        
        if (!username || !password || !full_name) {
            alert('Заполните все поля');
            return;
        }
        if (!/^\d{4}$/.test(password)) {
            alert('Пароль должен быть 4 цифры');
            return;
        }
        
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password, full_name, role: 'user' })
        });
        
        if (response.ok) {
            alert('Пользователь добавлен');
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('newFullName').value = '';
            await loadUsersList(modal);
        } else {
            const error = await response.json();
            alert(error.error);
        }
    });
}

async function loadUsersList(modal) {
    const response = await fetch('/api/users', { credentials: 'include' });
    const users = await response.json();
    const meResponse = await fetch('/api/check-auth', { credentials: 'include' });
    const me = await meResponse.json();
    
    const container = modal.querySelector('#usersList');
    if (!container) return;
    
    container.innerHTML = users.map(user => {
        let canChange = false;
        if (me.user.role === 'root') canChange = true;
        else if (me.user.role === 'rop' && user.role === 'user') canChange = true;
        
        let canDelete = false;
        if (me.user.role === 'root' && user.username !== 'root' && user.id !== me.user.id) canDelete = true;
        
        return `
            <div style="background: var(--surface2); border-radius: 10px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${escapeHtml(user.full_name)}</strong><br>
                        <span style="font-size: 11px;">${user.username} | ${user.role === 'root' ? 'ROOT' : (user.role === 'rop' ? 'РОП' : 'Пользователь')}</span>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        ${canChange ? `<button onclick="window.changePasswordUser(${user.id}, '${escapeHtml(user.full_name)}')" class="btn-edit" style="padding: 4px 12px;">🔑 Сменить пароль</button>` : ''}
                        ${canDelete ? `<button onclick="window.deleteUserById(${user.id})" class="btn-delete" style="padding: 4px 12px;">🗑 Удалить</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.changePasswordUser = async function(userId, userName) {
    const newPassword = prompt(`Введите новый пароль (4 цифры) для пользователя ${userName}`);
    if (!newPassword) return;
    if (!/^\d{4}$/.test(newPassword)) {
        alert('Пароль должен быть 4 цифры');
        return;
    }
    const response = await fetch(`/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword })
    });
    if (response.ok) alert('Пароль успешно изменен');
    else alert('Ошибка');
};

window.deleteUserById = async function(userId) {
    if (confirm('Удалить пользователя?')) {
        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
        if (response.ok) {
            alert('Пользователь удален');
            location.reload();
        } else alert('Ошибка');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

// ========== КНОПКИ РЕДАКТИРОВАНИЯ ДЛЯ ВСЕХ СТРАНИЦ ==========

function setupEditButtons() {
    const editBtns = document.querySelectorAll('.btn-edit-content');
    console.log('Found edit buttons:', editBtns.length);
    
    editBtns.forEach(btn => {
        btn.removeEventListener('click', handleEditClick);
        btn.addEventListener('click', handleEditClick);
        btn.style.display = window.isRopGlobal ? 'inline-flex' : 'none';
    });
}

function handleEditClick(e) {
    const btn = e.currentTarget;
    const page = btn.dataset.page;
    const section = btn.dataset.section;
    console.log('Edit clicked for:', page, section);
    
    // Вызываем вашу существующую функцию openVisualEditor
    if (typeof openVisualEditor === 'function') {
        openVisualEditor(page, section);
    } else {
        console.error('openVisualEditor function not found');
    }
}
