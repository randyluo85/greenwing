const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 内联工具函数
// 统一使用北京时间处理日期字符串
function getBeijingDateParts(date = new Date()) {
  const d = new Date(date.getTime() + 8 * 3600000)
  return {
    y: d.getUTCFullYear(),
    m: String(d.getUTCMonth() + 1).padStart(2, '0'),
    d: String(d.getUTCDate()).padStart(2, '0')
  }
}

// 内联工具函数
function generateMemberNo() {
  const { y, m, d } = getBeijingDateParts()
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, '0')
  return `QY${y}${m}${d}${rand}`
}

// 带唯一性校验的会员号生成
async function generateUniqueMemberNo() {
  for (let i = 0; i < 3; i++) {
    const no = generateMemberNo()
    const exist = await db.collection('users').where({ member_no: no }).count()
    if (exist.total === 0) return no
  }
  return generateMemberNo() + Date.now().toString(36).slice(-3)
}
function calcLevel(totalPoints, thresholds) {
  const t = thresholds || { bronze: 0, silver: 500, gold: 1000 }
  if (totalPoints >= t.gold) return 'gold'
  if (totalPoints >= t.silver) return 'silver'
  return 'bronze'
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  switch (action) {
    case 'login':
      return handleLogin(OPENID)
    case 'signIn':
      return handleSignIn(OPENID)
    case 'getProfile':
      return handleGetProfile(OPENID)
    case 'updateProfile':
      return handleUpdateProfile(OPENID, event)
    case 'getPointLogs':
      return handleGetPointLogs(OPENID, event)
    case 'bindPhone':
      return handleBindPhone(OPENID, event)
    default:
      return { success: false, message: '未知操作' }
  }
}

// 登录/注册
async function handleLogin(openid) {
  try {
    const userRes = await db.collection('users').where({ open_id: openid }).get()

    if (userRes.data.length > 0) {
      // 已注册，更新最后登录时间
      const user = userRes.data[0]
      await db.collection('users').doc(user._id).update({
        data: { updated_at: db.serverDate() }
      })
      return { success: true, data: user }
    }

    // 新用户注册
    const newUser = {
      open_id: openid,
      phone: '',
      nickname: '书友',
      avatar_url: '',
      member_no: await generateUniqueMemberNo(),
      role: 'user',
      level: 'bronze',
      total_points: 0,
      current_points: 0,
      last_sign_date: '',
      continuous_sign_days: 0,
      created_at: db.serverDate(),
      updated_at: db.serverDate()
    }

    const addRes = await db.collection('users').add({ data: newUser })
    newUser._id = addRes._id

    return { success: true, data: newUser }
  } catch (err) {
    return { success: false, message: '登录失败: ' + err.message }
  }
}

// 每日签到
async function handleSignIn(openid) {
  try {
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    const todayParts = getBeijingDateParts()
    const todayStr = `${todayParts.y}-${todayParts.m}-${todayParts.d}`

    if (user.last_sign_date === todayStr) {
      return { success: false, message: '今日已签到' }
    }

    // 获取积分配置
    let config = { daily_sign_base: 10, daily_sign_bonus: 5, level_thresholds: { bronze: 0, silver: 500, gold: 1000 } }
    try {
      const configRes = await db.collection('settings').doc('points_config').get()
      if (configRes.data) config = configRes.data
    } catch (e) { /* 使用默认值 */ }

    // 计算连续签到
    const yesterdayDate = new Date(Date.now() - 24 * 3600000)
    const yesterdayParts = getBeijingDateParts(yesterdayDate)
    const yesterdayStr = `${yesterdayParts.y}-${yesterdayParts.m}-${yesterdayParts.d}`

    let continuousDays = 1
    if (user.last_sign_date === yesterdayStr) {
      continuousDays = (user.continuous_sign_days || 0) + 1
    }

    // 计算积分
    const basePoints = config.daily_sign_base || 10
    const bonusPoints = continuousDays > 1 ? (config.daily_sign_bonus || 5) * (continuousDays - 1) : 0
    // 限制额外奖励上限
    const cappedBonus = Math.min(bonusPoints, basePoints * 3)
    const totalEarned = basePoints + cappedBonus

    // 更新用户
    const newTotal = (user.total_points || 0) + totalEarned
    const newCurrent = (user.current_points || 0) + totalEarned
    const newLevel = calcLevel(newTotal, config.level_thresholds)

    await db.collection('users').doc(user._id).update({
      data: {
        total_points: newTotal,
        current_points: newCurrent,
        last_sign_date: todayStr,
        continuous_sign_days: continuousDays,
        level: newLevel,
        updated_at: db.serverDate()
      }
    })

    // 记录积分流水
    await db.collection('point_logs').add({
      data: {
        user_id: user._id,
        open_id: openid,
        amount: totalEarned,
        type: 'daily_sign',
        related_id: '',
        description: `每日签到 +${totalEarned}积分${cappedBonus > 0 ? '（含连续签到奖励）' : ''}`,
        created_at: db.serverDate()
      }
    })

    // 下发积分到账通知
    await db.collection('notifications').add({
      data: {
        open_id: openid,
        title: '积分奖励发放',
        body: `您今日已成功签到，系统发放了 ${totalEarned} 积分奖励。连续签到可得更多奖励哦！`,
        icon_bg_color: '#fb923c',
        icon_text: '奖',
        is_read: false,
        type: 'points_reward',
        created_at: db.serverDate()
      }
    })

    return {
      success: true,
      data: {
        earned: totalEarned,
        base: basePoints,
        bonus: cappedBonus,
        continuousDays,
        totalPoints: newTotal,
        currentPoints: newCurrent,
        level: newLevel
      }
    }
  } catch (err) {
    return { success: false, message: '签到失败: ' + err.message }
  }
}

// 获取个人信息
async function handleGetProfile(openid) {
  try {
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    return { success: true, data: userRes.data[0] }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 更新个人信息
async function handleUpdateProfile(openid, event) {
  try {
    const { nickname, avatar_url, phone, real_name, bio, gender, birthday } = event
    const updateData = { updated_at: db.serverDate() }
    if (nickname) updateData.nickname = nickname
    if (avatar_url) updateData.avatar_url = avatar_url
    if (phone) updateData.phone = phone
    if (real_name !== undefined) updateData.real_name = real_name
    if (bio !== undefined) updateData.bio = bio
    if (gender !== undefined) updateData.gender = gender
    if (birthday !== undefined) updateData.birthday = birthday

    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }

    await db.collection('users').doc(userRes.data[0]._id).update({ data: updateData })
    return { success: true, message: '更新成功' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 获取积分明细
async function handleGetPointLogs(openid, event) {
  try {
    const { page = 1, pageSize = 20 } = event
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id

    const countRes = await db.collection('point_logs').where({ user_id: userId }).count()
    const listRes = await db.collection('point_logs')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
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

// 绑定手机号
async function handleBindPhone(openid, event) {
  try {
    const { cloudID } = event
    if (!cloudID) {
      return { success: false, message: '缺少 cloudID' }
    }

    // 解密手机号
    const result = await cloud.getOpenData({
      list: [cloudID]
    })

    if (!result || !result.dataList || result.dataList.length === 0) {
      return { success: false, message: '解密失败' }
    }

    const phoneData = result.dataList[0]
    const phone = phoneData?.data?.phoneNumber

    if (!phone) {
      return { success: false, message: '获取手机号失败' }
    }

    // 更新用户手机号
    const userRes = await db.collection('users').where({ open_id: openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }

    await db.collection('users').doc(userRes.data[0]._id).update({
      data: { phone, updated_at: db.serverDate() }
    })

    return { success: true, data: { phone } }
  } catch (err) {
    return { success: false, message: '绑定失败: ' + err.message }
  }
}
