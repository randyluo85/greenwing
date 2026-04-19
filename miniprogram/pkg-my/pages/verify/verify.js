const { callFunction } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    manualCode: '',
    result: null,
    verifiedInfo: null
  },

  onLoad(options) {
    if (!auth.isAdmin()) {
      wx.showModal({
        title: '无权限',
        content: '仅管理员和核销员可以使用此功能',
        showCancel: false,
        success: () => wx.navigateBack()
      })
      return
    }

    if (options && options.scene) {
      const code = decodeURIComponent(options.scene)
      this.doVerify(code)
    }
  },

  startScan() {
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        let code = res.result || ''
        if (res.path && res.path.includes('scene=')) {
          const match = res.path.match(/scene=([^&]+)/)
          if (match) code = decodeURIComponent(match[1])
        }
        else if (code && code.includes('verify_code=')) {
          const match = code.match(/verify_code=([^&]+)/)
          if (match) code = match[1]
        }
        this.doVerify(code)
      },
      fail: (err) => {
        console.warn('扫码失败或取消:', err)
      }
    })
  },

  onCodeInput(e) {
    this.setData({ manualCode: e.detail.value.trim() })
  },

  manualVerify() {
    const code = this.data.manualCode
    if (!code) {
      wx.showToast({ title: '请输入核销码', icon: 'none' })
      return
    }
    this.doVerify(code)
  },

  async doVerify(code) {
    try {
      wx.showLoading({ title: '核销中...' })
      const res = await callFunction('event', { action: 'verify', code })
      wx.hideLoading()

      this.setData({
        result: { success: true },
        verifiedInfo: {
          real_name: res.data.real_name || '',
          contact_phone: res.data.contact_phone || '',
          nickname: res.data.user_nickname || ''
        }
      })
    } catch (e) {
      wx.hideLoading()
      this.setData({
        result: { success: false, message: e.message || '核销失败' },
        verifiedInfo: null
      })
    }
  },

  resetVerify() {
    this.setData({ result: null, verifiedInfo: null, manualCode: '' })
  }
})
