const DEFAULT_SETTINGS = {
  daily_sign_base: 10,
  daily_sign_bonus: 5,
  level_thresholds: { bronze: 0, silver: 500, gold: 1000 },
  order_expire_minutes: 15
}

App({
  globalData: {
    userInfo: null,
    openid: null,
    settings: DEFAULT_SETTINGS
  },

  onLaunch() {
    // 全局错误捕获：过滤开发者工具的无害 timeout 错误
    wx.onError((error) => {
      if (error.message === 'timeout' && error.stack && error.stack.includes('WAServiceMainContext')) {
        // 忽略来自 WAServiceMainContext 的 timeout 错误（开发者工具 bug）
        return
      }
      console.error('应用错误:', error)
    })

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloud1-8gax523s60b70149',
      traceUser: true,
      timeout: 30000
    })

    this.checkLogin()
    this.loadSettings()
  },

  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
    const openid = wx.getStorageSync('openid')
    if (openid) {
      this.globalData.openid = openid
    }
  },

  loadSettings() {
    const db = wx.cloud.database()
    db.collection('settings').doc('points_config').get({ timeout: 10000 }).then(res => {
      if (res.data) this.globalData.settings = res.data
    }).catch(err => {
      // 只在非"集合不存在"错误时打印，避免干扰
      if (err.errCode !== -1) {
        console.warn('[loadSettings] 加载失败，使用默认值:', err.errMsg || err)
      }
    })
  }
})
