| 版本号 | 创建时间 | 更新时间 | 文档主题 | 创建人 |
| :---: | :---: | :---: | :---: | :---: |
| v1.0 | 2026-04-09 | 2026-04-09 | 微信小程序数据库设计与数据流规范 | Randy Luo |

# 数据结构定义 (data_schema)

本文档旨在为后端的 Node.js + Sequelize + SQLite 架构提供核心数据模型与表结构定义，确保跨端开发与后续迭代具备统一标准。基于《青翼读书会PRD》及现有 Emerald-Modern 等前端原型推导而出。

## 1. 核心数据表结构

### 1.1 User (用户卡片)
映射微信生态下的用户实体与读书会自身的会员体系。

```javascript
// models/User.js
{
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  open_id: { type: DataTypes.STRING(128), unique: true, comment: "微信OpenID" },
  phone: { type: DataTypes.STRING(20), unique: true, comment: "绑定实名手机号" },
  nickname: { type: DataTypes.STRING(64), comment: "用户昵称" },
  avatar_url: { type: DataTypes.STRING(255), comment: "头像地址" },
  member_no: { type: DataTypes.STRING(32), unique: true, comment: "业务会员号" },
  role: { type: DataTypes.ENUM('user', 'admin', 'verifier'), defaultValue: 'user', comment: "角色权限" },
  level: { type: DataTypes.ENUM('bronze', 'silver', 'gold'), defaultValue: 'bronze', comment: "会员等级" },
  total_points: { type: DataTypes.INTEGER, defaultValue: 0, comment: "累计总积分(决定等级)" },
  current_points: { type: DataTypes.INTEGER, defaultValue: 0, comment: "当前可用积分(用于消费)" },
  created_at: { type: DataTypes.DATE },
  updated_at: { type: DataTypes.DATE }
}
```

### 1.2 Event (活动表)
包含读书会、特邀沙龙等活动的所有展示、时间、状态和核销标准。

```javascript
// models/Event.js
{
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(128), allowNull: false, comment: "活动标题" },
  cover_image: { type: DataTypes.STRING(255), comment: "封面图/长图介绍" },
  category: { type: DataTypes.STRING(32), comment: "活动分类" },
  speaker: { type: DataTypes.STRING(64), comment: "主讲导师" },
  event_time: { type: DataTypes.DATE, comment: "活动具体时间" },
  registration_deadline: { type: DataTypes.DATE, comment: "报名截止时间" },
  location: { type: DataTypes.STRING(255), comment: "活动地点" },
  description: { type: DataTypes.TEXT, comment: "富文本活动详情" },
  quota: { type: DataTypes.INTEGER, comment: "人数上限" },
  enrolled_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: "已报名人数冗余" },
  is_paid: { type: DataTypes.BOOLEAN, defaultValue: false, comment: "是否开启付费报名" },
  price: { type: DataTypes.INTEGER, defaultValue: 0, comment: "门票价格(单位:分)" },
  require_points: { type: DataTypes.INTEGER, defaultValue: 0, comment: "报名消耗积分" },
  reward_points: { type: DataTypes.INTEGER, defaultValue: 0, comment: "核销后奖励积分" },
  min_level: { type: DataTypes.ENUM('bronze', 'silver', 'gold'), defaultValue: 'bronze', comment: "门槛等级" },
  status: { type: DataTypes.ENUM('draft', 'published', 'ended'), defaultValue: 'draft', comment: "上下架及结束状态" },
  created_at: { type: DataTypes.DATE },
  updated_at: { type: DataTypes.DATE }
}
```

### 1.3 EventRegistration (活动报名表)
支持库存防重锁的设计以及线上报名-线下核销的业务流。

```javascript
// models/EventRegistration.js
{
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, comment: "外键 -> User.id" },
  event_id: { type: DataTypes.INTEGER, comment: "外键 -> Event.id" },
  order_id: { type: DataTypes.INTEGER, comment: "外键 -> PaymentOrder.id (付费活动订单外键)" },
  verify_code: { type: DataTypes.STRING(64), unique: true, comment: "入场核销码(防伪串及二维码)" },
  status: { type: DataTypes.ENUM('pending', 'cancelled', 'verified'), defaultValue: 'pending', comment: "待参加/已取消/已签到" },
  verified_by: { type: DataTypes.INTEGER, comment: "外键 -> User.id (核销管理员), 用于溯源" },
  verified_at: { type: DataTypes.DATE, comment: "核销具体时间" },
  created_at: { type: DataTypes.DATE },
  updated_at: { type: DataTypes.DATE }
}
```

### 1.4 PaymentOrder (微信支付订单)
处理用户通过微信支付报名付费活动的费用及回调信息。

```javascript
// models/PaymentOrder.js
{
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_no: { type: DataTypes.STRING(64), unique: true, comment: "内部商户统一订单号" },
  transaction_id: { type: DataTypes.STRING(128), comment: "微信支付系统回调的流水编号" },
  user_id: { type: DataTypes.INTEGER, comment: "外键 -> User.id" },
  event_id: { type: DataTypes.INTEGER, comment: "外键 -> Event.id" },
  amount: { type: DataTypes.INTEGER, comment: "订单金额(单位:分)" },
  status: { type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'), defaultValue: 'pending', comment: "订单状态" },
  pay_time: { type: DataTypes.DATE, comment: "支付成功时间" },
  refund_time: { type: DataTypes.DATE, comment: "退款成功时间(如需退款)" },
  created_at: { type: DataTypes.DATE },
  updated_at: { type: DataTypes.DATE }
}
```

### 1.5 PointLog (积分流水明细)
所有积分和等级跳跃的计算依据，绝对真实不可随意篡改。

```javascript
// models/PointLog.js
{
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, comment: "外键 -> User.id" },
  amount: { type: DataTypes.INTEGER, comment: "变动数量(带有正负号)" },
  type: { type: DataTypes.ENUM('daily_sign', 'event_enroll', 'event_reward', 'admin_adjust'), comment: "明细类型" },
  related_id: { type: DataTypes.INTEGER, comment: "冗余关联ID(活动注册ID或对应行为ID)" },
  description: { type: DataTypes.STRING(255), comment: "对C端展示的流水说明" },
  created_at: { type: DataTypes.DATE }
}
```

### 1.6 EventComment (活动讨论 / 留言模块)
从原型 `event-detail.html` 的报名后状态扩展出的模块。

```javascript
// models/EventComment.js
{
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  event_id: { type: DataTypes.INTEGER, comment: "外键 -> Event.id" },
  user_id: { type: DataTypes.INTEGER, comment: "外键 -> User.id" },
  content: { type: DataTypes.STRING(512), comment: "评论与发问文本" },
  status: { type: DataTypes.ENUM('visible', 'hidden'), defaultValue: 'visible', comment: "管理员审核隐藏标记" },
  created_at: { type: DataTypes.DATE }
}
```

### 1.7 Banner (首页焦点头图)
简单的首页热区配置流。

```javascript
// models/Banner.js
{
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  image_url: { type: DataTypes.STRING(255), comment: "图片直达URL" },
  redirect_url: { type: DataTypes.STRING(255), comment: "点击后的小程序内部跳转路径" },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0, comment: "展示权重排序" },
  status: { type: DataTypes.ENUM('online', 'offline'), defaultValue: 'online', comment: "上架状态" },
  created_at: { type: DataTypes.DATE },
  updated_at: { type: DataTypes.DATE }
}
```

---

## 2. 关系映射定义 (Associations)

如果使用 Sequelize 管理模型关联，请务必定义以下关系以提升联表查效率：

1. **User 和 EventRegistration**：
   - `User.hasMany(EventRegistration, { foreignKey: 'user_id' })`
   - `EventRegistration.belongsTo(User, { foreignKey: 'user_id' })`
2. **Event 和 EventRegistration**：
   - `Event.hasMany(EventRegistration, { foreignKey: 'event_id' })`
   - `EventRegistration.belongsTo(Event, { foreignKey: 'event_id' })`
3. **User 和 PointLog**：
   - `User.hasMany(PointLog, { foreignKey: 'user_id' })`
   - `PointLog.belongsTo(User, { foreignKey: 'user_id' })`
4. **Event 和 EventComment**：
   - `Event.hasMany(EventComment, { foreignKey: 'event_id' })`
   - `EventComment.belongsTo(Event, { foreignKey: 'event_id' })`
5. **PaymentOrder (支付订单) 相关**：
   - `User.hasMany(PaymentOrder, { foreignKey: 'user_id' })`
   - `Event.hasMany(PaymentOrder, { foreignKey: 'event_id' })`
   - `EventRegistration.belongsTo(PaymentOrder, { foreignKey: 'order_id' })`

## 3. 并发与事务说明
为了防止活动秒杀和黄牛现象，针对扣积分及报名业务，在 Node.js 中必须采用“事务”：
```javascript
const transaction = await sequelize.transaction();
try {
  // 1. 获取活动详情，验证 quota > enrolled_count (用 SELECT ... FOR UPDATE 加行锁)
  // 2. 如果是积分活动: 验证 User 当前积分是否充足，扣除积分并生成 PointLog 流水。
  // 3. 如果是付费活动: 统一下单生成 PaymentOrder。待微信支付成功回调后，校验回调订单的金额和状态。
  // 4. (支付完成/积分扣除完成后) 生成 EventRegistration 数据及其核销码。
  // 5. Event 表 enrolled_count + 1
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  // 统一错误处理
}
```
