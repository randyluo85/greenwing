const cloud = require('wx-server-sdk')
const envId = cloud.DYNAMIC_CURRENT_ENV
cloud.init({ env: envId })
const db = cloud.database()
const _ = db.command

// 微信支付商户号 (必须在云函数环境变量中配置 MCH_ID)
if (!process.env.MCH_ID) {
  throw new Error('MCH_ID 环境变量未配置，请在云开发控制台设置')
}
const MCH_ID = process.env.MCH_ID

// cloudPay API 需要真实环境 ID，DYNAMIC_CURRENT_ENV 只对 cloud.init 有效
let REAL_ENV_ID = ''

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

    if (!eventDoc.price || eventDoc.price <= 0) {
      return { success: false, message: '活动价格异常，无法支付' }
    }

    const addRes = await db.collection('orders').add({ data: orderData })

    // 调用云托管统一下单
    try {
      const payRes = await cloud.cloudPay.unifiedOrder({
        body: `青翼读书会 - ${eventDoc.title}`,
        out_trade_no: orderNo,
        spbill_create_ip: '127.0.0.1',
        total_fee: eventDoc.price,
        envId: REAL_ENV_ID || cloud.DYNAMIC_CURRENT_ENV,
        functionName: 'pay',
        sub_mch_id: MCH_ID,
        nonce_str: Math.random().toString(36).slice(2, 17),
        trade_type: 'JSAPI'
      })

      console.log('[pay] 统一下单成功, payment:', payRes)
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
      console.error('[pay] 统一下单失败:', payErr)
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

    // 检查是否已核销
    const regCheckRes = await db.collection('registrations').where({ order_id: orderId }).get()
    if (regCheckRes.data.length > 0 && regCheckRes.data[0].status === 'verified') {
      return { success: false, message: '该订单已核销，无法申请退款' }
    }

    // 检查微信真实状态，如果已经发生过退款，直接拦截并纠正数据库状态
    try {
      const crypto = require('crypto')
      const queryRes = await cloud.cloudPay.queryOrder({
        sub_mch_id: MCH_ID,
        out_trade_no: order.order_no,
        nonce_str: crypto.randomBytes(16).toString('hex')
      })
      
      if (queryRes.tradeState === 'REFUND' || queryRes.tradeState === 'CLOSED') {
        await syncRefundedOrder(order)
        return { success: false, message: '该订单已经退款，系统已自动同步最新状态，无需重复申请' }
      }
    } catch(e) {
      console.warn("查询微信状态失败，继续后续流程", e)
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

    // 批量关联报名信息 (为了在前端判断能否退款)
    const orderIds = listRes.data.map(o => o._id)
    const regDocs = {}
    if (orderIds.length > 0) {
      const regRes = await db.collection('registrations').where({ order_id: _.in(orderIds) }).get()
      regRes.data.forEach(r => { regDocs[r.order_id] = r })
    }

    const list = listRes.data.map(o => ({ 
      ...o, 
      event: eventDocs[o.event_id] || null,
      registration: regDocs[o._id] || null
    }))

    // 懒加载自我修复机制：当用户查看我的订单时，对于已经是退款的订单，自动校验一次报名表和库存是否对齐
    for (const order of list) {
      if (order.status === 'refunded') {
        // 后台静默校验修复，不需要 await 导致前台变慢
        syncRefundedOrder(order).catch(e => console.error('lazy sync fail', e))
      }
    }

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
    console.log('[payCallback] 收到支付回调，参数:', JSON.stringify(event))
    const { outTradeNo, transactionId } = event
    if (!outTradeNo) {
      console.error('[payCallback] 缺少 outTradeNo')
      return { errcode: -1, errmsg: 'missing outTradeNo' }
    }

    console.log('[payCallback] 查询订单，orderNo:', outTradeNo)
    const orderRes = await db.collection('orders').where({ order_no: outTradeNo }).get()
    if (orderRes.data.length === 0) {
      console.error('[payCallback] 订单不存在，orderNo:', outTradeNo)
      return { errcode: -1, errmsg: 'order not found' }
    }
    const order = orderRes.data[0]
    console.log('[payCallback] 订单当前状态:', order.status)

    // 幂等检查
    if (order.status === 'paid') {
      console.log('[payCallback] 订单已支付，跳过处理')
      return { errcode: 0 }
    }

    console.log('[payCallback] 开始处理支付成功，orderId:', order._id)
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
      console.log('[payCallback] 订单状态已更新为 paid')

      // 获取用户信息，用于填写报名记录中的真实姓名和联系电话
      const userRes = await transaction.collection('users').doc(order.user_id).get()
      const user = userRes.data

      // 检查重复报名
      const existRegRes = await transaction.collection('registrations')
        .where({ user_id: order.user_id, event_id: order.event_id })
        .get()
      let existReg = null
      if (existRegRes.data.length > 0) {
        existRegRes.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        existReg = existRegRes.data[0]
      }

      const verifyCode = await generateUniqueVerifyCode(db.collection('registrations'))
      const regData = {
        user_id: order.user_id,
        open_id: order.open_id,
        event_id: order.event_id,
        order_id: order._id,
        verify_code: verifyCode,
        real_name: user.real_name || '',
        contact_phone: user.phone || '',
        status: 'pending',
        verified_by: '',
        verified_at: null,
        created_at: existReg ? existReg.created_at : db.serverDate(),
        updated_at: db.serverDate()
      }

      if (existReg) {
        await transaction.collection('registrations').doc(existReg._id).update({ data: regData })
      } else {
        await transaction.collection('registrations').add({ data: regData })
      }
      console.log('[payCallback] 报名记录已创建/更新，verifyCode:', verifyCode)

      await transaction.collection('events').doc(order.event_id).update({
        data: { enrolled_count: _.inc(1) }
      })
      console.log('[payCallback] 活动报名人数已增加')

      // 获取活动详情以下发通知
      const eventInfoRes = await transaction.collection('events').doc(order.event_id).get()
      const eventInfo = eventInfoRes.data
      
      await transaction.collection('notifications').add({
        data: {
          open_id: order.open_id,
          title: '报名成功',
          body: `您已成功报名《${eventInfo.title}》，请准时参加。`,
          icon_bg_color: '#5c8deb',
          icon_text: '报',
          is_read: false,
          type: 'event_register',
          created_at: db.serverDate()
        }
      })

      await transaction.commit()
      console.log('[payCallback] 事务提交成功')
      return { errcode: 0 }
    } catch (txErr) {
      console.error('[payCallback] 事务失败，回滚:', txErr)
      await transaction.rollback()
      return { errcode: -1, errmsg: txErr.message }
    }
  } catch (err) {
    console.error('[payCallback] 处理失败:', err)
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

    // 提前查询关联的报名记录ID，云开发事务不支持 where().update()
    const regRes = await db.collection('registrations').where({ order_id: order._id }).get()
    const regId = regRes.data.length > 0 ? regRes.data[0]._id : null

    // 使用事务保证原子性
    const transaction = await db.startTransaction()
    try {
      await transaction.collection('orders').doc(order._id).update({
        data: { status: 'refunded', refund_time: db.serverDate(), updated_at: db.serverDate() }
      })

      if (regId) {
        await transaction.collection('registrations').doc(regId).update({
          data: { status: 'cancelled', updated_at: db.serverDate() }
        })
      }

      await transaction.collection('events').doc(order.event_id).update({
        data: { enrolled_count: _.inc(-1) }
      })

      // 下发退款消息
      await transaction.collection('notifications').add({
        data: {
          open_id: order.open_id,
          title: '退款成功',
          body: `您报名的活动订单 ${order.order_no} 微信退款已到账，金额 ${order.amount} 元。`,
          icon_bg_color: '#10b981',
          icon_text: '退',
          is_read: false,
          type: 'refund_success',
          created_at: db.serverDate()
        }
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



// ======================= 新增/恢复的管理后台与辅助逻辑 =======================

// 同步已在微信侧退款成功的订单状态 (解决状态不同步导致反复可退款的问题)
async function syncRefundedOrder(order) {
  const transaction = await db.startTransaction()
  try {
    const regRes = await db.collection('registrations').where({ order_id: order._id }).get()
    const reg = regRes.data.length > 0 ? regRes.data[0] : null
    const regId = reg ? reg._id : null
    
    // 如果订单已退款 且 报名已取消，说明全量同步完毕，直接返回
    if (order.status === 'refunded' && (!reg || reg.status === 'cancelled')) {
      await transaction.rollback();
      return true;
    }

    // 更新订单状态（容错：即使之前手动改成了refunded也能覆盖一次updated_at）
    await transaction.collection('orders').doc(order._id).update({
      data: {
        status: 'refunded',
        refund_time: db.serverDate(),
        refund_method: 'sync_check',
        updated_at: db.serverDate()
      }
    })

    let needsDecrement = false;
    
    // 只有当报名存在且未被取消时，才将其取消，并且允许扣除活动已报名人数
    if (reg && reg.status !== 'cancelled') {
      await transaction.collection('registrations').doc(regId).update({
        data: { status: 'cancelled', updated_at: db.serverDate() }
      })
      needsDecrement = true;
    }

    if (needsDecrement) {
      await transaction.collection('events').doc(order.event_id).update({
        data: { enrolled_count: db.command.inc(-1) }
      })
    }
    
    await transaction.commit()
    console.log(`[syncRefundedOrder] ✅ 已同步订单 ${order.order_no} 为已退款状态 (连带更新报名和人数状态)`)
    return true
  } catch (err) {
    await transaction.rollback()
    console.error('syncRefundedOrder fail:', err)
    return false
  }
}

// 主动同步订单状态 (供 Admin 调用)
async function handleSyncOrder(event) {
  try {
    const { orderNo, orderId } = event

    let orderRes
    let order
    // 支持通过 orderId(_id) 或 orderNo 查询
    if (orderId) {
      orderRes = await db.collection('orders').doc(orderId).get()
      // doc().get() 返回的是单个对象，不是数组
      order = orderRes.data
    } else if (orderNo) {
      orderRes = await db.collection('orders').where({ order_no: orderNo }).get()
      if (orderRes.data.length === 0) return { success: false, message: '未找到订单' }
      order = orderRes.data[0]
    } else {
      return { success: false, message: '缺少订单号' }
    }
    if (!order) return { success: false, message: '未找到订单' }

    const crypto = require('crypto')
    const queryRes = await cloud.cloudPay.queryOrder({
      sub_mch_id: MCH_ID,
      out_trade_no: order.order_no,
      nonce_str: crypto.randomBytes(16).toString('hex')
    })

    console.log(`[handleSyncOrder] 订单=${order.order_no}, 微信状态=${queryRes.tradeState}`)

    // 如果微信侧显示已退款或已关闭，同步到数据库
    if (queryRes.tradeState === 'REFUND' || queryRes.tradeState === 'CLOSED') {
      await syncRefundedOrder(order)
      return { success: true, message: '状态已同步', data: { status: 'refunded' } }
    }

    return { success: true, data: { status: order.status, wechatStatus: queryRes.tradeState } }
  } catch (err) {
    console.error('[handleSyncOrder] error:', err)
    return { success: false, message: err.message }
  }
}

// ======================= 小程序管理员退款审批功能 =======================

// 验证管理员权限
async function checkAdminPermission(openid) {
  try {
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) return false
    const user = userRes.data[0]
    return user.role === 'admin' || user.role === 'verifier' || user.member_no === 'admin'
  } catch (err) {
    console.error('[checkAdminPermission] error:', err)
    return false
  }
}

// 小程序管理员：获取待退款审批的订单列表
async function handleMpAdminRefundList(openid, event) {
  try {
    const isAdmin = await checkAdminPermission(openid)
    if (!isAdmin) {
      return { success: false, message: '无管理员权限' }
    }

    const { page = 1, pageSize = 50 } = event
    const where = { status: 'refunding' }

    const countRes = await db.collection('orders').where(where).count()
    const listRes = await db.collection('orders')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

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

    const eventIds = listRes.data.map(o => o.event_id).filter(id => id)
    const eventMap = {}
    if (eventIds.length > 0) {
      const distinctEventIds = [...new Set(eventIds)]
      const eventRes = await db.collection('events')
        .where({ _id: _.in(distinctEventIds) })
        .get()
      eventRes.data.forEach(e => {
        eventMap[e._id] = { _id: e._id, title: e.title }
      })
    }

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
    console.error('[mpAdminRefundList] error:', err)
    return { success: false, message: err.message }
  }
}

// 小程序管理员：同意退款
async function handleMpAdminApproveRefund(openid, event) {
  try {
    const isAdmin = await checkAdminPermission(openid)
    if (!isAdmin) {
      return { success: false, message: '无管理员权限' }
    }

    const { orderId } = event
    if (!orderId) return { success: false, message: '缺少订单ID' }

    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    if (order.status !== 'refunding') {
      return { success: false, message: '订单状态不正确，当前状态：' + order.status }
    }

    // 乐观锁：原子更新 refunding -> refunding_processing，防止并发退款
    const lockRes = await db.collection('orders').where({
      _id: orderId,
      status: 'refunding'
    }).update({
      data: { status: 'refunding_processing', updated_at: db.serverDate() }
    })
    if (lockRes.stats.updated === 0) {
      return { success: false, message: '订单正在处理中或状态已变更，请勿重复操作' }
    }

    try {
      const refundRes = await cloud.cloudPay.refund({
        out_trade_no: order.order_no,
        out_refund_no: 'RF' + order.order_no,
        total_fee: order.amount,
        refund_fee: order.amount,
        envId: REAL_ENV_ID || cloud.DYNAMIC_CURRENT_ENV,
        functionName: 'pay',
        sub_mch_id: MCH_ID
      })

      // 退款已被微信受理，立即更新本地状态（不依赖回调）
      const regRes = await db.collection('registrations').where({ order_id: orderId }).get()
      const regId = regRes.data.length > 0 ? regRes.data[0]._id : null
      const regNeedCancel = regRes.data.length > 0 && regRes.data[0].status !== 'cancelled'

      const transaction = await db.startTransaction()
      try {
        await transaction.collection('orders').doc(orderId).update({
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
        console.log('[mpAdminApproveRefund] ✅ 退款事务完成: 订单→refunded, 报名→cancelled')

        // 发送退款通知放事务外
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
          console.error('[mpAdminApproveRefund] 发送退款通知失败:', noteErr)
        }

      } catch (txErr) {
        await transaction.rollback()
        console.error('[mpAdminApproveRefund] 事务失败:', txErr)
        // 事务失败但微信退款已受理，保底更新订单和报名状态
        await db.collection('orders').doc(orderId).update({
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

      return { success: true, message: '退款已发起，款项将在 1-5 个工作日内原路退回' }
    } catch (refundErr) {
      // 微信退款API失败，回滚乐观锁
      await db.collection('orders').doc(orderId).update({
        data: { status: 'refunding', updated_at: db.serverDate() }
      })
      return { success: false, message: '退款失败: ' + refundErr.message }
    }
  } catch (err) {
    console.error('[mpAdminApproveRefund] error:', err)
    return { success: false, message: err.message }
  }
}

// 小程序管理员：驳回退款
async function handleMpAdminRejectRefund(openid, event) {
  try {
    const isAdmin = await checkAdminPermission(openid)
    if (!isAdmin) {
      return { success: false, message: '无管理员权限' }
    }

    const { orderId, reason } = event
    if (!orderId) return { success: false, message: '缺少订单ID' }

    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    if (order.status !== 'refunding') {
      return { success: false, message: '订单状态不正确，当前状态：' + order.status }
    }

    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'paid',
        refund_reason: reason || '退款申请已驳回',
        updated_at: db.serverDate()
      }
    })

    await db.collection('notifications').add({
      data: {
        open_id: order.open_id,
        title: '退款申请已驳回',
        body: `您的订单 ${order.order_no} 退款申请已被驳回。原因：${reason || '请联系管理员了解详情'}`,
        icon_bg_color: '#f59e0b',
        icon_text: '驳',
        is_read: false,
        type: 'refund_rejected',
        created_at: db.serverDate()
      }
    }).catch(e => console.error('[mpAdminRejectRefund] 发送通知失败:', e))

    return { success: true, message: '退款已驳回' }
  } catch (err) {
    console.error('[mpAdminRejectRefund] error:', err)
    return { success: false, message: err.message }
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { OPENID, ENV } = cloud.getWXContext()
  if (ENV) REAL_ENV_ID = ENV
  const { action } = event

  // 检查是否是微信支付回调（HTTP POST 请求，可能没有 action 参数）
  const isPayCallback = !action && event.outTradeNo && event.transactionId
  const isRefundCallback = !action && event.outTradeNo && !event.transactionId

  if (isPayCallback) {
    console.log('[pay] 检测到微信支付回调，参数:', JSON.stringify(event))
    return handlePayCallback(event)
  }

  if (isRefundCallback) {
    console.log('[pay] 检测到微信退款回调，参数:', JSON.stringify(event))
    return handleRefundCallback(event)
  }

  // 正常的云函数调用路由
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
    case 'syncOrder':
      return handleSyncOrder(event)
    case 'mpAdminRefundList':
      return handleMpAdminRefundList(OPENID, event)
    case 'mpAdminApproveRefund':
      return handleMpAdminApproveRefund(OPENID, event)
    case 'mpAdminRejectRefund':
      return handleMpAdminRejectRefund(OPENID, event)
    default:
      return { success: false, message: '未知操作' }
  }
}
