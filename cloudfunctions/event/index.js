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
    const existReg = await transaction.collection('registrations')
      .where({ user_id: user._id, event_id: eventId, status: _.neq('cancelled') })
      .get()
    if (existReg.data.length > 0) {
      await transaction.rollback()
      return { success: false, message: '已报名该活动' }
    }

    // 创建报名记录
    const verifyCode = await generateUniqueVerifyCode(db.collection('registrations'))
    await transaction.collection('registrations').add({
      data: {
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
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })

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
    const verifyCode = await generateUniqueVerifyCode(db.collection('registrations'))
    await transaction.collection('registrations').add({
      data: {
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
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })

    await transaction.collection('events').doc(eventId).update({
      data: { enrolled_count: _.inc(1) }
    })

    // 更新用户表资料（回填真实姓名和手机号）
    const userUpdateData = {}
    let needUpdateUser = false
    if (realName && user.real_name !== realName) {
      userUpdateData.real_name = realName
      needUpdateUser = true
    }
    if (contactPhone && user.phone !== contactPhone) {
      userUpdateData.phone = contactPhone
      needUpdateUser = true
    }
    if (needUpdateUser) {
      userUpdateData.updated_at = db.serverDate()
      // 注意：我们在前面246行可能已经扣除了积分，如果前面的transaction.collection('users').doc(user._id).update也修改了用户，
      // 这里会再次触发更新。为了合并，我们可以分别执行这两个逻辑或者分开。为了安全起见分开执行不影响逻辑。
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

    // 查询报名者昵称（核销员是 user，报名者是 reg.user_id）
    let regNickname = '未知用户'
    try {
      const regUserRes = await db.collection('users').doc(reg.user_id).get()
      regNickname = regUserRes.data.nickname || regNickname
    } catch (e) {
      console.warn('查询报名者昵称失败:', e.message)
    }

    return { success: true, data: { registration_id: reg._id, user_nickname: regNickname } }
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
      page: 'pages/verify/verify',
      width: 280,
      checkPath: false,
      isHyaline: false
    })

    console.log('[event] 小程序码生成成功，buffer长度:', result.buffer?.length)

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
