const cloud = require('wx-server-sdk')
const crypto = require('crypto')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 内联工具函数
function calcLevel(totalPoints, thresholds) {
  const t = thresholds || { bronze: 0, silver: 500, gold: 1000 }
  if (totalPoints >= t.gold) return 'gold'
  if (totalPoints >= t.silver) return 'silver'
  return 'bronze'
}

// 管理员账号（优先从环境变量读取，兼容硬编码回退）
const ADMIN_ACCOUNTS = JSON.parse(process.env.ADMIN_ACCOUNTS || '{"admin":"qingyi2026"}')

// Token 过期时间: 2小时
const TOKEN_TTL = 2 * 60 * 60 * 1000

// HMAC 签名密钥（无状态 token，不依赖内存或数据库）
const TOKEN_SECRET = 'qingyi-admin-token-secret-2026'

// 无状态 token 生成: Base64(username:loginTime:hmac)
function generateToken(username, loginTime) {
  const payload = `${username}:${loginTime}`
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex').substring(0, 16)
  return Buffer.from(`${payload}:${sig}`).toString('base64')
}

// 无状态 token 验证: 解码 + 验签 + 检查过期
function validateToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const parts = decoded.split(':')
    if (parts.length !== 3) return false
    const [username, loginTimeStr, sig] = parts
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(`${username}:${loginTimeStr}`).digest('hex').substring(0, 16)
    if (sig !== expectedSig) return false
    const loginTime = parseInt(loginTimeStr, 10)
    if (Date.now() - loginTime > TOKEN_TTL) return false
    // 验证用户名是否在管理员列表中
    if (!ADMIN_ACCOUNTS[username]) return false
    return true
  } catch (e) {
    return false
  }
}

exports.main = async (event, context) => {
  const { action } = event

  // login 不需要鉴权
  if (action === 'login') {
    return handleLogin(event)
  }

  // 其他操作需要 token 鉴权
  const { token } = event
  if (!validateToken(token)) {
    return { success: false, message: '未登录或登录已过期，请重新登录' }
  }

  switch (action) {
    case 'getUsers':
      return handleGetUsers(event)
    case 'adjustPoints':
      return handleAdjustPoints(event)
    case 'manageEvent':
      return handleManageEvent(event)
    case 'getOrders':
      return handleGetOrders(event)
    case 'approveRefund':
      return handleApproveRefund(event)
    case 'getRegistrations':
      return handleGetRegistrations(event)
    case 'manageContent':
      return handleManageContent(event)
    case 'getDashboard':
      return handleGetDashboard(event)
    case 'getEvents':
      return handleGetEvents(event)
    case 'updateUser':
      return handleUpdateUser(event)
    case 'getSettings':
      return handleGetSettings(event)
    case 'updateSettings':
      return handleUpdateSettings(event)
    case 'getLevelDistribution':
      return handleGetLevelDistribution(event)
    case 'getRecentActivity':
      return handleGetRecentActivity(event)
    default:
      return { success: false, message: '未知操作' }
  }
}

// 管理员登录
async function handleLogin(event) {
  try {
    const { username, password } = event
    if (!username || !password) return { success: false, message: '请输入账号和密码' }

    if (!ADMIN_ACCOUNTS[username] || ADMIN_ACCOUNTS[username] !== password) {
      return { success: false, message: '账号或密码错误' }
    }

    const loginTime = Date.now()
    const token = generateToken(username, loginTime)

    return { success: true, data: { token, username } }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 用户列表
async function handleGetUsers(event) {
  try {
    const { page = 1, pageSize = 20, keyword, level, role } = event
    const where = {}

    if (keyword) {
      where[_.or] = [
        { nickname: db.RegExp({ regexp: keyword, options: 'i' }) },
        { member_no: db.RegExp({ regexp: keyword, options: 'i' }) },
        { phone: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]
    }
    if (level) where.level = level
    if (role) where.role = role

    const countRes = await db.collection('users').where(where).count()
    const listRes = await db.collection('users')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: { list: listRes.data, total: countRes.total, hasMore: page * pageSize < countRes.total }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 调整积分
async function handleAdjustPoints(event) {
  const transaction = await db.startTransaction()
  try {
    const { userId, amount, reason } = event
    if (!userId || !amount) return { success: false, message: '参数错误' }
    if (amount === 0) return { success: false, message: '调整数量不能为0' }

    const userRes = await transaction.collection('users').doc(userId).get()
    const user = userRes.data

    let newTotal = user.total_points
    let newCurrent = user.current_points

    if (amount > 0) {
      newTotal += amount
      newCurrent += amount
    } else {
      newCurrent = Math.max(0, newCurrent + amount)
      // 负数不减少 total_points (累计积分只增不减)
    }

    const config = await db.collection('settings').doc('points_config').get().catch(() => ({ data: null }))
    const thresholds = config.data ? config.data.level_thresholds : null
    const newLevel = calcLevel(newTotal, thresholds)

    await transaction.collection('users').doc(userId).update({
      data: {
        total_points: newTotal,
        current_points: newCurrent,
        level: newLevel,
        updated_at: db.serverDate()
      }
    })

    await transaction.collection('point_logs').add({
      data: {
        user_id: userId,
        open_id: user.open_id,
        amount,
        type: 'admin_adjust',
        related_id: '',
        description: reason || (amount > 0 ? `管理员增加 ${amount} 积分` : `管理员扣减 ${Math.abs(amount)} 积分`),
        created_at: db.serverDate()
      }
    })

    await transaction.commit()
    return { success: true, message: '积分调整成功', data: { total: newTotal, current: newCurrent, level: newLevel } }
  } catch (err) {
    await transaction.rollback()
    return { success: false, message: err.message }
  }
}

// 活动管理
async function handleManageEvent(event) {
  try {
    const { method, eventId, data } = event

    // 活动字段白名单
    const EVENT_FIELDS = ['title', 'cover_image', 'category', 'speaker', 'event_time',
      'registration_deadline', 'location', 'description', 'quota', 'registration_mode',
      'points_cost', 'tier_threshold', 'price', 'refund_policy', 'reward_points', 'status']
    const pickFields = (src, fields) => {
      const out = {}
      fields.forEach(f => { if (src[f] !== undefined) out[f] = src[f] })
      return out
    }

    if (method === 'create') {
      const newEvent = {
        ...pickFields(data, EVENT_FIELDS),
        enrolled_count: 0,
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
      const res = await db.collection('events').add({ data: newEvent })
      return { success: true, data: { _id: res._id } }
    }

    if (method === 'update') {
      const updateData = {
        ...pickFields(data, EVENT_FIELDS),
        updated_at: db.serverDate()
      }
      await db.collection('events').doc(eventId).update({ data: updateData })
      return { success: true, message: '更新成功' }
    }

    if (method === 'delete') {
      await db.collection('events').doc(eventId).update({
        data: { status: 'draft', updated_at: db.serverDate() }
      })
      return { success: true, message: '已下架' }
    }

    return { success: false, message: '未知操作' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 订单列表
async function handleGetOrders(event) {
  try {
    const { page = 1, pageSize = 20, status, startDate, endDate } = event
    const where = {}
    if (status) where.status = status
    if (startDate || endDate) {
      const conditions = []
      if (startDate) conditions.push(_.gte(new Date(startDate)))
      if (endDate) conditions.push(_.lte(new Date(endDate)))
      where.created_at = conditions.length === 1 ? conditions[0] : _.and(conditions)
    }

    const countRes = await db.collection('orders').where(where).count()
    const listRes = await db.collection('orders')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: { list: listRes.data, total: countRes.total, hasMore: page * pageSize < countRes.total }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 退款审批
async function handleApproveRefund(event) {
  try {
    const { orderId, approved, reason } = event
    if (!orderId) return { success: false, message: '缺少订单ID' }

    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    if (order.status !== 'refunding') return { success: false, message: '订单状态不正确' }

    if (!approved) {
      await db.collection('orders').doc(orderId).update({
        data: { status: 'paid', refund_reason: reason || '退款被拒绝', updated_at: db.serverDate() }
      })
      return { success: true, message: '退款已拒绝' }
    }

    // 执行退款
    try {
      const refundRes = await cloud.cloudPay.refund({
        outTradeNo: order.order_no,
        outRefundNo: 'RF' + order.order_no,
        totalFee: order.amount,
        refundFee: order.amount,
        envId: cloud.DYNAMIC_CURRENT_ENV,
        functionName: 'pay'
      })

      // 退款申请已提交，等待回调
      await db.collection('orders').doc(orderId).update({
        data: { status: 'refunding', updated_at: db.serverDate() }
      })

      return { success: true, message: '退款已发起' }
    } catch (refundErr) {
      return { success: false, message: '退款失败: ' + refundErr.message }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 报名名单
async function handleGetRegistrations(event) {
  try {
    const { eventId, page = 1, pageSize = 50 } = event
    const where = {}
    if (eventId) where.event_id = eventId

    const countRes = await db.collection('registrations').where(where).count()
    const listRes = await db.collection('registrations')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: { list: listRes.data, total: countRes.total }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 内容管理
async function handleManageContent(event) {
  try {
    const { type, method, id, data } = event
    const collection = type === 'banner' ? 'banners' : 'books'

    // 内容字段白名单
    const BANNER_FIELDS = ['image_url', 'title', 'subtitle', 'redirect_type', 'redirect_url', 'sort_order', 'status']
    const BOOK_FIELDS = ['title', 'author', 'cover_image', 'rating', 'description', 'sort_order', 'status']
    const allowedFields = type === 'banner' ? BANNER_FIELDS : BOOK_FIELDS
    const pickFields = (src, fields) => {
      const out = {}
      fields.forEach(f => { if (src[f] !== undefined) out[f] = src[f] })
      return out
    }

    if (method === 'list') {
      const res = await db.collection(collection).orderBy('sort_order', 'asc').get()
      return { success: true, data: res.data }
    }

    if (method === 'create') {
      const safeData = {
        ...pickFields(data, allowedFields),
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
      const res = await db.collection(collection).add({ data: safeData })
      return { success: true, data: { _id: res._id } }
    }

    if (method === 'update') {
      const safeData = {
        ...pickFields(data, allowedFields),
        updated_at: db.serverDate()
      }
      await db.collection(collection).doc(id).update({ data: safeData })
      return { success: true, message: '更新成功' }
    }

    if (method === 'delete') {
      await db.collection(collection).doc(id).remove()
      return { success: true, message: '删除成功' }
    }

    return { success: false, message: '未知操作' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 财务看板
async function handleGetDashboard(event) {
  try {
    // 总收入 - 使用 aggregate 聚合，无数据量上限
    let totalRevenue = 0
    let totalOrders = 0
    try {
      const aggRes = await db.collection('orders')
        .aggregate()
        .match({ status: 'paid' })
        .group({ _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } })
        .end()
      if (aggRes.data.length > 0) {
        totalRevenue = aggRes.data[0].total || 0
        totalOrders = aggRes.data[0].count || 0
      }
    } catch (e) {
      console.error('Dashboard revenue aggregation failed:', e.message)
    }

    let totalRefund = 0
    let refundCount = 0
    try {
      const refundAgg = await db.collection('orders')
        .aggregate()
        .match({ status: 'refunded' })
        .group({ _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } })
        .end()
      if (refundAgg.data.length > 0) {
        totalRefund = refundAgg.data[0].total || 0
        refundCount = refundAgg.data[0].count || 0
      }
    } catch (e) {
      console.error('Dashboard refund aggregation failed:', e.message)
    }

    const refundRate = (totalOrders + refundCount) > 0
      ? (refundCount / (totalOrders + refundCount) * 100).toFixed(1)
      : '0.0'

    // 用户统计
    const userCount = await db.collection('users').count()
    const activeEvents = await db.collection('events').where({ status: 'published' }).count()

    // 本周签到数
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    let weekSignIns = 0
    try {
      const signRes = await db.collection('point_logs')
        .where({ type: 'daily_sign', created_at: _.gte(weekAgo) })
        .count()
      weekSignIns = signRes.total
    } catch (e) {
      console.error('Dashboard sign-in count failed:', e.message)
    }

    return {
      success: true,
      data: {
        totalRevenue,
        totalRefund,
        totalOrders,
        refundRate,
        netRevenue: totalRevenue - totalRefund,
        userCount: userCount.total,
        activeEvents: activeEvents.total,
        weekSignIns
      }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 活动列表 (管理端，含全部状态)
async function handleGetEvents(event) {
  try {
    const { page = 1, pageSize = 20, status } = event
    const where = {}
    if (status) where.status = status

    const countRes = await db.collection('events').where(where).count()
    const listRes = await db.collection('events')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: { list: listRes.data, total: countRes.total, hasMore: page * pageSize < countRes.total }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 更新用户信息
async function handleUpdateUser(event) {
  try {
    const { userId, data } = event
    if (!userId) return { success: false, message: '缺少用户ID' }

    const updateData = {}
    if (data.nickname !== undefined) updateData.nickname = data.nickname
    if (data.role !== undefined) {
      const allowedRoles = ['user', 'verifier']
      if (!allowedRoles.includes(data.role)) return { success: false, message: '不允许的角色' }
      updateData.role = data.role
    }
    if (data.level !== undefined) updateData.level = data.level
    updateData.updated_at = db.serverDate()

    await db.collection('users').doc(userId).update({ data: updateData })
    return { success: true, message: '更新成功' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 获取系统设置
async function handleGetSettings(event) {
  try {
    const res = await db.collection('settings').doc('points_config').get()
    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 更新系统设置
async function handleUpdateSettings(event) {
  try {
    const { data } = event
    if (!data) return { success: false, message: '缺少设置数据' }

    await db.collection('settings').doc('points_config').update({
      data: { ...data, updated_at: db.serverDate() }
    })
    return { success: true, message: '设置已保存' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 等级分布
async function handleGetLevelDistribution(event) {
  try {
    const bronze = await db.collection('users').where({ level: 'bronze' }).count()
    const silver = await db.collection('users').where({ level: 'silver' }).count()
    const gold = await db.collection('users').where({ level: 'gold' }).count()
    return {
      success: true,
      data: { bronze: bronze.total, silver: silver.total, gold: gold.total }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 最近动态
async function handleGetRecentActivity(event) {
  try {
    const { limit = 10 } = event
    const activities = []

    // 最近的积分流水
    try {
      const pointLogs = await db.collection('point_logs')
        .orderBy('created_at', 'desc').limit(limit).get()
      for (const log of pointLogs.data) {
        let userName = '未知用户'
        try {
          const u = await db.collection('users').doc(log.user_id).get()
          userName = u.data.nickname || userName
        } catch (e) {
          console.error('RecentActivity: user lookup failed for', log.user_id, e.message)
        }
        activities.push({
          type: 'point',
          description: `${userName} ${log.description}`,
          time: log.created_at
        })
      }
    } catch (e) {
      console.error('RecentActivity: point_logs query failed:', e.message)
    }

    // 最近的报名记录
    try {
      const regs = await db.collection('registrations')
        .orderBy('created_at', 'desc').limit(limit).get()
      for (const reg of regs.data) {
        let userName = '未知用户'
        let eventTitle = '未知活动'
        try {
          const u = await db.collection('users').doc(reg.user_id).get()
          userName = u.data.nickname || userName
        } catch (e) {
          console.error('RecentActivity: user lookup failed for', reg.user_id, e.message)
        }
        try {
          const ev = await db.collection('events').doc(reg.event_id).get()
          eventTitle = ev.data.title || eventTitle
        } catch (e) {
          console.error('RecentActivity: event lookup failed for', reg.event_id, e.message)
        }
        activities.push({
          type: 'registration',
          description: `${userName} 报名了「${eventTitle}」`,
          time: reg.created_at
        })
      }
    } catch (e) {
      console.error('RecentActivity: registrations query failed:', e.message)
    }
    activities.sort((a, b) => (b.time || 0) - (a.time || 0))

    return { success: true, data: activities.slice(0, limit) }
  } catch (err) {
    return { success: false, message: err.message }
  }
}
