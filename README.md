# 加密笔记 - Cloudflare Workers 部署指南

## 功能特点

- 🔐 密码保护访问
- 💾 数据存储在 Cloudflare KV
- 🎨 现代化 UI 界面
- 📱 响应式设计
- ⚡ 快速部署

## 部署步骤

### 方式一：GitHub 同步部署（推荐）

**适用场景**：通过 Cloudflare Pages 连接 GitHub 仓库自动部署

**优点**：无需手动填写 KV ID，所有配置在 Dashboard 界面完成

#### 1. 推送代码到 GitHub

将项目推送到你的 GitHub 仓库。

#### 2. 连接 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 "Workers & Pages" -> "Overview"
3. 点击 "Create application" -> "Pages" -> "Connect to Git"
4. 选择你的 GitHub 仓库
5. 配置构建设置：
   - **Framework preset**: None
   - **Build command**: 留空
   - **Build output directory**: `/`
6. 点击 "Save and Deploy"

#### 3. 创建 KV 命名空间

1. 进入 "Workers & Pages" -> "KV"
2. 点击 "Create a Namespace"
3. 命名为 `secret-notes`
4. 点击 "Add"

#### 4. 绑定 KV 到项目

1. 回到你的 Pages 项目
2. 点击 "Settings" -> "Functions"
3. 找到 "KV namespace bindings" 部分
4. 点击 "Add binding"
5. 填写：
   - **Variable name**: `NOTES`
   - **KV namespace**: 选择你创建的 `secret-notes`
6. 点击 "Save"

#### 5. 设置密码

1. 在 Settings 页面点击 "Environment variables"
2. 点击 "Add variable"
3. 填写：
   - **Variable name**: `PASSWORD`
   - **Value**: 你的访问密码
   - 选择环境：Production 和 Preview（都勾选）
4. 点击 "Save"

#### 6. 重新部署

1. 点击 "Deployments" 标签
2. 点击 "Retry deployment"

#### 7. 完成

现在你可以访问你的 Pages URL，输入密码开始使用加密笔记了！

---

### 方式二：Dashboard 直接部署

**优点**：无需 GitHub，直接在 Dashboard 中操作

#### 1. 创建 KV 命名空间

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 "Workers & Pages" -> "KV"
3. 点击 "Create a Namespace"
4. 命名为 `secret-notes`（或其他你喜欢的名称）
5. 点击 "Add"

#### 2. 上传项目到 Cloudflare Workers

1. 进入 "Workers & Pages" -> "Overview"
2. 点击 "Create application" -> "Create Worker"
3. 命名为 `secret-note`
4. 点击 "Deploy"
5. 部署完成后，点击 "Edit code"
6. 删除默认代码，将 [worker.js](file:///d:/project/secret%20note/worker.js) 的内容粘贴进去
7. 点击 "Save and Deploy"

#### 3. 绑定 KV 命名空间

1. 在 Worker 页面点击 "Settings" -> "Variables"
2. 找到 "KV Namespace Bindings" 部分
3. 点击 "Add binding"
4. 填写：
   - **Variable name**: `NOTES`
   - **KV Namespace**: 选择你创建的 `secret-notes` 命名空间
5. 点击 "Save"

#### 4. 设置访问密码

1. 在 Worker 页面点击 "Settings" -> "Variables and Secrets"
2. 找到 "Environment Variables" 部分
3. 点击 "Add variable"
4. 填写：
   - **Variable name**: `PASSWORD`
   - **Value**: 输入你的访问密码
5. 点击 "Encrypt"（可选，加密存储）
6. 点击 "Save"

#### 5. 完成

现在你可以访问你的 Worker URL，输入密码开始使用加密笔记了！

---

### 方式三：通过 Wrangler CLI 部署

#### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

#### 2. 登录 Cloudflare

```bash
wrangler login
```

#### 3. 创建 KV 命名空间

```bash
wrangler kv:namespace create "NOTES"
```

#### 4. 更新配置文件

将上一步获取的 `id` 填入 [wrangler.toml](file:///d:/project/secret%20note/wrangler.toml) 文件：

```toml
[[kv_namespaces]]
binding = "NOTES"
id = "your-kv-namespace-id"
```

#### 5. 设置访问密码

在 Cloudflare Dashboard 中设置环境变量 `PASSWORD`（推荐），或在 [wrangler.toml](file:///d:/project/secret%20note/wrangler.toml) 中设置：

```toml
[vars]
PASSWORD = "your-secure-password-here"
```

#### 6. 安装依赖并部署

```bash
npm install
npm run deploy
```

## 使用方法

1. 访问部署后的 URL
2. 输入你设置的密码
3. 开始编写和保存笔记

## 文件说明

- `worker.js` - Cloudflare Worker 主文件，包含 API 和前端代码
- `wrangler.toml` - 配置文件（**必须填写 KV namespace ID**）
- `package.json` - 项目依赖配置

## 配置说明

### ⚠️ 重要：KV Namespace ID 配置

**必须在 wrangler.toml 中填写真实的 KV namespace ID**，否则每次部署都会重置绑定！

#### 获取 KV Namespace ID

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 Workers & Pages → KV
3. 点击你创建的 namespace
4. 复制 **Namespace ID**（如：`284b840f70de434fae9732f74ee2290e`）

#### 配置 wrangler.toml

将复制的 ID 填入 [wrangler.toml](file:///d:/project/secret%20note/wrangler.toml) 第 16 行：

```toml
[[kv_namespaces]]
binding = "NOTES"
id = "你的真实KV_NAMESPACE_ID"  # 替换 YOUR_KV_NAMESPACE_ID_HERE
```

### 密码设置

**推荐方式**：在 Cloudflare Dashboard 设置，不会被部署覆盖

- **Pages 项目**：Settings → Environment variables → Add variable
- **Workers 项目**：Settings → Variables and Secrets → Add variable
- Name: `PASSWORD`
- Value: 你的密码

## 安全建议

- 使用强密码
- 定期更换密码
- 不要在代码中硬编码密码，使用 Cloudflare Dashboard 设置环境变量
- 启用 Cloudflare 的访问规则（可选）

## API 端点

- `POST /api/auth` - 验证密码，获取访问令牌
- `GET /api/notes` - 获取笔记内容（需要认证）
- `POST /api/notes` - 保存笔记内容（需要认证）

## 故障排除

### 每次部署后绑定丢失

**原因**：wrangler.toml 中没有配置 KV namespace ID

**解决方案**：
1. 在 Cloudflare Dashboard 获取 KV namespace ID
2. 将 ID 填入 wrangler.toml 的 `[[kv_namespaces]]` 部分
3. 推送代码重新部署

### KV 命名空间未绑定

**症状**：无法保存笔记，或提示 KV 错误

**解决方案**：
1. 确保 wrangler.toml 中的 KV namespace ID 是真实的（不是 `YOUR_KV_NAMESPACE_ID_HERE`）
2. 确保 `binding = "NOTES"` 没有拼写错误
3. 重新部署项目

### 密码验证失败

- 检查环境变量 `PASSWORD` 是否正确设置
- 确保在 Settings -> Environment variables 中添加了环境变量
- 变量名必须是 `PASSWORD`（大写）

### 部署失败

- 确保已登录 Cloudflare 账户
- 检查是否有足够的权限
- 确认账户有可用的 Workers 配额
- 查看 Cloudflare Pages 的构建日志

### 无法保存笔记

- 确认 KV 命名空间已正确绑定
- 检查 Worker 是否有写入 KV 的权限
- 查看 Worker 日志排查错误
