/**
 * 登录鉴权模块
 */
const cloud = require('./cloud')

/**
 * 静默登录 - 获取 openid 并加载用户信息
 */
const login = async () => {
  try {
    const res = await cloud.callFunction('user', { action: 'login' })
    const app = getApp()
    app.globalData.userInfo = res.data
    app.globalData.openid = res.data.open_id
    wx.setStorageSync('userInfo', res.data)
    wx.setStorageSync('openid', res.data.open_id)
    return res.data
  } catch (err) {
    console.error('登录失败:', err)
    throw err
  }
}

/**
 * 确保已登录
 */
const ensureLogin = async () => {
  const app = getApp()
  if (app.globalData.userInfo && app.globalData.openid) {
    return app.globalData.userInfo
  }

  const cached = wx.getStorageSync('userInfo')
  if (cached) {
    app.globalData.userInfo = cached
    try {
      const res = await cloud.callFunction('user', { action: 'getProfile' })
      app.globalData.userInfo = res.data
      app.globalData.openid = res.data.open_id
      wx.setStorageSync('userInfo', res.data)
      wx.setStorageSync('openid', res.data.open_id)
      return res.data
    } catch (e) {
      app.globalData.userInfo = null
    }
  }

  return login()
}

/**
 * 确保用户已完善资料（姓名 + 手机号）
 * 返回 true 表示已完善，false 表示未完善并已跳转注册页
 */
const ensureProfile = async () => {
  const userInfo = await ensureLogin()
  if (userInfo.phone && userInfo.nickname && userInfo.nickname !== '书友') {
    return true
  }
  wx.showModal({
    title: '完善个人信息',
    content: '使用此功能前，请先填写您的真实姓名和手机号',
    confirmText: '去填写',
    success: (res) => {
      if (res.confirm) {
        wx.navigateTo({ url: '/pkg-base/pages/register/register' })
      }
    }
  })
  return false
}

/**
 * 检查是否含有核销权限 (管理员或核销员)
 */
const isAdmin = () => {
  const app = getApp()
  const userInfo = app.globalData.userInfo
  return userInfo && (userInfo.role === 'admin' || userInfo.role === 'verifier')
}

/**
 * 检查是否为超级管理员 (仅 admin)
 */
const isSuperAdmin = () => {
  const app = getApp()
  const userInfo = app.globalData.userInfo
  return userInfo && userInfo.role === 'admin'
}

/**
 * 检查是否为核销员
 */
const isVerifier = () => {
  const app = getApp()
  const userInfo = app.globalData.userInfo
  return userInfo && userInfo.role === 'verifier'
}

/**
 * 获取当前 openid
 */
const getOpenId = () => {
  const app = getApp()
  return app.globalData.openid
}

module.exports = {
  login,
  ensureLogin,
  ensureProfile,
  isAdmin,
  isSuperAdmin,
  isVerifier,
  getOpenId
}
