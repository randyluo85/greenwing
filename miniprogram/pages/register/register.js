const { callFunction } = require('../../utils/cloud')
const auth = require('../../utils/auth')

Page({
  data: {
    step: 1,
    loading: false,
    submitting: false,
    nickname: '',
    phone: ''
  },

  async onWxAuth() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const userInfo = await auth.login()
      wx.setStorageSync('userInfo', userInfo)
      const app = getApp()
      app.globalData.userInfo = userInfo
      app.globalData.openid = userInfo.open_id

      if (userInfo.nickname && userInfo.nickname !== '书友' && userInfo.phone) {
        wx.switchTab({ url: '/pages/index/index' })
      } else {
        this.setData({ step: 2 })
      }
    } catch (e) {
      wx.showToast({ title: '授权失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  async onSubmit() {
    const { nickname, phone } = this.data
    if (!nickname.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!phone || phone.length < 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      await callFunction('user', {
        action: 'updateProfile',
        nickname: nickname.trim(),
        phone
      })

      const userInfo = getApp().globalData.userInfo || {}
      userInfo.nickname = nickname.trim()
      userInfo.phone = phone
      wx.setStorageSync('userInfo', userInfo)
      getApp().globalData.userInfo = userInfo

      wx.switchTab({ url: '/pages/index/index' })
    } catch (e) {
      wx.showToast({ title: e.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
