const { callFunction } = require('../../utils/cloud')
const auth = require('../../utils/auth')

Page({
  data: {
    manualCode: '',
    result: null
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

    // 外部扫码：微信摄像头扫小程序码后，scene 作为 query 参数传入
    if (options && options.scene) {
      const code = decodeURIComponent(options.scene)
      this.doVerify(code)
    }
  },

  startScan() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        // 核销码可能是扫码结果本身或 URL 参数
        let code = res.result
        // 小程序内扫小程序码：path 字段包含 scene 参数
        if (res.path && res.path.includes('scene=')) {
          const match = res.path.match(/scene=([^&]+)/)
          if (match) code = decodeURIComponent(match[1])
        }
        // 兼容 URL 参数格式
        else if (code.includes('verify_code=')) {
          const match = code.match(/verify_code=([^&]+)/)
          if (match) code = match[1]
        }
        this.doVerify(code)
      },
      fail: () => {
        // 用户取消扫码，不做处理
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
        result: { success: true, message: `用户 ${res.data.user_nickname || ''} 核销成功` }
      })
    } catch (e) {
      wx.hideLoading()
      this.setData({
        result: { success: false, message: e.message || '核销失败' }
      })
    }
  },

  resetVerify() {
    this.setData({ result: null, manualCode: '' })
  }
})
