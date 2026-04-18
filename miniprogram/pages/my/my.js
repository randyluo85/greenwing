const auth = require('../../utils/auth')
const { getLevelName, getLevelProgress } = require('../../utils/util')
const { callFunction } = require('../../utils/cloud')

Page({
  data: {
    userInfo: null,
    levelName: '',
    nextLevelName: '',
    levelProgress: {},
    isAdminUser: false,
    signDays: 0,
    eventCount: 0
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    this.loadUserInfo()
  },

  async loadUserInfo() {
    try {
      const userInfo = await auth.ensureLogin()
      const app = getApp()
      const settings = app.globalData.settings || {}
      const thresholds = settings.level_thresholds || { bronze: 0, silver: 500, gold: 1000 }

      const progress = getLevelProgress(userInfo.total_points || 0, thresholds)
      const nextNameMap = { silver: '白银会员', gold: '黄金会员' }

      this.setData({
        userInfo,
        levelName: getLevelName(userInfo.level),
        nextLevelName: nextNameMap[progress.next] || '',
        levelProgress: progress,
        isSuperAdmin: auth.isSuperAdmin(),
        isVerifierLevel: auth.isAdmin(), // includes both admin and verifier
        signDays: userInfo.continuous_sign_days || 0
      })

      wx.setStorageSync('userInfo', userInfo)

      // 获取参加活动数
      this.loadEventCount()
    } catch (e) {
      console.warn('获取用户信息失败')
    }
  },

  async loadEventCount() {
    try {
      const res = await callFunction('event', { action: 'myEvents', page: 1, pageSize: 1 })
      const total = res.data.total || 0
      this.setData({ eventCount: total })
    } catch (e) {
      // ignore
    }
  },

  goMyEvents() {
    wx.navigateTo({ url: '/pkg-my/pages/my-events/my-events' })
  },

  goMyOrders() {
    wx.navigateTo({ url: '/pkg-my/pages/my-orders/my-orders' })
  },

  goPoints() {
    wx.navigateTo({ url: '/pkg-my/pages/points/points' })
  },

  goVerify() {
    wx.navigateTo({ url: '/pkg-my/pages/verify/verify' })
  },

  goRefundManage() {
    wx.navigateTo({ url: '/pkg-my/pages/refund-manage/refund-manage' })
  },

  goProfileEdit() {
    wx.navigateTo({ url: '/pkg-my/pages/profile-edit/profile-edit' })
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          const app = getApp()
          app.globalData.userInfo = null
          app.globalData.openid = null
          this.setData({ userInfo: null })
          wx.reLaunch({ url: '/pkg-base/pages/login/login' })
        }
      }
    })
  }
})
