export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === '/api/auth') {
        return await handleAuth(request, env);
      }

      if (path === '/api/notes') {
        return await handleNotes(request, env);
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

async function handleNotes(request, env) {
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
    if (request.method === 'GET') {
      const notes = await env.NOTES.get('notes');
      return new Response(JSON.stringify({ success: true, notes: notes || '' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      const { notes } = await request.json();
      await env.NOTES.put('notes', notes || '');
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to access storage' 
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
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 800px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        .content {
            padding: 30px;
        }
        .login-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .form-group label {
            font-weight: 600;
            color: #333;
            font-size: 14px;
        }
        .form-group input {
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            padding: 14px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-success {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
        }
        .notes-container {
            display: none;
        }
        .notes-container.active {
            display: block;
        }
        .notes-textarea {
            width: 100%;
            min-height: 400px;
            padding: 20px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 16px;
            line-height: 1.6;
            resize: vertical;
            font-family: 'Courier New', monospace;
        }
        .notes-textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .toolbar {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .error-message {
            color: #e74c3c;
            padding: 12px;
            background: #fee;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        .error-message.show {
            display: block;
        }
        .success-message {
            color: #27ae60;
            padding: 12px;
            background: #efe;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        .success-message.show {
            display: block;
        }
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        .loading.show {
            display: block;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 加密笔记</h1>
            <p>安全存储您的私密笔记</p>
        </div>
        <div class="content">
            <div class="error-message" id="errorMessage"></div>
            <div class="success-message" id="successMessage"></div>
            
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p style="margin-top: 10px;">加载中...</p>
            </div>
            
            <div class="login-form" id="loginForm">
                <div class="form-group">
                    <label for="password">访问密码</label>
                    <input type="password" id="password" placeholder="请输入访问密码" autocomplete="current-password">
                </div>
                <button class="btn btn-primary" onclick="login()">登录</button>
            </div>
            
            <div class="notes-container" id="notesContainer">
                <div class="toolbar">
                    <button class="btn btn-success" onclick="saveNotes()">保存笔记</button>
                    <button class="btn" onclick="loadNotes()">刷新</button>
                    <button class="btn" onclick="logout()">退出登录</button>
                </div>
                <textarea class="notes-textarea" id="notes" placeholder="在这里输入您的笔记内容..."></textarea>
            </div>
        </div>
    </div>
    <script src="/app.js"></script>
</body>
</html>`;

const APP_JS = `let token = null;

async function login() {
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loading = document.getElementById('loading');
    
    if (!password) {
        showError('请输入密码');
        return;
    }
    
    loading.classList.add('show');
    
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            token = data.token;
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('notesContainer').classList.add('active');
            await loadNotes();
            showSuccess('登录成功');
        } else {
            showError(data.message || '登录失败');
        }
    } catch (error) {
        showError('网络错误，请重试');
    } finally {
        loading.classList.remove('show');
    }
}

async function saveNotes() {
    const notes = document.getElementById('notes').value;
    const loading = document.getElementById('loading');
    
    loading.classList.add('show');
    
    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ notes })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('保存成功');
        } else {
            showError('保存失败');
        }
    } catch (error) {
        showError('网络错误，请重试');
    } finally {
        loading.classList.remove('show');
    }
}

async function loadNotes() {
    const loading = document.getElementById('loading');
    
    loading.classList.add('show');
    
    try {
        const response = await fetch('/api/notes', {
            method: 'GET',
            headers: { 'Authorization': token }
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('notes').value = data.notes || '';
        } else {
            showError('加载失败');
        }
    } catch (error) {
        showError('网络错误，请重试');
    } finally {
        loading.classList.remove('show');
    }
}

function logout() {
    token = null;
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('notesContainer').classList.remove('active');
    document.getElementById('password').value = '';
    showSuccess('已退出登录');
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    successMessage.classList.remove('show');
    setTimeout(() => errorMessage.classList.remove('show'), 3000);
}

function showSuccess(message) {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    successMessage.textContent = message;
    successMessage.classList.add('show');
    errorMessage.classList.remove('show');
    setTimeout(() => successMessage.classList.remove('show'), 3000);
}

document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});`;
