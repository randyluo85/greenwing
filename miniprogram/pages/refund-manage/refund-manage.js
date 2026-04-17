const { callFunction } = require('../../utils/cloud')

Page({
  data: {
    list: [],
    loading: false
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadData() {
    if (this.data.loading) return
    this.setData({ loading: true })
    
    wx.showNavigationBarLoading()
    
    try {
      const res = await callFunction('pay', { action: 'mpAdminRefundList' })
      if (res.success) {
        // 格式化时间金额等
        const list = res.data.list.map(item => {
          const d = new Date(item.created_at)
          item.created_at_str = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`

          if (item.amount) {
             item.amount = (item.amount / 100).toFixed(2)
          }
          return item
        })

        this.setData({ list })
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
      wx.hideNavigationBarLoading()
    }
  },

  async onApprove(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '同意退款',
      content: '确认同意此笔退款吗？资金将原路返回给用户。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true })
          try {
            const result = await callFunction('pay', { action: 'mpAdminApproveRefund', orderId: id })
            wx.hideLoading()
            if (result.success) {
              wx.showToast({ title: '退款成功', icon: 'success' })
              this.loadData()
            } else {
              wx.showModal({ title: '退款失败', content: result.message || '未知错误', showCancel: false })
            }
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '请求异常', icon: 'none' })
          }
        }
      }
    })
  },

  async onReject(e) {
    const id = e.currentTarget.dataset.id
    
    // wx.showModal 没有输入框，我们可以用最简单的形式确认驳回，或者先不支持输入原因
    wx.showModal({
      title: '驳回退款',
      content: '确认驳回该退款申请吗？订单将恢复为已支付状态。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '提交中...', mask: true })
          try {
            const result = await callFunction('pay', { action: 'mpAdminRejectRefund', orderId: id, reason: '管理员在小程序驳回' })
            wx.hideLoading()
            if (result.success) {
              wx.showToast({ title: '已驳回', icon: 'success' })
              this.loadData()
            } else {
              wx.showModal({ title: '驳回失败', content: result.message || '未知错误', showCancel: false })
            }
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '请求异常', icon: 'none' })
          }
        }
      }
    })
  }
})
