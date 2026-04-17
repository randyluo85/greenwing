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

// 管理员账号 (建议在云函数环境变量中配置 ADMIN_ACCOUNTS)
const ADMIN_ACCOUNTS = JSON.parse(process.env.ADMIN_ACCOUNTS || '{"admin":"qingyi2026"}')

// Token 过期时间: 2小时
const TOKEN_TTL = 2 * 60 * 60 * 1000

// HMAC 签名密钥 (建议通过环境变量 TOKEN_SECRET 配置)
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'qingyi-admin-token-secret-2026'

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
    case 'adminRefund':
      return handleAdminRefund(event)
    case 'cancelOrder':
      return handleCancelOrder(event)
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

    if (amount > 0) {
      await transaction.collection('notifications').add({
        data: {
          open_id: user.open_id,
          title: '积分奖励发放',
          body: `您的账户收到一笔 ${amount} 积分的奖励：${reason || '管理员发放'}`,
          icon_bg_color: '#fb923c',
          icon_text: '奖',
          is_read: false,
          type: 'points_reward',
          created_at: db.serverDate()
        }
      })
    }

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

    // 获取订单列表
    const countRes = await db.collection('orders').where(where).count()
    const listRes = await db.collection('orders')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 批量获取用户信息
    const userIds = listRes.data.map(o => o.user_id).filter(id => id)
    const userMap = {}
    if (userIds.length > 0) {
      const userRes = await db.collection('users')
        .where({ _id: _.in(userIds) })
        .get()
      userRes.data.forEach(u => {
        userMap[u._id] = {
          _id: u._id,
          member_no: u.member_no,
          nickname: u.nickname,
          real_name: u.real_name,
          phone: u.phone
        }
      })
    }

    // 批量获取活动信息
    const eventIds = listRes.data.map(o => o.event_id).filter(id => id)
    const eventMap = {}
    if (eventIds.length > 0) {
      const distinctEventIds = [...new Set(eventIds)]
      const eventRes = await db.collection('events')
        .where({ _id: _.in(distinctEventIds) })
        .get()
      eventRes.data.forEach(e => {
        eventMap[e._id] = {
          _id: e._id,
          title: e.title
        }
      })
    }

    // 组合数据
    const list = listRes.data.map(order => ({
      ...order,
      user: userMap[order.user_id] || null,
      event: eventMap[order.event_id] || null
    }))

    return {
      success: true,
      data: { list, total: countRes.total, hasMore: page * pageSize < countRes.total }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 底层退款执行（被两种退款模式复用）
async function executeRefund(order, notifyUser = true) {
  const refundRes = await cloud.cloudPay.refund({
    out_trade_no: order.order_no,
    out_refund_no: 'RF' + order.order_no,
    total_fee: order.amount,
    refund_fee: order.amount,
    envId: 'cloud1-8gax523s60b70149',
    functionName: 'pay',
    sub_mch_id: process.env.MCH_ID || '1705849497'
  })
  console.log('[refund] cloud.cloudPay.refund 结果:', JSON.stringify(refundRes))

  // 退款已被微信受理，立即更新本地状态（不依赖回调）
  const regRes = await db.collection('registrations').where({ order_id: order._id }).get()
  const regId = regRes.data.length > 0 ? regRes.data[0]._id : null
  const regNeedCancel = regRes.data.length > 0 && regRes.data[0].status !== 'cancelled'

  const transaction = await db.startTransaction()
  try {
    await transaction.collection('orders').doc(order._id).update({
      data: { status: 'refunded', refund_time: db.serverDate(), updated_at: db.serverDate() }
    })

    if (regId && regNeedCancel) {
      await transaction.collection('registrations').doc(regId).update({
        data: { status: 'cancelled', updated_at: db.serverDate() }
      })
      await transaction.collection('events').doc(order.event_id).update({
        data: { enrolled_count: _.inc(-1) }
      })
    }

    await transaction.commit()
    console.log('[refund] ✅ 退款事务完成: 订单→refunded, 报名→cancelled')

    // 发送通知放事务外
    if (notifyUser) {
      try {
        await db.collection('notifications').add({
          data: {
            open_id: order.open_id,
            title: '退款成功',
            body: `您的订单 ${order.order_no} 退款已通过审核，款项将在 1-5 个工作日内原路退回。`,
            icon_bg_color: '#10b981',
            icon_text: '退',
            is_read: false,
            type: 'refund_approved',
            created_at: db.serverDate()
          }
        })
      } catch (noteErr) {
        console.error('[refund] 发送退款通知失败:', noteErr)
      }
    }
  } catch (txErr) {
    await transaction.rollback()
    console.error('[refund] 事务失败:', txErr)
    // 事务失败但微信退款已受理，保底更新订单和报名状态
    await db.collection('orders').doc(order._id).update({
      data: { status: 'refunded', refund_time: db.serverDate(), updated_at: db.serverDate() }
    })
    
    if (regId && regNeedCancel) {
      await db.collection('registrations').doc(regId).update({
        data: { status: 'cancelled', updated_at: db.serverDate() }
      })
      await db.collection('events').doc(order.event_id).update({
        data: { enrolled_count: _.inc(-1) }
      })
    }
  }

  return refundRes
}

// 退款审批（模式二：用户申请 -> 管理员审批）
async function handleApproveRefund(event) {
  try {
    const { orderId, approved, reason } = event
    if (!orderId) return { success: false, message: '缺少订单ID' }

    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    if (order.status !== 'refunding') return { success: false, message: '订单状态不正确，当前状态：' + order.status }

    if (!approved) {
      // 驳回：恢复到 paid 状态
      await db.collection('orders').doc(orderId).update({
        data: { status: 'paid', refund_reason: reason || '退款申请已驳回', updated_at: db.serverDate() }
      })
      return { success: true, message: '退款已拒绝' }
    }

    // 同意：发起微信退款
    try {
      await executeRefund(order, true)
      return { success: true, message: '退款已发起，款项将在 1-5 个工作日内原路退回' }
    } catch (refundErr) {
      console.error('[approveRefund] 退款失败:', refundErr)
      return { success: false, message: '退款失败: ' + refundErr.message }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 管理员主动退款（模式一：管理员对已支付订单直接发起退款）
async function handleAdminRefund(event) {
  try {
    const { orderId, reason } = event
    if (!orderId) return { success: false, message: '缺少订单ID' }

    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    if (order.status !== 'paid') return { success: false, message: '只能对已支付订单发起退款，当前状态：' + order.status }

    // 先标记为退款中，再调用微信
    await db.collection('orders').doc(order._id).update({
      data: {
        status: 'refunding',
        refund_reason: reason || '管理员主动退款',
        updated_at: db.serverDate()
      }
    })

    try {
      await executeRefund(order, true)
      return { success: true, message: '退款已发起，款项将在 1-5 个工作日内原路退回' }
    } catch (refundErr) {
      // 如果微信退款调用失败，回滚至 paid 状态
      await db.collection('orders').doc(order._id).update({
        data: { status: 'paid', updated_at: db.serverDate() }
      })
      console.error('[adminRefund] 退款失败:', refundErr)
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

    // 获取报名列表
    const countRes = await db.collection('registrations').where(where).count()
    const listRes = await db.collection('registrations')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 批量获取用户信息
    const userIds = listRes.data.map(r => r.user_id).filter(id => id)
    const userMap = {}
    if (userIds.length > 0) {
      const userRes = await db.collection('users')
        .where({ _id: _.in(userIds) })
        .get()
      userRes.data.forEach(u => {
        userMap[u._id] = {
          _id: u._id,
          member_no: u.member_no,
          nickname: u.nickname,
          avatar_url: u.avatar_url,
          phone: u.phone,
          real_name: u.real_name,
          level: u.level
        }
      })
    }

    // 组合数据
    const list = listRes.data.map(r => ({
      ...r,
      user: userMap[r.user_id] || null
    }))

    return {
      success: true,
      data: { list, total: countRes.total }
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

    if (type === 'broadcast') {
      const { title, body } = data
      if (!title || !body) return { success: false, message: '标题和内容不能为空' }

      const MAX_USERS = 1000
      let offset = 0
      let totalSent = 0
      while (true) {
        const usersRes = await db.collection('users').skip(offset).limit(MAX_USERS).get()
        const users = usersRes.data
        if (users.length === 0) break

        const promises = users.map(u => {
          return db.collection('notifications').add({
            data: {
              open_id: u.open_id,
              title,
              body,
              icon_bg_color: '#f05232',
              icon_text: '系',
              is_read: false,
              type: 'system_broadcast',
              created_at: db.serverDate()
            }
          }).catch(e => console.error('Failed to notify user', u.open_id, e))
        })
        
        await Promise.all(promises)
        totalSent += users.length
        offset += MAX_USERS
        if (users.length < MAX_USERS) break
      }
      return { success: true, message: `已向 ${totalSent} 名用户发送消息` }
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
    const $ = db.command.aggregate

    // 总收入 - 使用 aggregate 聚合，无数据量上限
    // 核心财务统计：计算累计总收入（包含所有现金流入状态：paid, refunding, refunded）
    let totalRevenue = 0
    let totalOrders = 0
    try {
      const aggRes = await db.collection('orders')
        .aggregate()
        .match({ 
          status: _.in(['paid', 'refunding', 'refunded']) 
        })
        .group({ 
          _id: null, 
          total: $.sum('$amount'), 
          count: $.sum(1) 
        })
        .end()
      
      const list = aggRes.list || aggRes.data
      console.log('Revenue Aggregation Result:', JSON.stringify(list))
      
      if (list && list.length > 0) {
        totalRevenue = list[0].total || 0
        totalOrders = list[0].count || 0
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
        .group({ 
          _id: null, 
          total: $.sum('$amount'), 
          count: $.sum(1) 
        })
        .end()
      
      const list = refundAgg.list || refundAgg.data
      console.log('Refund Aggregation Result:', JSON.stringify(list))
      
      if (list && list.length > 0) {
        totalRefund = list[0].total || 0
        refundCount = list[0].count || 0
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
    
    // 1. 并发获取原始日志
    const [pointLogs, regs] = await Promise.all([
      db.collection('point_logs').orderBy('created_at', 'desc').limit(limit).get(),
      db.collection('registrations').orderBy('created_at', 'desc').limit(limit).get()
    ])

    // 2. 收集所有需要查询的 ID
    const userIds = new Set()
    const eventIds = new Set()
    
    pointLogs.data.forEach(log => { if (log.user_id) userIds.add(log.user_id) })
    regs.data.forEach(reg => {
      if (reg.user_id) userIds.add(reg.user_id)
      if (reg.event_id) eventIds.add(reg.event_id)
    })

    // 3. 批量并行查询详情
    const [usersRes, eventsRes] = await Promise.all([
      userIds.size > 0 ? db.collection('users').where({ _id: _.in([...userIds]) }).get() : { data: [] },
      eventIds.size > 0 ? db.collection('events').where({ _id: _.in([...eventIds]) }).get() : { data: [] }
    ])

    // 4. 建立映射表
    const userMap = {}
    usersRes.data.forEach(u => { userMap[u._id] = u.nickname || '未知用户' })
    const eventMap = {}
    eventsRes.data.forEach(e => { eventMap[e._id] = e.title || '未知活动' })

    // 5. 组合结果
    const activities = []
    
    // 处理积分日志
    pointLogs.data.forEach(log => {
      activities.push({
        type: 'point',
        description: `${userMap[log.user_id] || '未知用户'} ${log.description}`,
        time: log.created_at
      })
    })

    // 处理报名记录
    regs.data.forEach(reg => {
      activities.push({
        type: 'registration',
        description: `${userMap[reg.user_id] || '未知用户'} 报名了「${eventMap[reg.event_id] || '未知活动'}」`,
        time: reg.created_at
      })
    })

    // 6. 排序并截断
    activities.sort((a, b) => (b.time || 0) - (a.time || 0))
    return { success: true, data: activities.slice(0, limit) }
  } catch (err) {
    console.error('handleGetRecentActivity failed:', err)
    return { success: false, message: err.message }
  }
}
