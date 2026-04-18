const auth = require('../../../utils/auth')

Page({
  data: {
    loading: false
  },

  async onWxLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const userInfo = await auth.login()
      wx.switchTab({ url: '/pages/index/index' })
    } catch (e) {
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
