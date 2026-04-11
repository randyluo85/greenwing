| 版本号 | 创建时间 | 更新时间 | 文档主题 | 创建人 |
| :---: | :---: | :---: | :---: | :---: |
| v1.0 | 2026-04-09 | 2026-04-09 | 微信小程序数据库设计与数据流规范 | Randy Luo |
| v2.0 | 2026-04-09 | 2026-04-09 | 迁移至云开发：云数据库集合定义 | Randy Luo |

# 数据结构定义 (data_schema)

本文档定义微信云开发环境下的云数据库集合(collection)结构。云数据库为文档型（类 MongoDB），无需建表语句，按集合存储 JSON 文档。

基于《青翼读书会PRD v2.0》推导。

---

## 1. 集合定义

### 1.1 users (用户)

```json
{
  "_id": "自动生成",
  "open_id": "oZp5njTTsWaCeEoXi14oeOVCKlik",
  "phone": "13800138000",
  "nickname": "张三",
  "avatar_url": "cloud://xxx/avatar.png",
  "member_no": "QY20260409001",
  "role": "user",
  "level": "bronze",
  "total_points": 120,
  "current_points": 80,
  "last_sign_date": "2026-04-09",
  "continuous_sign_days": 3,
  "created_at": "2026-04-09T10:00:00.000Z",
  "updated_at": "2026-04-09T10:00:00.000Z"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| open_id | string | Y | 微信 OpenID，唯一标识 |
| phone | string | N | 绑定手机号 |
| nickname | string | N | 用户昵称 |
| avatar_url | string | N | 头像地址 |
| member_no | string | Y | 会员号，唯一，注册时生成 |
| role | string | Y | 枚举: `user` / `admin` / `verifier` |
| level | string | Y | 枚举: `bronze` / `silver` / `gold` |
| total_points | number | Y | 累计总积分（决定等级） |
| current_points | number | Y | 当前可用积分（用于消费） |
| last_sign_date | string | N | 最近签到日期 (YYYY-MM-DD) |
| continuous_sign_days | number | Y | 连续签到天数 |
| created_at | date | Y | 注册时间 |
| updated_at | date | Y | 更新时间 |

**索引**: `open_id`(唯一), `member_no`(唯一)

---

### 1.2 events (活动)

```json
{
  "_id": "自动生成",
  "title": "四月读书分享会",
  "cover_image": "cloud://xxx/cover.jpg",
  "category": "读书会",
  "speaker": "李老师",
  "event_time": "2026-04-20T14:00:00.000Z",
  "registration_deadline": "2026-04-18T23:59:59.000Z",
  "location": "青翼空间 3F 多功能厅",
  "description": "富文本活动详情...",
  "quota": 30,
  "enrolled_count": 12,
  "registration_mode": "paid",
  "points_cost": 0,
  "tier_threshold": "bronze",
  "price": 2900,
  "refund_policy": "full_refund_before_24_hours",
  "reward_points": 50,
  "status": "published",
  "created_at": "2026-04-09T10:00:00.000Z",
  "updated_at": "2026-04-09T10:00:00.000Z"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | Y | 活动标题 |
| cover_image | string | N | 封面图 |
| category | string | N | 分类: 读书会 / 特邀沙龙 / 其他 |
| speaker | string | N | 主讲人 |
| event_time | date | Y | 活动时间 |
| registration_deadline | date | N | 报名截止时间 |
| location | string | N | 活动地点 |
| description | string | N | 富文本详情 |
| quota | number | N | 人数上限 |
| enrolled_count | number | Y | 已报名人数（冗余计数） |
| registration_mode | string | Y | `free` / `points_only` / `paid` |
| points_cost | number | N | 积分报名所需积分（points_only 模式） |
| tier_threshold | string | N | 等级门槛: `none` / `bronze` / `silver` / `gold` |
| price | number | N | 报名费，单位分（paid 模式） |
| refund_policy | string | N | 退款策略: `no_refund` / `full_refund_before_24_hours` / `custom` |
| reward_points | number | N | 核销后奖励积分 |
| status | string | Y | `draft` / `published` / `ended` |
| created_at | date | Y | 创建时间 |
| updated_at | date | Y | 更新时间 |

**索引**: `status`, `event_time`, `category`

---

### 1.3 registrations (活动报名)

```json
{
  "_id": "自动生成",
  "user_id": "users集合的_id",
  "open_id": "oZp5njTTsWaCeEoXi14oeOVCKlik",
  "event_id": "events集合的_id",
  "order_id": "orders集合的_id（付费活动时关联）",
  "verify_code": "QY-20260420-A8K3M",
  "status": "pending",
  "qrcode_url": "cloud://xxx/qrcodes/QY-0420-A8K3M.png",
  "verified_by": "核销管理员的open_id",
  "verified_at": "2026-04-20T14:05:00.000Z",
  "created_at": "2026-04-09T10:00:00.000Z",
  "updated_at": "2026-04-09T10:00:00.000Z"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | string | Y | 关联 users._id |
| open_id | string | Y | 冗余，方便查询 |
| event_id | string | Y | 关联 events._id |
| order_id | string | N | 付费活动关联 orders._id |
| verify_code | string | Y | 核销码，唯一 |
| qrcode_url | string | N | 小程序码图片云存储 fileID，懒加载生成 |
| status | string | Y | `pending` / `cancelled` / `verified` |
| verified_by | string | N | 核销人 open_id |
| verified_at | date | N | 核销时间 |
| created_at | date | Y | 报名时间 |
| updated_at | date | Y | 更新时间 |

**索引**: `user_id`, `event_id`, `verify_code`(唯一), `user_id + event_id`(组合唯一，防重复报名)

---

### 1.4 orders (支付订单)

```json
{
  "_id": "自动生成",
  "order_no": "QY20260409143500001",
  "transaction_id": "微信支付回调的流水号",
  "user_id": "users集合的_id",
  "open_id": "oZp5njTTsWaCeEoXi14oeOVCKlik",
  "event_id": "events集合的_id",
  "amount": 2900,
  "status": "pending",
  "pay_time": null,
  "refund_time": null,
  "refund_reason": "",
  "expire_at": "2026-04-09T14:50:00.000Z",
  "created_at": "2026-04-09T14:35:00.000Z",
  "updated_at": "2026-04-09T14:35:00.000Z"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_no | string | Y | 内部订单号，唯一 |
| transaction_id | string | N | 微信支付流水号（回调后填入） |
| user_id | string | Y | 关联 users._id |
| open_id | string | Y | 冗余 |
| event_id | string | Y | 关联 events._id |
| amount | number | Y | 金额，单位分 |
| status | string | Y | `pending` / `paid` / `failed` / `refunding` / `refunded` / `closed` |
| pay_time | date | N | 支付成功时间 |
| refund_time | date | N | 退款时间 |
| refund_reason | string | N | 退款原因 |
| expire_at | date | Y | 订单过期时间（创建后15分钟） |
| created_at | date | Y | 创建时间 |
| updated_at | date | Y | 更新时间 |

**索引**: `order_no`(唯一), `open_id`, `event_id`, `status`

---

### 1.5 point_logs (积分流水)

```json
{
  "_id": "自动生成",
  "user_id": "users集合的_id",
  "open_id": "oZp5njTTsWaCeEoXi14oeOVCKlik",
  "amount": 10,
  "type": "daily_sign",
  "related_id": "关联的registration_id或event_id",
  "description": "每日签到奖励",
  "created_at": "2026-04-09T10:00:00.000Z"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | string | Y | 关联 users._id |
| open_id | string | Y | 冗余 |
| amount | number | Y | 变动数量（正=获得，负=消耗） |
| type | string | Y | `daily_sign` / `event_enroll` / `event_reward` / `admin_adjust` / `refund` |
| related_id | string | N | 关联ID |
| description | string | Y | 流水说明 |
| created_at | date | Y | 记录时间 |

**索引**: `user_id`, `type`, `created_at`

---

### 1.6 comments (活动讨论)

```json
{
  "_id": "自动生成",
  "event_id": "events集合的_id",
  "user_id": "users集合的_id",
  "open_id": "oZp5njTTsWaCeEoXi14oeOVCKlik",
  "nickname": "张三",
  "avatar_url": "cloud://xxx/avatar.png",
  "content": "期待这次活动！",
  "status": "visible",
  "created_at": "2026-04-09T10:00:00.000Z"
}
```

**索引**: `event_id`, `created_at`

---

### 1.7 banners (首页轮播)

```json
{
  "_id": "自动生成",
  "image_url": "cloud://xxx/banner1.jpg",
  "title": "世界读书日特别活动",
  "subtitle": "4月23日 诚邀书友共赴文学盛宴",
  "redirect_type": "event",
  "redirect_url": "/pages/event-detail/event-detail?id=xxx",
  "sort_order": 1,
  "status": "online",
  "created_at": "2026-04-09T10:00:00.000Z",
  "updated_at": "2026-04-09T10:00:00.000Z"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `image_url` | string | 是 | 轮播图片 cloud:// URL |
| `title` | string | 否 | 主标题，显示在图片左下角 |
| `subtitle` | string | 否 | 副标题，显示在主标题下方 |
| `redirect_type` | string | 否 | 跳转类型: `event`(活动) \| `article`(文章) \| `page`(页面) |
| `redirect_url` | string | 否 | 跳转目标路径 |
| `sort_order` | number | 是 | 排序序号（升序） |
| `status` | string | 是 | `online` / `offline` |

**索引**: `status`, `sort_order`

---

### 1.8 settings (系统配置)

新增集合，存储积分规则、等级阈值等全局配置。

```json
{
  "_id": "points_config",
  "daily_sign_base": 10,
  "daily_sign_bonus": 5,
  "level_thresholds": {
    "bronze": 0,
    "silver": 500,
    "gold": 1000
  },
  "order_expire_minutes": 15
}
```

**索引**: `_id`

---

### 1.9 books (好书推荐)

```json
{
  "_id": "自动生成",
  "title": "咸的玩笑",
  "author": "刘震云",
  "cover_image": "cloud://xxx/books/book1.png",
  "rating": 9.8,
  "description": "内容简介...",
  "status": "published",
  "sort_order": 1,
  "created_at": "2026-04-11T10:00:00.000Z",
  "updated_at": "2026-04-11T10:00:00.000Z"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | Y | 书名 |
| author | string | Y | 作者 |
| cover_image | string | Y | 封面图地址 |
| rating | number | N | 推荐评分 (例: 9.8) |
| description | string | N | 内容简介 |
| status | string | Y | `draft` / `published` |
| sort_order | number | N | 排序权重，越大越靠前 |
| created_at | date | Y | 创建时间 |
| updated_at | date | Y | 更新时间 |

**索引**: `status`, `sort_order`

---

### 1.10 notifications (通知消息)

```json
{
  "_id": "自动生成",
  "open_id": "oZp5njTTsWaCeEoXi14oeOVCKlik",
  "title": "签到成功",
  "content": "恭喜你获得10积分！",
  "type": "points",
  "is_read": false,
  "related_id": "关联的记录ID",
  "created_at": "2026-04-11T10:00:00.000Z"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| open_id | string | Y | 接收通知的用户 OpenID |
| title | string | Y | 通知标题 |
| content | string | N | 通知内容 |
| type | string | Y | `points` / `event` / `system` |
| is_read | boolean | Y | 是否已读，默认 false |
| related_id | string | N | 关联的记录 ID |
| created_at | date | Y | 创建时间 |

**索引**: `open_id`, `is_read`, `created_at`

**安全规则**: CUSTOM - `read: "doc.open_id == auth.openid"`, `write: "doc.open_id == auth.openid"`

---

## 2. 云数据库安全规则要点

| 集合 | 权限类型 | 规则 | 说明 |
|------|---------|------|------|
| users | CUSTOM | `read: "doc.open_id == auth.openid"`, `write: false` | 用户只能读自己的数据 |
| events | READONLY | - | 公开只读 |
| registrations | CUSTOM | `read: "doc.open_id == auth.openid"`, `write: false` | 用户只能读自己的报名 |
| orders | CUSTOM | `read: "doc.open_id == auth.openid"`, `write: false` | 用户只能读自己的订单 |
| point_logs | CUSTOM | `read: "doc.open_id == auth.openid"`, `write: false` | 用户只能读自己的积分 |
| comments | CUSTOM | `read: "doc.open_id == auth.openid"`, `write: false` | 用户只能读自己的评论 |
| banners | READONLY | - | 公开只读 |
| settings | READONLY | - | 公开只读 |
| books | READONLY | - | 公开只读 |
| notifications | CUSTOM | `read/write: "doc.open_id == auth.openid"` | 用户可读写自己的通知 |

---

## 3. 云函数与数据操作约定

### 并发安全

云数据库支持事务 (`db.runTransaction`)，报名、积分扣减、订单创建等核心操作必须在云函数中用事务包裹：

```javascript
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const transaction = await db.startTransaction()
  try {
    // 1. 查活动名额（事务内读取）
    const eventDoc = await transaction.doc(eventId).get()

    // 2. 验证名额
    if (eventDoc.data.enrolled_count >= eventDoc.data.quota) {
      await transaction.rollback()
      return { success: false, message: '名额已满' }
    }

    // 3. 执行业务操作...
    await transaction.commit()
    return { success: true, data: result }
  } catch (e) {
    await transaction.rollback()
    return { success: false, message: e.message }
  }
}
```

### 计数器更新

`enrolled_count` 等冗余计数字段使用原子操作：
```javascript
db.collection('events').doc(eventId).update({
  data: { enrolled_count: _.inc(1) }
})
```

### 分页查询

客户端默认 20 条，云函数 100 条。用 `skip` + `limit` 实现分页：
```javascript
const { page = 1, pageSize = 10 } = event
const list = await db.collection('events')
  .where({ status: 'published' })
  .orderBy('event_time', 'desc')
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .get()
```
