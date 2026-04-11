/**
 * 青翼读书会 - 云数据库 Mock 数据
 * 使用方法: 在云开发控制台 -> 数据库 -> 对应集合 -> 导入 JSON
 * 注意: _id 字段导入时会自动生成，如需指定需手动添加
 */

// ============================================================
// 1. events (活动) - 4 条
// ============================================================
const events = [
  {
    "title": "古典主义回响：维吉尔《埃涅阿斯纪》精读营",
    "cover_image": "/images/event.jpg",
    "category": "特邀沙龙",
    "speaker": "王文博",
    "speaker_title": "复旦大学古典文学教授",
    "event_time": { "$date": "2026-04-18T15:30:00.000Z" },
    "registration_deadline": { "$date": "2026-04-17T23:59:59.000Z" },
    "location": "青翼读书会·主茶室",
    "address": "重庆市南岸区南山路128号",
    "description": "三月残花落更开，小檐日日燕飞来。在这春风沉醉的时节，我们邀请了知名古典文学学者、作家王文博，与大家共同品鉴唐宋诗词中的春日意象。本次沙龙将从诗词文本出发，探讨古人的自然观与生命美学。现场还将设有传统的飞花令环节，在茶香与墨色间，寻回那份久违的诗意生活。",
    "quota": 50,
    "enrolled_count": 21,
    "registration_mode": "paid",
    "points_cost": 0,
    "tier_threshold": "none",
    "price": 2000,
    "refund_policy": "full_refund_before_24_hours",
    "reward_points": 50,
    "status": "published",
    "created_at": { "$date": "2026-04-01T10:00:00.000Z" },
    "updated_at": { "$date": "2026-04-10T10:00:00.000Z" }
  },
  {
    "title": "博尔赫斯的迷宫：《小径分岔的花园》",
    "cover_image": "/images/event.jpg",
    "category": "读书会",
    "speaker": "陈思和",
    "speaker_title": "比较文学研究者",
    "event_time": { "$date": "2026-04-25T15:30:00.000Z" },
    "registration_deadline": { "$date": "2026-04-24T23:59:59.000Z" },
    "location": "青翼读书会·影音室",
    "address": "重庆市南岸区南山路128号",
    "description": "博尔赫斯说：「我总以为天堂是图书馆的模样。」在《小径分岔的花园》中，时间分叉、平行、又交汇。本次读书会将带领读者深入这部短篇小说集，探讨其中关于时间、无限与迷宫的哲学隐喻。欢迎带上你的阅读笔记，我们一起在文字的迷宫中寻找出口——或者，寻找更多的入口。",
    "quota": 30,
    "enrolled_count": 30,
    "registration_mode": "points_only",
    "points_cost": 100,
    "tier_threshold": "bronze",
    "price": 0,
    "refund_policy": "no_refund",
    "reward_points": 30,
    "status": "published",
    "created_at": { "$date": "2026-03-20T10:00:00.000Z" },
    "updated_at": { "$date": "2026-04-10T10:00:00.000Z" }
  },
  {
    "title": "青年独立导演放映会",
    "cover_image": "/images/event.jpg",
    "category": "其他",
    "speaker": "林小雨",
    "speaker_title": "独立纪录片导演",
    "event_time": { "$date": "2026-01-08T15:30:00.000Z" },
    "registration_deadline": { "$date": "2026-01-07T23:59:59.000Z" },
    "location": "青翼读书会·影音室",
    "address": "重庆市南岸区南山路128号",
    "description": "本期放映会邀请到青年独立导演林小雨，带来其最新纪录短片《川江号子》的首映。映后将进行导演对谈，讨论纪录片创作的伦理与方法。活动免费开放，名额有限。",
    "quota": 40,
    "enrolled_count": 35,
    "registration_mode": "free",
    "points_cost": 0,
    "tier_threshold": "none",
    "price": 0,
    "refund_policy": "no_refund",
    "reward_points": 20,
    "status": "ended",
    "created_at": { "$date": "2025-12-20T10:00:00.000Z" },
    "updated_at": { "$date": "2026-01-08T18:00:00.000Z" }
  },
  {
    "title": "木心的文学回忆录：文学复兴拾影",
    "cover_image": "/images/event.jpg",
    "category": "读书会",
    "speaker": "许知远",
    "speaker_title": "作家、单向空间创始人",
    "event_time": { "$date": "2025-12-14T14:00:00.000Z" },
    "registration_deadline": { "$date": "2025-12-13T23:59:59.000Z" },
    "location": "青翼读书会·主茶室",
    "address": "重庆市南岸区南山路128号",
    "description": "木心先生说：「文学是可爱的，生活是好玩的。」《文学回忆录》是木心在纽约为一群中国艺术家讲授世界文学的课堂笔记。本次活动我们将重温这本巨著中的精彩篇章，从古希腊到现代主义，跨越时空与木心先生对话。",
    "quota": 30,
    "enrolled_count": 28,
    "registration_mode": "paid",
    "points_cost": 0,
    "tier_threshold": "none",
    "price": 2900,
    "refund_policy": "full_refund_before_24_hours",
    "reward_points": 100,
    "status": "ended",
    "created_at": { "$date": "2025-11-20T10:00:00.000Z" },
    "updated_at": { "$date": "2025-12-14T16:00:00.000Z" }
  }
];


// ============================================================
// 2. books (好书推荐) - 3 条
// ============================================================
const books = [
  {
    "title": "咸的玩笑",
    "author": "刘震云",
    "cover_image": "/images/book1.jpg",
    "rating": 9.8,
    "publisher": "人民文学出版社",
    "publish_date": "2025-12",
    "isbn": "9787020197620",
    "pages": 475,
    "genre": "小说",
    "price": "69.00",
    "description": "《咸的玩笑》延续了刘震云\"写众生\"的创作底色，用幽默的笔触，在嬉笑怒骂间照见普通人的日常，也照见每个人与生活和解的可能。主人公杜太白辗转教师、红白事主持人、小贩多份职业，在生活中摸爬滚打。面对无法较真、有苦说不出的生活磨难，杜太白看清规则却不被规则捆绑，尝过苦楚仍敢热烈投入。\"玩笑\"，既是日常的玩笑，更是生活突然而来的苦涩经历；既可以会心一笑，更是我们应对生活变化、消解困顿的生存智慧。",
    "status": "published",
    "sort_order": 100,
    "created_at": { "$date": "2026-04-01T10:00:00.000Z" },
    "updated_at": { "$date": "2026-04-01T10:00:00.000Z" }
  },
  {
    "title": "天色已晚",
    "author": "[爱尔兰]克莱尔·吉根",
    "cover_image": "/images/book2.jpg",
    "rating": 9.5,
    "publisher": "太白文艺出版社",
    "publish_date": "2026-01",
    "pages": 116,
    "genre": "小说",
    "description": "克莱尔·吉根是当代最杰出的英语短篇小说家之一。她的文字克制而精准，在极短的篇幅里展现出惊人的情感张力。《天色已晚》收录了她近年创作的短篇小说，每一篇都像一枚棱镜，折射出爱尔兰乡村生活中那些沉默而深刻的人性瞬间。",
    "status": "published",
    "sort_order": 90,
    "created_at": { "$date": "2026-04-01T10:00:00.000Z" },
    "updated_at": { "$date": "2026-04-01T10:00:00.000Z" }
  },
  {
    "title": "只剩你一个",
    "author": "赖利·萨格",
    "cover_image": "/images/book3.jpg",
    "rating": 8.2,
    "publisher": "未名出版社",
    "publish_date": "2026-02",
    "pages": 320,
    "genre": "悬疑",
    "description": "一栋位于悉尼郊区的维多利亚式老宅，一个刚刚失去妻子的男人，以及那些他无法解释的声响。赖利·萨格用精准的心理悬疑手法，构建了一个关于丧失、记忆与恐惧的故事。当你以为一切都已结束时，真相才刚刚开始浮出水面。",
    "status": "published",
    "sort_order": 80,
    "created_at": { "$date": "2026-04-01T10:00:00.000Z" },
    "updated_at": { "$date": "2026-04-01T10:00:00.000Z" }
  }
];


// ============================================================
// 3. banners (首页轮播) - 2 条
// ============================================================
const banners = [
  {
    "image_url": "/images/banner.jpg",
    "redirect_url": "/pages/event-detail/event-detail?id=EVENT_ID_1",
    "sort_order": 1,
    "status": "online",
    "created_at": { "$date": "2026-04-01T10:00:00.000Z" },
    "updated_at": { "$date": "2026-04-01T10:00:00.000Z" }
  },
  {
    "image_url": "/images/book2.jpg",
    "redirect_url": "/pages/book-detail/book-detail?id=BOOK_ID_2",
    "sort_order": 2,
    "status": "online",
    "created_at": { "$date": "2026-04-05T10:00:00.000Z" },
    "updated_at": { "$date": "2026-04-05T10:00:00.000Z" }
  }
];


// ============================================================
// 4. settings (系统配置) - 1 条
// ============================================================
const settings = [
  {
    "_id": "points_config",
    "daily_sign_base": 10,
    "daily_sign_bonus": 5,
    "continuous_sign_bonus_days": 7,
    "continuous_sign_bonus_points": 50,
    "level_thresholds": {
      "bronze": 0,
      "silver": 500,
      "gold": 1000
    },
    "order_expire_minutes": 15
  }
];


// ============================================================
// 5. users (用户示例) - 1 条
//    注意: 实际使用时 open_id 由 wx.login 获取，这里用占位值
// ============================================================
const users = [
  {
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "phone": "13800138000",
    "nickname": "QingQing",
    "avatar_url": "",
    "member_no": "QY20260401001",
    "role": "user",
    "level": "silver",
    "total_points": 1200,
    "current_points": 1200,
    "last_sign_date": "2026-04-10",
    "continuous_sign_days": 128,
    "created_at": { "$date": "2026-02-21T10:00:00.000Z" },
    "updated_at": { "$date": "2026-04-10T09:00:00.000Z" }
  }
];


// ============================================================
// 6. point_logs (积分流水) - 6 条
//    注意: user_id 需替换为实际 users 集合记录的 _id
// ============================================================
const point_logs = [
  {
    "user_id": "USERS_DOC_ID",
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "amount": 10,
    "type": "daily_sign",
    "related_id": "",
    "description": "每日签到奖励",
    "created_at": { "$date": "2026-04-08T09:00:00.000Z" }
  },
  {
    "user_id": "USERS_DOC_ID",
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "amount": 50,
    "type": "event_reward",
    "related_id": "",
    "description": "发表书评奖励",
    "created_at": { "$date": "2026-03-12T18:35:00.000Z" }
  },
  {
    "user_id": "USERS_DOC_ID",
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "amount": 100,
    "type": "event_reward",
    "related_id": "",
    "description": "参与沙龙奖励",
    "created_at": { "$date": "2026-02-16T19:30:00.000Z" }
  },
  {
    "user_id": "USERS_DOC_ID",
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "amount": -100,
    "type": "event_enroll",
    "related_id": "",
    "description": "报名活动「博尔赫斯的迷宫」",
    "created_at": { "$date": "2026-03-20T10:00:00.000Z" }
  },
  {
    "user_id": "USERS_DOC_ID",
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "amount": 50,
    "type": "daily_sign",
    "related_id": "",
    "description": "连续签到7天额外奖励",
    "created_at": { "$date": "2026-03-05T09:00:00.000Z" }
  },
  {
    "user_id": "USERS_DOC_ID",
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "amount": 10,
    "type": "daily_sign",
    "related_id": "",
    "description": "每日签到奖励",
    "created_at": { "$date": "2026-03-04T09:00:00.000Z" }
  }
];


// ============================================================
// 7. notifications (通知消息) - 4 条
//    注意: 此集合在 data_schema 中未定义，按原型 UI 补充
// ============================================================
const notifications = [
  {
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "type": "event_enroll",
    "icon_color": "#5c8deb",
    "title": "活动报名成功",
    "body": "您已成功报名「古典主义回响：维吉尔《埃涅阿斯纪》精读营」，活动时间为2026年4月18日 15:30，请准时参加。",
    "is_read": false,
    "created_at": { "$date": "2026-04-10T16:30:00.000Z" }
  },
  {
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "type": "points_reward",
    "icon_color": "#fb923c",
    "title": "积分奖励发放",
    "body": "您已连续签到7天，系统已发放50额外积分奖励，当前可用积分1200。",
    "is_read": false,
    "created_at": { "$date": "2026-04-10T15:30:00.000Z" }
  },
  {
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "type": "system",
    "icon_color": "#f05232",
    "title": "系统维护公告",
    "body": "服务器将于本周六凌晨2:00-4:00进行例行维护，届时服务可能暂时不可用，给您带来不便敬请谅解。",
    "is_read": true,
    "created_at": { "$date": "2026-04-09T10:00:00.000Z" }
  },
  {
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "type": "system",
    "icon_color": "#14b8a6",
    "title": "欢迎加入青翼读书会",
    "body": "欢迎注册青翼读书会会员！这里有丰富的社群活动与读书资源，期待与您一起开启阅读之旅。",
    "is_read": true,
    "created_at": { "$date": "2026-02-21T10:00:00.000Z" }
  }
];


// ============================================================
// 8. comments (活动讨论) - 5 条
//    注意: user_id / event_id 需替换为实际记录的 _id
// ============================================================
const comments = [
  {
    "event_id": "EVENTS_DOC_ID_1",
    "user_id": "USERS_DOC_ID",
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "nickname": "QingQing",
    "avatar_url": "",
    "content": "期待这次活动！维吉尔的史诗太需要有人带着读了。",
    "status": "visible",
    "created_at": { "$date": "2026-04-05T14:20:00.000Z" }
  },
  {
    "event_id": "EVENTS_DOC_ID_1",
    "user_id": "OTHER_USER_ID_1",
    "open_id": "MOCK_OPEN_ID_2",
    "nickname": "书虫小李",
    "avatar_url": "",
    "content": "王文博老师的课在复旦一座难求，这次能近距离交流太难得了！",
    "status": "visible",
    "created_at": { "$date": "2026-04-06T09:15:00.000Z" }
  },
  {
    "event_id": "EVENTS_DOC_ID_1",
    "user_id": "OTHER_USER_ID_2",
    "open_id": "MOCK_OPEN_ID_3",
    "nickname": "南山读者",
    "avatar_url": "",
    "content": "飞花令环节太有意思了，上次参加就很喜欢。",
    "status": "visible",
    "created_at": { "$date": "2026-04-07T11:30:00.000Z" }
  },
  {
    "event_id": "EVENTS_DOC_ID_2",
    "user_id": "USERS_DOC_ID",
    "open_id": "MOCK_OPEN_ID_PLACEHOLDER",
    "nickname": "QingQing",
    "avatar_url": "",
    "content": "博尔赫斯是永远读不完的迷宫。希望能和大家一起找到新的入口。",
    "status": "visible",
    "created_at": { "$date": "2026-03-25T20:00:00.000Z" }
  },
  {
    "event_id": "EVENTS_DOC_ID_2",
    "user_id": "OTHER_USER_ID_3",
    "open_id": "MOCK_OPEN_ID_4",
    "nickname": "哲学猫",
    "avatar_url": "",
    "content": "时间分叉的概念让我想到平行宇宙，期待深入讨论。",
    "status": "visible",
    "created_at": { "$date": "2026-03-28T16:45:00.000Z" }
  }
];
