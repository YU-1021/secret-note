export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === '/api/auth') {
        return await handleAuth(request, env);
      }

      if (path.startsWith('/api/notes')) {
        return await handleNotes(request, env, path);
      }

      if (path === '/' || path === '/index.html') {
        return handleStatic('index.html');
      }

      if (path === '/app.js') {
        return handleStatic('app.js');
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleAuth(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!env.PASSWORD) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Server configuration error: PASSWORD not set' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { password } = await request.json();

    if (password === env.PASSWORD) {
      const token = generateToken();
      return new Response(JSON.stringify({ success: true, token }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, message: 'Invalid password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Invalid request body' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleNotes(request, env, path) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !verifyToken(authHeader)) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.NOTES) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Server configuration error: KV namespace not bound' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const noteId = url.searchParams.get('id');

    if (request.method === 'GET') {
      const notesJson = await env.NOTES.get('notes');
      const notes = notesJson ? JSON.parse(notesJson) : [];
      
      if (noteId) {
        const note = notes.find(n => n.id === noteId);
        return new Response(JSON.stringify({ success: true, note }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ success: true, notes }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Invalid JSON body' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { title, content } = body;
      const notesJson = await env.NOTES.get('notes');
      let notes = [];
      
      try {
        notes = notesJson ? JSON.parse(notesJson) : [];
      } catch (e) {
        notes = [];
      }
      
      const newNote = {
        id: generateId(),
        title: title || '无标题',
        content: content || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      notes.unshift(newNote);
      
      try {
        await env.NOTES.put('notes', JSON.stringify(notes));
      } catch (e) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Failed to save to KV: ' + e.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ success: true, note: newNote }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'PUT') {
      const { id, title, content } = await request.json();
      const notesJson = await env.NOTES.get('notes');
      const notes = notesJson ? JSON.parse(notesJson) : [];
      
      const index = notes.findIndex(n => n.id === id);
      if (index === -1) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Note not found' 
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      notes[index] = {
        ...notes[index],
        title: title || notes[index].title,
        content: content !== undefined ? content : notes[index].content,
        updatedAt: new Date().toISOString()
      };
      
      await env.NOTES.put('notes', JSON.stringify(notes));
      
      return new Response(JSON.stringify({ success: true, note: notes[index] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'DELETE') {
      if (!noteId) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Note ID required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const notesJson = await env.NOTES.get('notes');
      const notes = notesJson ? JSON.parse(notesJson) : [];
      
      const filteredNotes = notes.filter(n => n.id !== noteId);
      await env.NOTES.put('notes', JSON.stringify(filteredNotes));
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to access storage: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function handleStatic(filename) {
  if (filename === 'index.html') {
    return new Response(INDEX_HTML, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }

  if (filename === 'app.js') {
    return new Response(APP_JS, {
      headers: { 'Content-Type': 'application/javascript;charset=UTF-8' }
    });
  }

  return new Response('Not Found', { status: 404 });
}

function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function generateId() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function verifyToken(token) {
  return token && token.length === 64;
}

const INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>加密笔记</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
        }
        
        body.login-page {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .login-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
            overflow: hidden;
        }
        
        .login-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .login-header h1 { font-size: 28px; margin-bottom: 10px; }
        .login-header p { opacity: 0.9; font-size: 14px; }
        .login-content { padding: 30px; }
        
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-weight: 600; color: #333; font-size: 14px; margin-bottom: 8px; }
        .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        .form-group input:focus { outline: none; border-color: #667eea; }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            width: 100%;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
        
        .app-container { display: none; height: 100vh; }
        .app-container.active { display: flex; }
        
        .sidebar {
            width: 300px;
            background: #fff;
            border-right: 1px solid #e0e0e0;
            display: flex;
            flex-direction: column;
        }
        
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .sidebar-header h2 { font-size: 18px; color: #333; }
        
        .sidebar-content { flex: 1; overflow-y: auto; padding: 10px; }
        
        .note-item {
            padding: 15px;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 8px;
            transition: all 0.2s;
            position: relative;
            border: 2px solid transparent;
        }
        .note-item:hover { background: #f5f5f5; }
        .note-item.active { background: #667eea; color: white; }
        
        .note-item .note-title {
            font-weight: 600;
            margin-bottom: 5px;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding-right: 30px;
        }
        .note-item .note-date { font-size: 12px; opacity: 0.7; }
        
        .note-item .delete-btn {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: #ff4757;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .note-item:hover .delete-btn { opacity: 1; }
        .note-item.active .delete-btn { background: rgba(255,255,255,0.3); }
        
        .sidebar-footer { padding: 15px; border-top: 1px solid #e0e0e0; }
        
        .btn-new {
            background: #667eea;
            color: white;
            width: 100%;
        }
        .btn-new:hover { background: #5a6fd6; }
        
        .btn-logout {
            background: transparent;
            color: #666;
            width: 100%;
            margin-top: 10px;
            border: 1px solid #e0e0e0;
        }
        .btn-logout:hover { background: #f5f5f5; }
        
        .main-content { flex: 1; display: flex; flex-direction: column; background: #fff; }
        
        .main-header {
            padding: 20px 30px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .main-header input {
            font-size: 24px;
            font-weight: 600;
            border: none;
            outline: none;
            flex: 1;
            padding: 5px 0;
        }
        .main-header input::placeholder { color: #ccc; }
        
        .btn-save {
            background: #27ae60;
            color: white;
            padding: 10px 20px;
            font-size: 14px;
        }
        .btn-save:hover { background: #229954; }
        .btn-save:disabled { background: #ccc; cursor: not-allowed; }
        
        .unsaved-badge {
            background: #ff6b6b;
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .editor-container { flex: 1; padding: 30px; overflow-y: auto; }
        
        .editor {
            width: 100%;
            height: 100%;
            border: none;
            outline: none;
            font-size: 16px;
            line-height: 1.8;
            resize: none;
            font-family: inherit;
        }
        .editor::placeholder { color: #ccc; }
        
        .empty-state {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100%;
            color: #999;
        }
        .empty-state svg { width: 80px; height: 80px; margin-bottom: 20px; opacity: 0.5; }
        .empty-state p { font-size: 16px; margin-bottom: 20px; }
        .btn-create-first {
            background: #667eea;
            color: white;
            padding: 12px 30px;
        }
        .btn-create-first:hover { background: #5a6fd6; }
        
        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .toast.show { opacity: 1; }
        .toast.success { background: #27ae60; }
        .toast.error { background: #e74c3c; }
        
        .loading-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.9);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 999;
        }
        .loading-overlay.show { display: flex; }
        
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        @media (max-width: 768px) {
            .sidebar { width: 240px; }
            .main-header input { font-size: 20px; }
        }
        
        @media (max-width: 600px) {
            .app-container.active { flex-direction: column; }
            .sidebar { width: 100%; height: auto; max-height: 35vh; }
            .sidebar-content { display: flex; overflow-x: auto; gap: 10px; }
            .note-item { min-width: 150px; flex-shrink: 0; }
        }
    </style>
</head>
<body class="login-page">
    <div class="login-container" id="loginContainer">
        <div class="login-header">
            <h1>🔐 加密笔记</h1>
            <p>安全存储您的私密笔记</p>
        </div>
        <div class="login-content">
            <div class="form-group">
                <label for="password">访问密码</label>
                <input type="password" id="password" placeholder="请输入访问密码" autocomplete="current-password">
            </div>
            <button class="btn btn-primary" onclick="login()">登录</button>
        </div>
    </div>
    
    <div class="app-container" id="appContainer">
        <div class="sidebar">
            <div class="sidebar-header">
                <h2>📝 笔记列表</h2>
                <span id="noteCount" style="color: #999; font-size: 14px;"></span>
            </div>
            <div class="sidebar-content" id="notesList"></div>
            <div class="sidebar-footer">
                <button class="btn btn-new" onclick="createNote()">+ 新建笔记</button>
                <button class="btn btn-logout" onclick="logout()">退出登录</button>
            </div>
        </div>
        <div class="main-content" id="mainContent">
            <div class="empty-state" id="emptyState">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <p>还没有笔记</p>
                <button class="btn btn-create-first" onclick="createNote()">创建第一条笔记</button>
            </div>
            <div id="editorView" style="display: none; height: 100%; flex-direction: column;">
                <div class="main-header">
                    <input type="text" id="noteTitle" placeholder="输入标题...">
                    <span class="unsaved-badge" id="unsavedBadge" style="display: none;">未保存</span>
                    <button class="btn btn-save" id="saveBtn" onclick="saveNote()">保存</button>
                </div>
                <div class="editor-container">
                    <textarea class="editor" id="noteContent" placeholder="开始输入笔记内容..."></textarea>
                </div>
            </div>
        </div>
    </div>
    
    <div class="loading-overlay" id="loading">
        <div class="spinner"></div>
    </div>
    
    <div class="toast" id="toast"></div>
    
    <script src="/app.js"></script>
</body>
</html>`;

const APP_JS = `let token = null;
let notes = [];
let currentNoteId = null;
let hasUnsavedChanges = false;

async function login() {
    const password = document.getElementById('password').value;
    if (!password) { showToast('请输入密码', 'error'); return; }
    
    showLoading(true);
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        
        if (data.success) {
            token = data.token;
            document.body.classList.remove('login-page');
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('appContainer').classList.add('active');
            await loadNotes();
            showToast('登录成功', 'success');
        } else {
            showToast(data.message || '密码错误', 'error');
        }
    } catch (e) {
        showToast('网络错误', 'error');
    }
    showLoading(false);
}

async function loadNotes() {
    try {
        const res = await fetch('/api/notes', {
            headers: { 'Authorization': token }
        });
        const data = await res.json();
        notes = data.success ? (data.notes || []) : [];
        renderNotesList();
    } catch (e) {
        showToast('加载失败', 'error');
    }
}

function renderNotesList() {
    const container = document.getElementById('notesList');
    document.getElementById('noteCount').textContent = notes.length > 0 ? notes.length + ' 条' : '';
    
    if (notes.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = notes.map(note => 
        '<div class="note-item ' + (note.id === currentNoteId ? 'active' : '') + '" onclick="selectNote(\\'' + note.id + '\\')">' +
            '<div class="note-title">' + escapeHtml(note.title || '无标题') + '</div>' +
            '<div class="note-date">' + formatDate(note.updatedAt) + '</div>' +
            '<button class="delete-btn" onclick="deleteNote(event, \\'' + note.id + '\\')">删除</button>' +
        '</div>'
    ).join('');
}

async function createNote() {
    showLoading(true);
    
    try {
        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ title: '', content: '' })
        });
        const data = await res.json();
        
        if (data.success) {
            notes.unshift(data.note);
            renderNotesList();
            selectNote(data.note.id);
            document.getElementById('noteTitle').focus();
            showToast('笔记已创建', 'success');
        } else {
            showToast(data.message || '创建失败', 'error');
        }
    } catch (e) {
        showToast('网络错误', 'error');
    }
    
    showLoading(false);
}

function selectNote(id) {
    if (hasUnsavedChanges && !confirm('有未保存的更改，是否放弃？')) return;
    
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    currentNoteId = id;
    hasUnsavedChanges = false;
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('editorView').style.display = 'flex';
    document.getElementById('noteTitle').value = note.title || '';
    document.getElementById('noteContent').value = note.content || '';
    updateUnsavedStatus();
    renderNotesList();
}

async function saveNote() {
    if (!currentNoteId) return;
    
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value;
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';
    
    try {
        const res = await fetch('/api/notes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ id: currentNoteId, title, content })
        });
        const data = await res.json();
        
        if (data.success) {
            const idx = notes.findIndex(n => n.id === currentNoteId);
            if (idx !== -1) {
                notes[idx] = data.note;
                renderNotesList();
            }
            hasUnsavedChanges = false;
            updateUnsavedStatus();
            showToast('保存成功', 'success');
        } else {
            showToast('保存失败', 'error');
        }
    } catch (e) {
        showToast('网络错误', 'error');
    }
    
    saveBtn.disabled = false;
    saveBtn.textContent = '保存';
}

async function deleteNote(event, id) {
    event.stopPropagation();
    if (!confirm('确定删除这条笔记吗？')) return;
    
    showLoading(true);
    try {
        const res = await fetch('/api/notes?id=' + id, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        const data = await res.json();
        
        if (data.success) {
            notes = notes.filter(n => n.id !== id);
            if (currentNoteId === id) {
                currentNoteId = null;
                hasUnsavedChanges = false;
                document.getElementById('emptyState').style.display = 'flex';
                document.getElementById('editorView').style.display = 'none';
            }
            renderNotesList();
            showToast('已删除', 'success');
        } else {
            showToast('删除失败', 'error');
        }
    } catch (e) {
        showToast('网络错误', 'error');
    }
    showLoading(false);
}

function markUnsaved() {
    hasUnsavedChanges = true;
    updateUnsavedStatus();
}

function updateUnsavedStatus() {
    const badge = document.getElementById('unsavedBadge');
    badge.style.display = hasUnsavedChanges ? 'inline' : 'none';
}

function logout() {
    if (hasUnsavedChanges && !confirm('有未保存的更改，是否退出？')) return;
    
    token = null;
    notes = [];
    currentNoteId = null;
    hasUnsavedChanges = false;
    document.body.classList.add('login-page');
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('appContainer').classList.remove('active');
    document.getElementById('password').value = '';
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('editorView').style.display = 'none';
    showToast('已退出', 'success');
}

function showLoading(show) {
    document.getElementById('loading').classList.toggle('show', show);
}

function showToast(msg, type) {
    type = type || 'success';
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
}

function formatDate(str) {
    const d = new Date(str);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    return d.toLocaleDateString('zh-CN');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') login();
});

document.getElementById('noteTitle').addEventListener('input', markUnsaved);
document.getElementById('noteContent').addEventListener('input', markUnsaved);

window.addEventListener('beforeunload', function(e) {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});`;
