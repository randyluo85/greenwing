const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 内联工具函数
function generateVerifyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'QY-'
  const now = new Date()
  code += String(now.getMonth() + 1).padStart(2, '0')
  code += String(now.getDate()).padStart(2, '0')
  code += '-'
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  switch (action) {
    case 'list':
      return handleList(event)
    case 'detail':
      return handleDetail(event)
    case 'enrollFree':
      return handleEnrollFree(OPENID, event)
    case 'enrollPoints':
      return handleEnrollPoints(OPENID, event)
    case 'myEvents':
      return handleMyEvents(OPENID, event)
    case 'cancelEnroll':
      return handleCancelEnroll(OPENID, event)
    case 'verify':
      return handleVerify(OPENID, event)
    case 'getQRCode':
      return handleGetQRCode(OPENID, event)
    default:
      return { success: false, message: '未知操作' }
  }
}

// 活动列表
async function handleList(event) {
  try {
    const { page = 1, pageSize = 10, status = 'published', category } = event
    const where = { status }
    if (category) where.category = category

    const countRes = await db.collection('events').where(where).count()
    const listRes = await db.collection('events')
      .where(where)
      .orderBy('event_time', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: {
        list: listRes.data,
        total: countRes.total,
        hasMore: page * pageSize < countRes.total
      }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 活动详情
async function handleDetail(event) {
  try {
    const { eventId } = event
    if (!eventId) return { success: false, message: '缺少活动ID' }

    const res = await db.collection('events').doc(eventId).get()
    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, message: '活动不存在' }
  }
}

// 免费报名
async function handleEnrollFree(openid, event) {
  const transaction = await db.startTransaction()
  try {
    const { eventId } = event
    if (!eventId) return { success: false, message: '缺少活动ID' }

    // 查用户
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) return { success: false, message: '请先登录' }
    const user = userRes.data[0]

    // 查活动 (事务内)
    const eventRes = await transaction.collection('events').doc(eventId).get()
    const eventDoc = eventRes.data

    if (eventDoc.status !== 'published') {
      await transaction.rollback()
      return { success: false, message: '活动已下架' }
    }
    if (eventDoc.quota && eventDoc.enrolled_count >= eventDoc.quota) {
      await transaction.rollback()
      return { success: false, message: '名额已满' }
    }
    if (eventDoc.registration_deadline && new Date() > new Date(eventDoc.registration_deadline)) {
      await transaction.rollback()
      return { success: false, message: '报名已截止' }
    }

    // 检查重复报名
    const existReg = await transaction.collection('registrations')
      .where({ user_id: user._id, event_id: eventId, status: _.neq('cancelled') })
      .get()
    if (existReg.data.length > 0) {
      await transaction.rollback()
      return { success: false, message: '已报名该活动' }
    }

    // 创建报名记录
    const verifyCode = generateVerifyCode()
    await transaction.collection('registrations').add({
      data: {
        user_id: user._id,
        open_id: openid,
        event_id: eventId,
        order_id: '',
        verify_code: verifyCode,
        status: 'pending',
        verified_by: '',
        verified_at: null,
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })

    // 增加已报名人数
    await transaction.collection('events').doc(eventId).update({
      data: { enrolled_count: _.inc(1) }
    })

    await transaction.commit()
    return { success: true, data: { verify_code: verifyCode } }
  } catch (err) {
    await transaction.rollback()
    return { success: false, message: '报名失败: ' + err.message }
  }
}

// 积分报名
async function handleEnrollPoints(openid, event) {
  const transaction = await db.startTransaction()
  try {
    const { eventId } = event
    if (!eventId) return { success: false, message: '缺少活动ID' }

    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) return { success: false, message: '请先登录' }
    const user = userRes.data[0]

    const eventRes = await transaction.collection('events').doc(eventId).get()
    const eventDoc = eventRes.data

    if (eventDoc.status !== 'published') {
      await transaction.rollback()
      return { success: false, message: '活动已下架' }
    }
    if (eventDoc.quota && eventDoc.enrolled_count >= eventDoc.quota) {
      await transaction.rollback()
      return { success: false, message: '名额已满' }
    }
    if (eventDoc.registration_mode !== 'points_only') {
      await transaction.rollback()
      return { success: false, message: '该活动不支持积分报名' }
    }

    // 检查等级门槛
    if (eventDoc.tier_threshold && eventDoc.tier_threshold !== 'none') {
      const levelOrder = ['bronze', 'silver', 'gold']
      const requiredIdx = levelOrder.indexOf(eventDoc.tier_threshold)
      const userIdx = levelOrder.indexOf(user.level)
      if (userIdx < requiredIdx) {
        await transaction.rollback()
        return { success: false, message: `需要${eventDoc.tier_threshold === 'silver' ? '白银' : '黄金'}会员及以上` }
      }
    }

    // 检查积分
    const pointsCost = eventDoc.points_cost || 0
    if (user.current_points < pointsCost) {
      await transaction.rollback()
      return { success: false, message: `积分不足，需要 ${pointsCost} 积分` }
    }

    // 检查重复报名
    const existReg = await transaction.collection('registrations')
      .where({ user_id: user._id, event_id: eventId, status: _.neq('cancelled') })
      .get()
    if (existReg.data.length > 0) {
      await transaction.rollback()
      return { success: false, message: '已报名该活动' }
    }

    // 扣减积分
    await transaction.collection('users').doc(user._id).update({
      data: { current_points: _.inc(-pointsCost), updated_at: db.serverDate() }
    })

    // 记录积分流水
    await transaction.collection('point_logs').add({
      data: {
        user_id: user._id,
        open_id: openid,
        amount: -pointsCost,
        type: 'event_enroll',
        related_id: eventId,
        description: `活动报名消耗 ${pointsCost} 积分`,
        created_at: db.serverDate()
      }
    })

    // 创建报名记录
    const verifyCode = generateVerifyCode()
    await transaction.collection('registrations').add({
      data: {
        user_id: user._id,
        open_id: openid,
        event_id: eventId,
        order_id: '',
        verify_code: verifyCode,
        status: 'pending',
        verified_by: '',
        verified_at: null,
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })

    await transaction.collection('events').doc(eventId).update({
      data: { enrolled_count: _.inc(1) }
    })

    await transaction.commit()
    return { success: true, data: { verify_code: verifyCode, pointsUsed: pointsCost } }
  } catch (err) {
    await transaction.rollback()
    return { success: false, message: '报名失败: ' + err.message }
  }
}

// 我的活动
async function handleMyEvents(openid, event) {
  try {
    const { page = 1, pageSize = 10, status } = event
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) return { success: false, message: '请先登录' }
    const userId = userRes.data[0]._id

    const where = { user_id: userId }
    if (status) where.status = status

    const countRes = await db.collection('registrations').where(where).count()
    const regRes = await db.collection('registrations')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 批量关联活动信息
    const eventIds = [...new Set(regRes.data.map(r => r.event_id).filter(Boolean))]
    const eventDocs = {}
    if (eventIds.length > 0) {
      const eventRes = await db.collection('events').where({ _id: _.in(eventIds) }).get()
      eventRes.data.forEach(e => { eventDocs[e._id] = e })
    }
    const list = regRes.data.map(r => ({ ...r, event: eventDocs[r.event_id] || null }))

    return {
      success: true,
      data: { list, total: countRes.total, hasMore: page * pageSize < countRes.total }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 取消报名
async function handleCancelEnroll(openid, event) {
  const transaction = await db.startTransaction()
  try {
    const { registrationId } = event
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) return { success: false, message: '请先登录' }
    const user = userRes.data[0]

    const regRes = await db.collection('registrations').doc(registrationId).get()
    const reg = regRes.data

    if (reg.user_id !== user._id) return { success: false, message: '无权操作' }
    if (reg.status === 'cancelled') return { success: false, message: '已取消' }
    if (reg.status === 'verified') return { success: false, message: '已核销，无法取消' }

    await transaction.collection('registrations').doc(registrationId).update({
      data: { status: 'cancelled', updated_at: db.serverDate() }
    })
    await transaction.collection('events').doc(reg.event_id).update({
      data: { enrolled_count: _.inc(-1) }
    })

    // 如果是积分报名，退还积分
    if (!reg.order_id) {
      const eventRes = await db.collection('events').doc(reg.event_id).get()
      if (eventRes.data.registration_mode === 'points_only' && eventRes.data.points_cost > 0) {
        await transaction.collection('users').doc(user._id).update({
          data: { current_points: _.inc(eventRes.data.points_cost) }
        })
        await transaction.collection('point_logs').add({
          data: {
            user_id: user._id, open_id: openid,
            amount: eventRes.data.points_cost,
            type: 'refund',
            related_id: registrationId,
            description: `取消活动报名，退还 ${eventRes.data.points_cost} 积分`,
            created_at: db.serverDate()
          }
        })
      }
    }

    await transaction.commit()
    return { success: true, message: '取消成功' }
  } catch (err) {
    await transaction.rollback()
    return { success: false, message: err.message }
  }
}

// 扫码核销
async function handleVerify(openid, event) {
  const transaction = await db.startTransaction()
  try {
    const { code } = event
    if (!code) return { success: false, message: '缺少核销码' }

    // 校验核销员权限
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) return { success: false, message: '请先登录' }
    const user = userRes.data[0]
    if (user.role !== 'admin' && user.role !== 'verifier') {
      return { success: false, message: '无核销权限' }
    }

    // 查找报名记录
    const regRes = await transaction.collection('registrations').where({ verify_code: code }).get()
    if (regRes.data.length === 0) {
      await transaction.rollback()
      return { success: false, message: '无效的核销码' }
    }
    const reg = regRes.data[0]

    if (reg.status === 'verified') {
      await transaction.rollback()
      return { success: false, message: '该核销码已使用' }
    }
    if (reg.status === 'cancelled') {
      await transaction.rollback()
      return { success: false, message: '该报名已取消' }
    }

    // 更新核销状态
    await transaction.collection('registrations').doc(reg._id).update({
      data: {
        status: 'verified',
        verified_by: openid,
        verified_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })

    // 发放活动奖励积分
    try {
      const eventRes = await db.collection('events').doc(reg.event_id).get()
      const rewardPoints = eventRes.data.reward_points || 0
      if (rewardPoints > 0) {
        await transaction.collection('users').doc(reg.user_id).update({
          data: {
            total_points: _.inc(rewardPoints),
            current_points: _.inc(rewardPoints),
            updated_at: db.serverDate()
          }
        })
        await transaction.collection('point_logs').add({
          data: {
            user_id: reg.user_id, open_id: reg.open_id,
            amount: rewardPoints,
            type: 'event_reward',
            related_id: reg.event_id,
            description: `活动核销奖励 +${rewardPoints}积分`,
            created_at: db.serverDate()
          }
        })
      }
    } catch (e) {
      console.warn('奖励积分失败:', e)
    }

    await transaction.commit()
    return { success: true, data: { registration_id: reg._id, user_nickname: user.nickname } }
  } catch (err) {
    await transaction.rollback()
    return { success: false, message: '核销失败: ' + err.message }
  }
}

// 获取入场小程序码
async function handleGetQRCode(openid, event) {
  try {
    const { verifyCode } = event
    if (!verifyCode) return { success: false, message: '缺少核销码' }

    // 查找报名记录，校验归属
    const regRes = await db.collection('registrations')
      .where({ verify_code: verifyCode, open_id: openid })
      .get()
    if (regRes.data.length === 0) return { success: false, message: '无权操作' }
    const reg = regRes.data[0]

    // 缓存命中：已有小程序码
    if (reg.qrcode_url) {
      const urlRes = await cloud.getTempFileURL({ fileList: [reg.qrcode_url] })
      return {
        success: true,
        data: { qrcode_url: urlRes.fileList[0].tempFileURL }
      }
    }

    // 调用 wxacode.getUnlimited 生成小程序码
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: verifyCode,
      page: 'pages/verify/verify',
      width: 280,
      checkPath: false,
      isHyaline: false
    })

    // 上传到云存储
    const cloudPath = `qrcodes/${verifyCode}.png`
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: result.buffer
    })

    // 回写到报名记录
    await db.collection('registrations').doc(reg._id).update({
      data: { qrcode_url: uploadRes.fileID }
    })

    // 获取临时 URL
    const urlRes = await cloud.getTempFileURL({ fileList: [uploadRes.fileID] })
    return {
      success: true,
      data: { qrcode_url: urlRes.fileList[0].tempFileURL }
    }
  } catch (err) {
    console.error('生成小程序码失败:', err)
    return { success: false, data: { fallback: true }, message: '生成小程序码失败，请使用核销码' }
  }
}
