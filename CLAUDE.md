# CLAUDE.md - 青翼读书会小程序开发规范

## 项目背景
- **目标**: 开发基于 uni-app + Node.js + SQLite 的微信小程序。
- **核心逻辑**: 成熟 AI 技术落地，追求快速迭代与极简架构（VibeCoding）。
- **技术栈**: 前端 uni-app (Vue3), 后端 Node.js (Express), 数据库 SQLite (Sequelize)。

## 关键目录结构
- 前端: `/frontend` (uni-app 标准结构)
- 后端: `/backend` (Node.js 入口为 app.js)
- 数据库: `/backend/db/main.sqlite`
- 上下文: `/.vibe-context/` (包含业务逻辑和数据表定义)

## 编程规范
### 前端 (uni-app / Vue3)
- 使用 `uni.request` 封装统一请求工具。
- 页面必须适配微信小程序环境（避免使用仅 H5 支持的 DOM 操作）。
- UI 风格: 简洁、现代，优先使用 uni-ui 组件库。
- 样式: 优先使用 CSS 变量，确保在微信小程序中无兼容性问题。

### 后端 (Node.js / Express)
- 路由: 保持扁平化，逻辑写在 `controllers/` 中。
- 数据库: 使用 Sequelize 操作 SQLite，确保有模型定义（Models）。
- AI 集成: 必须支持流式输出 (Server-Sent Events)，用于提升对话体验。
- 错误处理: 统一返回 JSON 格式：`{ success: boolean, data: any, message: string }`。

### 数据库 (SQLite)
- 严禁手动改库：所有变更必须通过 `/backend/models` 的定义由 Sequelize 同步。
- 敏感信息: API Key 等必须读取 `.env` 文件。

## 常用指令
- 安装依赖: `npm install` (分别在 frontend 和 backend 运行)
- 启动后端: `node backend/app.js`
- 调试前端: 使用 HBuilderX 运行到微信开发者工具

## VibeCoding 原则
1. **先对齐逻辑**: 编写代码前先读取 `/.vibe-context/` 中的 `.md` 文件。
2. **拒绝过度工程**: 如果能用 50 行代码解决问题，不要写 200 行。
3. **保持上下文**: 修改代码后，及时更新 `/.vibe-context/data_schema.md`。