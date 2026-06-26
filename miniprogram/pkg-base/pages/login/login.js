const auth = require('../../../utils/auth')

Page({
  data: {
    loading: false,
    agreed: false
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  goUserAgreement() {
    wx.navigateTo({ url: '/pkg-base/pages/webview/webview?url=agreement' })
  },

  goPrivacyPolicy() {
    wx.navigateTo({ url: '/pkg-base/pages/webview/webview?url=privacy' })
  },

  async onWxLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' })
      return
    }
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
