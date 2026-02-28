# 加密笔记 - Cloudflare Workers 部署指南

## 功能特点

- 🔐 密码保护访问
- 💾 数据存储在 Cloudflare KV
- 🎨 现代化 UI 界面
- 📱 响应式设计
- ⚡ 快速部署

## 部署步骤

### 方式一：通过 Cloudflare Dashboard 直接部署（推荐）

**注意**：Dashboard 部署不需要修改任何配置文件，所有配置都在 Dashboard 界面中完成。

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

### 方式二：通过 Wrangler CLI 部署

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
- `wrangler.toml` - CLI 部署配置文件（需要填写 KV namespace ID）
- `wrangler-dashboard.toml` - Dashboard 部署配置文件（无需填写 ID，用于参考）
- `package.json` - 项目依赖配置

## 配置文件说明

项目提供两个配置文件，根据你的部署方式选择：

### wrangler.toml（CLI 部署）
- 用于 `wrangler deploy` 命令部署
- 需要填写 KV namespace 的 `id` 字段
- 可以在 `[vars]` 部分设置密码

### wrangler-dashboard.toml（Dashboard 部署）
- 仅供参考，展示 Dashboard 部署时的配置
- 无需填写 KV namespace ID（在 Dashboard 界面绑定）
- 密码在 Dashboard 界面设置

**重要**：Dashboard 部署时，KV namespace 和密码都在 Dashboard 界面中配置，不需要修改配置文件。

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

### KV 命名空间未绑定

**Dashboard 部署方式**：
- 确保在 Settings -> Variables -> KV Namespace Bindings 中正确绑定了 KV 命名空间
- Variable name 必须是 `NOTES`

**CLI 部署方式**：
- 确保 `wrangler.toml` 中的 KV 命名空间 ID 正确配置

### 密码验证失败

- 检查环境变量 `PASSWORD` 是否正确设置
- 确保在 Settings -> Variables and Secrets 中添加了环境变量
- 变量名必须是 `PASSWORD`（大写）

### 部署失败

- 确保已登录 Cloudflare 账户
- 检查是否有足够的权限
- 确认账户有可用的 Workers 配额

### 无法保存笔记

- 确认 KV 命名空间已正确绑定
- 检查 Worker 是否有写入 KV 的权限
- 查看 Worker 日志排查错误
