// editor.js - в самом начале
// Убедимся, что переменная isRop доступна глобально
let editorIsRop = false;

// Функция для получения роли
async function getEditorUserRole() {
    try {
        const response = await fetch('/api/check-auth', { credentials: 'include' });
        const data = await response.json();
        if (data.authenticated) {
            editorIsRop = (data.user.role === 'rop' || data.user.role === 'root');
            window.isRopGlobal = editorIsRop;
            window.isRop = editorIsRop; // Устанавливаем глобальную переменную
            return editorIsRop;
        }
        return false;
    } catch (error) {
        console.error('Error getting user role:', error);
        return false;
    }
}

// Настройка кнопок редактирования
window.setupEditButtons = function() {
    const editBtns = document.querySelectorAll('.btn-edit-content');
    console.log('Editor.js: setupEditButtons called, found buttons:', editBtns.length, 'isRop:', window.isRop || editorIsRop);
    
    const hasRights = window.isRop || editorIsRop;
    
    editBtns.forEach(btn => {
        btn.removeEventListener('click', handleEditClickWrapper);
        btn.addEventListener('click', handleEditClickWrapper);
        btn.style.display = hasRights ? 'inline-flex' : 'none';
    });
};

function handleEditClickWrapper(e) {
    const btn = e.currentTarget;
    const page = btn.dataset.page;
    const section = btn.dataset.section;
    console.log('Editor.js: Edit clicked for:', page, section);
    openVisualEditor(page, section);
}

// Инициализация
async function initEditor() {
    await getEditorUserRole();
    window.setupEditButtons();
}

// Запуск после загрузки страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditor);
} else {
    initEditor();
}
