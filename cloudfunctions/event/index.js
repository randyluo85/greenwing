const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 内联工具函数
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
  // 3次都碰撞，用时间戳后缀保底
  return generateVerifyCode() + Date.now().toString(36).slice(-3)
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
    case 'checkEnrollment':
      return handleCheckEnrollment(OPENID, event)
    case 'listComments':
      return handleListComments(OPENID, event)
    case 'addComment':
      return handleAddComment(OPENID, event)
    case 'checkRegStatus':
      return handleCheckRegStatus(OPENID, event)
    default:
      return { success: false, message: '未知操作' }
  }
}

// 获取活动列表（用户端）
async function handleList(event) {
  try {
    const { page = 1, pageSize = 10, category, includeEnded = false } = event
    const safePageSize = Math.min(Math.max(1, pageSize), 100)

    // 使用 ISO 字符串进行时间比较，确保在不同环境下一致
    const now = new Date()
    const nowISO = now.toISOString()

    const $ = _.aggregate

    // 基础筛选条件
    const baseWhere = { status: _.in(['published', 'full']) }
    if (category) baseWhere.category = category

    // 根据是否包含已结束活动，构建不同的查询条件
    let where, countRes, listRes

    if (includeEnded) {
      // 只查询已结束活动：event_time < 当前时间
      where = { ...baseWhere, event_time: _.lt(nowISO) }
      countRes = await db.collection('events').where(where).count()

      listRes = await db.collection('events').where(where)
        .orderBy('event_time', 'desc')
        .skip((page - 1) * safePageSize)
        .limit(safePageSize)
        .get()
    } else {
      // 只查询未结束的活动：event_time >= 当前时间
      // 使用字符串比较，ISO 格式可按字典序比较
      where = {
        ...baseWhere,
        event_time: _.gte(nowISO)
      }
      countRes = await db.collection('events').where(where).count()

      listRes = await db.collection('events').where(where)
        .orderBy('event_time', 'asc')
        .skip((page - 1) * safePageSize)
        .limit(safePageSize)
        .get()
    }

    return {
      success: true,
      data: {
        list: listRes.list || listRes.data,
        total: countRes.total,
        hasMore: page * safePageSize < countRes.total,
        includeEnded: includeEnded
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
    const { eventId, realName, contactPhone } = event
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
    const existRegRes = await transaction.collection('registrations')
      .where({ user_id: user._id, event_id: eventId })
      .get()
    
    let existReg = null
    if (existRegRes.data.length > 0) {
      // 获取最新的一条记录
      existRegRes.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      existReg = existRegRes.data[0]
      if (existReg.status !== 'cancelled') {
        await transaction.rollback()
        return { success: false, message: '已报名该活动' }
      }
    }

    // 创建报名记录
    const verifyCode = await generateUniqueVerifyCode(db.collection('registrations'))
    const regData = {
      user_id: user._id,
      open_id: openid,
      event_id: eventId,
      order_id: '',
      verify_code: verifyCode,
      real_name: realName || user.real_name || '',
      contact_phone: contactPhone || user.phone || '',
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

    // 增加已报名人数
    await transaction.collection('events').doc(eventId).update({
      data: { enrolled_count: _.inc(1) }
    })

    // 下发报名成功通知
    await transaction.collection('notifications').add({
      data: {
        open_id: openid,
        title: '报名成功',
        body: `您已成功报名免费活动《${eventDoc.title}》，请准时参加。`,
        icon_bg_color: '#5c8deb',
        icon_text: '报',
        is_read: false,
        type: 'event_register',
        created_at: db.serverDate()
      }
    })

    // 更新用户表资料（回填真实姓名和手机号到用户资料）
    const userUpdateData = {}
    let needUpdateUser = false
    if (realName && user.real_name !== realName) {
      userUpdateData.real_name = realName
      needUpdateUser = true
      // 如果当前昵称是默认值“书友”，则同步更新昵称
      if (user.nickname === '书友') {
        userUpdateData.nickname = realName
      }
    }
    if (contactPhone && user.phone !== contactPhone) {
      userUpdateData.phone = contactPhone
      needUpdateUser = true
    }
    if (needUpdateUser) {
      userUpdateData.updated_at = db.serverDate()
      await transaction.collection('users').doc(user._id).update({
        data: userUpdateData
      })
    }

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
    const { eventId, realName, contactPhone } = event
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
    const existRegRes = await transaction.collection('registrations')
      .where({ user_id: user._id, event_id: eventId })
      .get()

    let existReg = null
    if (existRegRes.data.length > 0) {
      // 获取最新的一条记录
      existRegRes.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      existReg = existRegRes.data[0]
      if (existReg.status !== 'cancelled') {
        await transaction.rollback()
        return { success: false, message: '已报名该活动' }
      }
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
    const verifyCode = await generateUniqueVerifyCode(db.collection('registrations'))
    const regData = {
      user_id: user._id,
      open_id: openid,
      event_id: eventId,
      order_id: '',
      verify_code: verifyCode,
      real_name: realName || user.real_name || '',
      contact_phone: contactPhone || user.phone || '',
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

    await transaction.collection('events').doc(eventId).update({
      data: { enrolled_count: _.inc(1) }
    })

    // 更新用户表资料（回填真实姓名和手机号）
    const userUpdateData = {}
    let needUpdateUser = false
    if (realName && user.real_name !== realName) {
      userUpdateData.real_name = realName
      needUpdateUser = true
      // 如果当前昵称是默认值“书友”，则同步更新昵称
      if (user.nickname === '书友') {
        userUpdateData.nickname = realName
      }
    }
    if (contactPhone && user.phone !== contactPhone) {
      userUpdateData.phone = contactPhone
      needUpdateUser = true
    }
    if (needUpdateUser) {
      userUpdateData.updated_at = db.serverDate()
      await transaction.collection('users').doc(user._id).update({
        data: userUpdateData
      })
    }

    // 下发报名成功通知
    await transaction.collection('notifications').add({
      data: {
        open_id: openid,
        title: '报名成功',
        body: `您已成功报名活动《${eventDoc.title}》，消耗了 ${pointsCost} 积分，请准时参加。`,
        icon_bg_color: '#5c8deb',
        icon_text: '报',
        is_read: false,
        type: 'event_register',
        created_at: db.serverDate()
      }
    })

    // 如果用户没有真实姓名，更新用户表（下次报名时无需重复填写）
    if (!user.real_name && realName) {
      await transaction.collection('users').doc(user._id).update({
        data: { real_name: realName, updated_at: db.serverDate() }
      })
    }

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

    // 严禁付费订单直接走取消路线。强制引导到“我的订单”申请退款
    if (reg.order_id) {
      await transaction.rollback()
      return { success: false, message: '付费活动不支持直接取消，请前往「我的订单」申请退款' }
    }

    await transaction.collection('registrations').doc(registrationId).update({
      data: { status: 'cancelled', updated_at: db.serverDate() }
    })
    await transaction.collection('events').doc(reg.event_id).update({
      data: { enrolled_count: _.inc(-1) }
    })

    // 退还积分逻辑：确保精确退还这笔报名实际扣掉的积分数额，防止后台事后修改积分定价造成多退或少退
    const pointLogsRes = await db.collection('point_logs')
      .where({ user_id: user._id, type: 'event_enroll', related_id: reg.event_id })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()

    if (pointLogsRes.data.length > 0) {
      const deductionAmount = Math.abs(pointLogsRes.data[0].amount) // 从扣除记录中提取绝对值
      if (deductionAmount > 0) {
        await transaction.collection('users').doc(user._id).update({
          data: { current_points: _.inc(deductionAmount), updated_at: db.serverDate() }
        })
        await transaction.collection('point_logs').add({
          data: {
            user_id: user._id, open_id: openid,
            amount: deductionAmount,
            type: 'refund',
            related_id: registrationId,
            description: `取消报名，精确原路退还 ${deductionAmount} 积分`,
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

    // 查询报名者信息
    let regNickname = '未知用户'
    let regRealName = reg.real_name || ''
    let regPhone = reg.contact_phone || ''
    try {
      const regUserRes = await db.collection('users').doc(reg.user_id).get()
      regNickname = regUserRes.data.nickname || regNickname
    } catch (e) {
      console.warn('查询报名者昵称失败:', e.message)
    }

    return {
      success: true,
      data: {
        registration_id: reg._id,
        user_nickname: regNickname,
        real_name: regRealName,
        contact_phone: regPhone
      }
    }
  } catch (err) {
    await transaction.rollback()
    return { success: false, message: '核销失败: ' + err.message }
  }
}

// 获取入场小程序码
async function handleGetQRCode(openid, event) {
  try {
    const { verifyCode } = event
    console.log('[event] 获取入场小程序码，verifyCode:', verifyCode)
    console.log('[event] 当前用户 openid:', openid)

    if (!verifyCode) {
      console.error('[event] 缺少核销码参数')
      return { success: false, message: '缺少核销码' }
    }

    // 查找报名记录，校验归属
    console.log('[event] 查询报名记录，verify_code:', verifyCode, 'open_id:', openid)
    const regRes = await db.collection('registrations')
      .where({ verify_code: verifyCode, open_id: openid })
      .get()

    console.log('[event] 查询结果数量:', regRes.data.length)

    if (regRes.data.length === 0) {
      console.error('[event] 无权操作：未找到匹配的报名记录')
      return { success: false, message: '无权操作' }
    }

    const reg = regRes.data[0]
    console.log('[event] 找到报名记录，_id:', reg._id)
    console.log('[event] 报名记录 qrcode_url:', reg.qrcode_url)

    // 缓存命中：已有小程序码
    if (reg.qrcode_url) {
      console.log('[event] 缓存命中，已有小程序码:', reg.qrcode_url)
      const urlRes = await cloud.getTempFileURL({ fileList: [reg.qrcode_url] })
      console.log('[event] 临时URL获取成功:', urlRes.fileList[0].tempFileURL)
      return {
        success: true,
        data: { qrcode_url: urlRes.fileList[0].tempFileURL }
      }
    }

    // 调用 wxacode.getUnlimited 生成小程序码
    console.log('[event] 开始生成小程序码，scene:', verifyCode)
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: verifyCode,
      page: 'pkg-my/pages/verify/verify',
      width: 280,
      checkPath: false,
      envVersion: 'release',
      isHyaline: false
    })

    console.log('[event] 微信 API 返回:', result.errCode, result.errMsg, result.buffer?.length)

    if (result.errCode && result.errCode !== 0) {
      console.error('[event] 生成小程序码失败 (errCode):', result)
      throw new Error(`API Error: ${result.errCode} - ${result.errMsg}`)
    }

    if (!result.buffer) {
      console.error('[event] 未获取到图片buffer:', result)
      throw new Error(`未获取到图片buffer: ${result.errMsg || '未知原因'}`)
    }

    console.log('[event] 小程序码生成成功，buffer长度:', result.buffer.length)

    // 上传到云存储
    const cloudPath = `qrcodes/${verifyCode}.png`
    console.log('[event] 上传到云存储，路径:', cloudPath)
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: result.buffer
    })

    console.log('[event] 上传成功，fileID:', uploadRes.fileID)

    // 回写到报名记录
    await db.collection('registrations').doc(reg._id).update({
      data: { qrcode_url: uploadRes.fileID }
    })
    console.log('[event] 已更新报名记录')

    // 获取临时 URL
    const urlRes = await cloud.getTempFileURL({ fileList: [uploadRes.fileID] })
    console.log('[event] 最终临时URL:', urlRes.fileList[0].tempFileURL)
    return {
      success: true,
      data: { qrcode_url: urlRes.fileList[0].tempFileURL }
    }
  } catch (err) {
    console.error('[event] 生成小程序码失败:', err)
    console.error('[event] 错误详情:', err.message)
    console.error('[event] 错误堆栈:', err.stack)
    return { success: false, data: { fallback: true }, message: '生成小程序码失败，请使用核销码' }
  }
}

// 检查报名状态
async function handleCheckEnrollment(openid, event) {
  try {
    const { eventId } = event
    if (!eventId) return { success: false, message: '缺少活动ID' }

    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) return { success: true, data: { enrolled: false } }

    const regRes = await db.collection('registrations')
      .where({ user_id: userRes.data[0]._id, event_id: eventId, status: _.neq('cancelled') })
      .get()

    return { success: true, data: { enrolled: regRes.data.length > 0 } }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 评论列表
async function handleListComments(openid, event) {
  try {
    const { eventId, page = 1, pageSize = 20 } = event
    if (!eventId) return { success: false, message: '缺少活动ID' }

    // 校验已报名
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) return { success: false, message: '请先登录' }
    const userId = userRes.data[0]._id

    const regRes = await db.collection('registrations')
      .where({ user_id: userId, event_id: eventId, status: _.neq('cancelled') })
      .get()
    if (regRes.data.length === 0) {
      return { success: false, message: '仅已报名用户可查看评论' }
    }

    const where = { event_id: eventId, status: 'visible' }
    const countRes = await db.collection('comments').where(where).count()
    const listRes = await db.collection('comments')
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

// 发表评论
async function handleAddComment(openid, event) {
  try {
    const { eventId, content } = event
    if (!eventId) return { success: false, message: '缺少活动ID' }
    if (!content || !content.trim()) return { success: false, message: '评论内容不能为空' }

    const trimmedContent = content.trim()
    if (trimmedContent.length > 500) return { success: false, message: '评论内容不能超过500字' }

    // 校验用户身份
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) return { success: false, message: '请先登录' }
    const user = userRes.data[0]

    // 校验已报名
    const regRes = await db.collection('registrations')
      .where({ user_id: user._id, event_id: eventId, status: _.neq('cancelled') })
      .get()
    if (regRes.data.length === 0) {
      return { success: false, message: '仅已报名用户可发表评论' }
    }

    // 微信内容安全检测
    try {
      await cloud.openapi.security.msgSecCheck({ content: trimmedContent })
    } catch (secErr) {
      if (secErr.errCode === 87014) {
        return { success: false, message: '评论内容包含违规信息，请修改后重试' }
      }
      console.warn('msgSecCheck API error:', secErr)
    }

    // 写入评论
    const commentData = {
      event_id: eventId,
      user_id: user._id,
      open_id: openid,
      nickname: user.nickname || '书友',
      avatar_url: user.avatar_url || '',
      content: trimmedContent,
      status: 'visible',
      created_at: db.serverDate()
    }

    const addRes = await db.collection('comments').add({ data: commentData })

    return {
      success: true,
      data: { _id: addRes._id, ...commentData, created_at: new Date() }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function handleCheckRegStatus(OPENID, event) {
  try {
    const { registrationId } = event
    if (!registrationId) return { success: false, message: '缺少参数' }

    const res = await db.collection('registrations').doc(registrationId).get()
    const reg = res.data

    if (reg.open_id !== OPENID) {
      return { success: false, message: '无权查看' }
    }

    return {
      success: true,
      data: { status: reg.status, event_id: reg.event_id || '' }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}
