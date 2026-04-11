# CLAUDE.md - 青翼读书会小程序开发规范

## 项目背景
- **目标**: 开发基于微信原生小程序 + 云开发的读书会平台。
- **核心功能**: 活动报名(免费/积分/付费)、积分体系、微信支付、扫码核销。
- **技术栈**: 原生小程序 (WXML/WXSS/JS) + 微信云开发 (云函数 + 云数据库) + Web 管理后台 (Vue3 + Element Plus)。

## 架构总览

```
┌── 用户端: 微信原生小程序 ──────────────────────┐
│  wx.cloud.callFunction()  --> 云函数 (业务逻辑)  │
│  wx.cloud.database()      --> 云数据库 (直读)    │
│  wx.cloud.callContainer() --> 云托管 (支付)      │
│  + 扫码核销 (管理员手机端操作)                    │
└──────────────────────────────────────────────┘
                │
                ▼ 共享同一个云开发环境
┌── 管理端: Web 后台 ───────────────────────────┐
│  Vue3 + Element Plus                           │
│  @cloudbase/js-sdk --> 云数据库 / 云函数        │
│  部署在云开发静态网站托管                        │
│  功能: 用户管理 / 积分调整 / 活动管理 /          │
│       订单管理 / 退款审批 / 内容管理 / 财务看板  │
└──────────────────────────────────────────────┘
```

## 关键目录结构
```
/miniprogram                # 用户端小程序
  /pages
    /index/                 # 首页
    /event/                 # 活动总聚合栏 (大厅 + 我的活动 Tab)
    /event-detail/          # 活动详情
    /order-confirm/         # 订单确认页
    /book/                  # 读书/好书推荐模块 (新增)
    /store/                 # 商城模块 (占位)
    /my/                    # 个人中心
    /points/                # 积分明细
    /verify/                # 管理员扫码核销页
  /components
  /utils
    /cloud.js               # 云开发封装
    /auth.js                # 登录鉴权
    /util.js                # 通用工具
  /styles
  /images
  app.js                    # 入口(含 wx.cloud.init)
  app.json
  app.wxss
/cloudfunctions             # 云函数(小程序端和 Web 端共用)
  /user/                    # 用户相关(登录/签到/积分)
  /event/                   # 活动相关(报名/取消/核销)
  /pay/                     # 支付相关(统一下单/回调/退款)
  /admin/                   # 管理端(用户管理/积分调整/退款审批)
  /common/                  # 共享工具函数
/web-admin                  # Web 管理后台
  /src
    /views
      /Dashboard.vue        # 数据概览
      /Users.vue            # 用户管理 + 积分调整
      /Events.vue           # 活动管理
      /Orders.vue           # 订单管理 + 退款审批
      /Content.vue          # 轮播 + 推荐管理
      /Settings.vue         # 积分规则 + 等级配置
    /utils
      /cloud.js             # @cloudbase/js-sdk 初始化封装
      /auth.js              # 邮箱登录鉴权
    /components             # 公共组件(表格/筛选/导出)
    /router
    App.vue
    main.js
  package.json
  vite.config.js
/.vibe-context/             # 业务上下文文档
```

## 编程规范

### 前端 (原生小程序)
- 使用 `wx.cloud.callFunction()` 调用云函数，统一在 `utils/cloud.js` 中封装。
- 使用 `wx.cloud.database()` 做简单的客户端直读（仅公开数据，受安全规则约束）。
- 页面间传参使用 URL query，避免全局变量污染。
- UI 风格: 遵循 Tehran 原型视觉体系（Teal/绿青色主色调 `#14b8a6`），大留白、毛玻璃及轻量圆角，复用 Web 现代 Minimalist 风格转原生组件。
- 样式: 使用 rpx 适配多屏，全局 CSS 变量定义在 `app.wxss`。
- 用户登录: 调用 `wx.login()` 获取 code，云函数中通过 `cloud.getWXContext()` 获取 openid。

### 云函数
- 每个云函数独立目录，入口文件为 `index.js`，依赖写在同目录 `package.json`。
- 使用 `wx-server-sdk` 操作数据库: `const db = cloud.database()`。
- 初始化必须指定环境: `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })`。
- 返回格式统一: `{ success: boolean, data: any, message: string }`。
- openid 等用户信息从 `cloud.getWXContext()` 获取，禁止前端传入。

### 数据库 (云数据库)
- 云数据库为文档型数据库（类 MongoDB），数据以集合(collection)为单位。
- **禁止从控制台直接改数据**: 结构变更须更新 `.vibe-context/data_schema.md` 后通过代码同步。
- 安全规则: 根据集合的读写需求配置（用户只能操作自己的数据，管理员可操作所有）。
- 客户端查询默认限制 20 条，云函数限制 100 条，分页用 `skip()` + `limit()`。

### 支付 (云调用)
- 使用云托管服务处理微信支付，免签名、免证书、免 access_token。
- 统一下单接口: `http://api.weixin.qq.com/_/pay/unifiedOrder`。
- 退款接口: `http://api.weixin.qq.com/_/pay/refund`。
- 回调处理: 支付结果通过云托管回调路径接收，返回 `{ errcode: 0 }` 确认。
- 金额单位: **分**，后端校验，不信任前端传值。

### 入场小程序码 (云调用)
- 使用 `cloud.openapi.wxacode.getUnlimited` 生成用户专属小程序码，`scene` 参数编码 `verify_code`。
- 云函数需在 `config.json` 中声明权限: `{ "permissions": { "openapi": ["wxacode.getUnlimited"] } }`。
- **开发阶段**: `checkPath` 必须设为 `false`（小程序未发布，`true` 会导致生成失败）。
- **上线后**: 改为 `true` 或去掉该参数，确保 page 路径校验生效。
- 部署云函数后 `config.json` 权限约 **10 分钟**生效，不要部署后立刻测试。

### 管理端职责划分
管理端分为两部分，各自负责最适合的操作场景：

| 端 | 功能 | 说明 |
|----|------|------|
| **小程序** | 扫码核销 | 必须在手机上操作，调用摄像头扫码 |
| **Web 后台** | 用户管理、积分调整、活动管理、订单管理、退款审批、内容管理、财务看板 | 电脑端操作，表格/表单体验好 |

### Web 管理后台 (Vue3 + Element Plus)
- 使用 `@cloudbase/js-sdk` 接入云开发，初始化封装在 `utils/cloud.js`。
- 登录鉴权: 云开发邮箱密码登录，管理员账号在云开发控制台预先创建。
- 数据操作: 简单查询用 Web SDK 直连云数据库，业务逻辑（退款、积分调整）用 `app.callFunction()` 调用云函数。
- 云函数 `admin` 是管理端专用的，内部必须校验调用者身份（通过 Web SDK 的 auth 获取用户信息，匹配管理员白名单）。
- 部署: `npm run build` 后上传到云开发静态网站托管。
- 样式: Element Plus 组件库，后台风格简洁高效。

## 常用指令
- 小程序: 微信开发者工具导入项目根目录
- 上传云函数: 右键云函数目录 -> 上传并部署
- 小程序调试: 微信开发者工具自带云函数本地调试
- 数据库管理: 云开发控制台 -> 数据库
- Web 后台开发:
  - `cd web-admin && npm install`
  - `npm run dev` 本地开发
  - `npm run build` 打包后上传到云开发静态网站托管

## VibeCoding 原则
1. **先对齐逻辑**: 编写代码前先读取 `/.vibe-context/` 中的 `.md` 文件。
2. **拒绝过度工程**: 如果能用 50 行代码解决问题，不要写 200 行。
3. **保持上下文**: 修改代码后，及时更新 `/.vibe-context/data_schema.md`。
4. **云开发优先**: 能用云函数解决的不自建服务，能用安全规则解决的不写鉴权代码。
