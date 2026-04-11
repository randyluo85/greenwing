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
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloud1-8gax523s60b70149',
      traceUser: true
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
    db.collection('settings').doc('points_config').get().then(res => {
      if (res.data) this.globalData.settings = res.data
    }).catch(() => {
      // 集合不存在时使用默认值，静默处理
    })
  }
})
