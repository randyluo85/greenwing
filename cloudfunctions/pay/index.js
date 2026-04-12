const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 内联工具函数
function generateOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `QY${y}${m}${d}${h}${min}${s}${rand}`
}
function generateVerifyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 带唯一性校验的核销码生成
async function generateUniqueVerifyCode(collection) {
  for (let i = 0; i < 3; i++) {
    const code = generateVerifyCode()
    const exist = await collection.where({ verify_code: code }).count()
    if (exist.total === 0) return code
  }
  return generateVerifyCode() + Date.now().toString(36).slice(-3)
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  switch (action) {
    case 'createOrder':
      return handleCreateOrder(OPENID, event)
    case 'queryOrder':
      return handleQueryOrder(OPENID, event)
    case 'cancelOrder':
      return handleCancelOrder(OPENID, event)
    case 'requestRefund':
      return handleRequestRefund(OPENID, event)
    case 'myOrders':
      return handleMyOrders(OPENID, event)
    case 'payCallback':
      return handlePayCallback(event)
    case 'refundCallback':
      return handleRefundCallback(event)
    default:
      return { success: false, message: '未知操作' }
  }
}

// 创建订单 + 统一下单
async function handleCreateOrder(openid, event) {
  try {
    const { eventId } = event
    if (!eventId) return { success: false, message: '缺少活动ID' }

    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) return { success: false, message: '请先登录' }
    const user = userRes.data[0]

    const eventRes = await db.collection('events').doc(eventId).get()
    const eventDoc = eventRes.data

    if (eventDoc.status !== 'published') return { success: false, message: '活动已下架' }
    if (eventDoc.registration_mode !== 'paid') return { success: false, message: '该活动非付费模式' }
    if (eventDoc.quota && eventDoc.enrolled_count >= eventDoc.quota) return { success: false, message: '名额已满' }

    // 检查重复
    const existOrder = await db.collection('orders')
      .where({ open_id: openid, event_id: eventId, status: _.in(['pending', 'paid']) })
      .get()
    if (existOrder.data.length > 0) {
      return { success: false, message: '已有进行中的订单' }
    }

    // 获取超时配置
    let expireMinutes = 15
    try {
      const configRes = await db.collection('settings').doc('points_config').get()
      if (configRes.data) expireMinutes = configRes.data.order_expire_minutes || 15
    } catch (e) { /* 使用默认值 */ }

    const orderNo = generateOrderNo()
    const expireAt = new Date(Date.now() + expireMinutes * 60 * 1000)

    // 创建订单
    const orderData = {
      order_no: orderNo,
      transaction_id: '',
      user_id: user._id,
      open_id: openid,
      event_id: eventId,
      amount: eventDoc.price,
      status: 'pending',
      pay_time: null,
      refund_time: null,
      refund_reason: '',
      expire_at: expireAt,
      created_at: db.serverDate(),
      updated_at: db.serverDate()
    }

    const addRes = await db.collection('orders').add({ data: orderData })

    // 调用云托管统一下单
    try {
      const payRes = await cloud.cloudPay.unifiedOrder({
        body: `青翼读书会 - ${eventDoc.title}`,
        outTradeNo: orderNo,
        spbillCreateIp: '127.0.0.1',
        totalFee: eventDoc.price,
        envId: cloud.DYNAMIC_CURRENT_ENV,
        functionName: 'pay',
        nonceStr: Math.random().toString(36).slice(2, 17),
        tradeType: 'JSAPI'
      })

      return {
        success: true,
        data: {
          orderId: addRes._id,
          orderNo,
          payment: payRes,
          expireAt
        }
      }
    } catch (payErr) {
      // 统一下单失败，关闭订单
      await db.collection('orders').doc(addRes._id).update({
        data: { status: 'failed', updated_at: db.serverDate() }
      })
      return { success: false, message: '创建支付订单失败: ' + payErr.message }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 查询订单状态
async function handleQueryOrder(openid, event) {
  try {
    const { orderId } = event
    const res = await db.collection('orders').doc(orderId).get()
    const order = res.data

    if (order.open_id !== openid) return { success: false, message: '无权查看' }
    return { success: true, data: order }
  } catch (err) {
    return { success: false, message: '订单不存在' }
  }
}

// 取消未支付订单
async function handleCancelOrder(openid, event) {
  try {
    const { orderId } = event
    const res = await db.collection('orders').doc(orderId).get()
    const order = res.data

    if (order.open_id !== openid) return { success: false, message: '无权操作' }
    if (order.status !== 'pending') return { success: false, message: '只能取消待支付订单' }

    await db.collection('orders').doc(orderId).update({
      data: { status: 'closed', updated_at: db.serverDate() }
    })

    return { success: true, message: '订单已取消' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 申请退款
async function handleRequestRefund(openid, event) {
  try {
    const { orderId, reason } = event
    if (!orderId) return { success: false, message: '缺少订单ID' }

    const res = await db.collection('orders').doc(orderId).get()
    const order = res.data

    if (order.open_id !== openid) return { success: false, message: '无权操作' }
    if (order.status !== 'paid') return { success: false, message: '只能对已支付订单申请退款' }

    // 检查退款政策
    const eventRes = await db.collection('events').doc(order.event_id).get()
    const eventDoc = eventRes.data

    if (eventDoc.refund_policy === 'no_refund') {
      return { success: false, message: '该活动不支持退款' }
    }

    // 更新订单状态为退款审核中
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'refunding',
        refund_reason: reason || '用户申请退款',
        updated_at: db.serverDate()
      }
    })

    return { success: true, message: '退款申请已提交，等待审核' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 我的订单
async function handleMyOrders(openid, event) {
  try {
    const { page = 1, pageSize = 10, status } = event
    const where = { open_id: openid }
    if (status) where.status = status

    const countRes = await db.collection('orders').where(where).count()
    const listRes = await db.collection('orders')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 批量关联活动信息
    const eventIds = [...new Set(listRes.data.map(o => o.event_id).filter(Boolean))]
    const eventDocs = {}
    if (eventIds.length > 0) {
      const eventRes = await db.collection('events').where({ _id: _.in(eventIds) }).get()
      eventRes.data.forEach(e => { eventDocs[e._id] = e })
    }
    const list = listRes.data.map(o => ({ ...o, event: eventDocs[o.event_id] || null }))

    return {
      success: true,
      data: { list, total: countRes.total, hasMore: page * pageSize < countRes.total }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 支付回调 (云托管调用)
async function handlePayCallback(event) {
  try {
    const { outTradeNo, transactionId } = event
    if (!outTradeNo) return { errcode: -1, errmsg: 'missing outTradeNo' }

    const orderRes = await db.collection('orders').where({ order_no: outTradeNo }).get()
    if (orderRes.data.length === 0) return { errcode: -1, errmsg: 'order not found' }
    const order = orderRes.data[0]

    // 幂等检查
    if (order.status === 'paid') return { errcode: 0 }

    // 使用事务保证原子性
    const transaction = await db.startTransaction()
    try {
      await transaction.collection('orders').doc(order._id).update({
        data: {
          status: 'paid',
          transaction_id: transactionId || '',
          pay_time: db.serverDate(),
          updated_at: db.serverDate()
        }
      })

      const verifyCode = await generateUniqueVerifyCode(db.collection('registrations'))
      await transaction.collection('registrations').add({
        data: {
          user_id: order.user_id,
          open_id: order.open_id,
          event_id: order.event_id,
          order_id: order._id,
          verify_code: verifyCode,
          status: 'pending',
          verified_by: '',
          verified_at: null,
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      })

      await transaction.collection('events').doc(order.event_id).update({
        data: { enrolled_count: _.inc(1) }
      })

      await transaction.commit()
      return { errcode: 0 }
    } catch (txErr) {
      await transaction.rollback()
      return { errcode: -1, errmsg: txErr.message }
    }
  } catch (err) {
    return { errcode: -1, errmsg: err.message }
  }
}

// 退款回调
async function handleRefundCallback(event) {
  try {
    const { outTradeNo } = event
    const orderRes = await db.collection('orders').where({ order_no: outTradeNo }).get()
    if (orderRes.data.length === 0) return { errcode: -1 }

    const order = orderRes.data[0]
    if (order.status === 'refunded') return { errcode: 0 }

    // 使用事务保证原子性
    const transaction = await db.startTransaction()
    try {
      await transaction.collection('orders').doc(order._id).update({
        data: { status: 'refunded', refund_time: db.serverDate(), updated_at: db.serverDate() }
      })

      await transaction.collection('registrations').where({ order_id: order._id }).update({
        data: { status: 'cancelled', updated_at: db.serverDate() }
      })

      await transaction.collection('events').doc(order.event_id).update({
        data: { enrolled_count: _.inc(-1) }
      })

      await transaction.commit()
      return { errcode: 0 }
    } catch (txErr) {
      await transaction.rollback()
      return { errcode: -1, errmsg: txErr.message }
    }
  } catch (err) {
    return { errcode: -1, errmsg: err.message }
  }
}
