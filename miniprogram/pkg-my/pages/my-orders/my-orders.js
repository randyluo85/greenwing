const { callFunction } = require('../../../utils/cloud')
const { formatDate, formatMoney } = require('../../../utils/util')

Page({
  data: {
    list: [],
    currentStatus: '',
    page: 1,
    hasMore: true,
    loading: false,
    statusMap: {
      pending: '待支付',
      paid: '已支付',
      failed: '失败',
      refunding: '退款中',
      refunded: '已退款',
      closed: '已关闭'
    }
  },

  onLoad() { this.loadList() },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList()
  },

  switchTab(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ currentStatus: status, page: 1, list: [], hasMore: true })
    this.loadList()
  },

  async loadList() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const { page, currentStatus } = this.data
      const params = { action: 'myOrders', page, pageSize: 10 }
      if (currentStatus) params.status = currentStatus

      const res = await callFunction('pay', params)
      const newList = res.data.list.map(item => ({
        ...item,
        _amountText: formatMoney(item.amount) + ' 元',
        _formattedTime: formatDate(item.created_at, 'YYYY-MM-DD HH:mm')
      }))

      this.setData({
        list: page === 1 ? newList : [...this.data.list, ...newList],
        hasMore: res.data.hasMore,
        page: page + 1,
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  goPay(e) {
    const eventId = e.currentTarget.dataset.event
    wx.navigateTo({ url: `/pkg-event/pages/order-confirm/order-confirm?eventId=${eventId}` })
  },

  cancelOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认取消',
      content: '确定取消该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await callFunction('pay', { action: 'cancelOrder', orderId: id })
            wx.showToast({ title: '已取消', icon: 'success' })
            this.setData({ page: 1, list: [], hasMore: true })
            this.loadList()
          } catch (err) {
            wx.showToast({ title: err.message, icon: 'none' })
          }
        }
      }
    })
  },

  requestRefund(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '申请退款',
      content: '确定申请退款吗？退款需管理员审核',
      success: async (res) => {
        if (res.confirm) {
          try {
            await callFunction('pay', { action: 'requestRefund', orderId: id, reason: '用户申请退款' })
            wx.showToast({ title: '已提交退款申请', icon: 'success' })
            this.setData({ page: 1, list: [], hasMore: true })
            this.loadList()
          } catch (err) {
            wx.showToast({ title: err.message, icon: 'none' })
          }
        }
      }
    })
  }
})
