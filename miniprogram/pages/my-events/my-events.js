const { callFunction } = require('../../utils/cloud')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    pendingList: [],
    historyList: [],
    loading: false,
    showTicketModal: false,
    ticketCode: '',
    cancelledIds: [],
    qrcodeUrl: null,
    qrLoading: false
  },

  onLoad() {
    this.loadAllEvents()
  },

  onPullDownRefresh() {
    this.loadAllEvents().then(() => wx.stopPullDownRefresh())
  },

  async loadAllEvents() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      // 获取全部报名记录
      const res = await callFunction('event', {
        action: 'myEvents',
        page: 1,
        pageSize: 100
      })

      const allItems = (res.data.list || []).map(item => {
        const now = new Date()
        const eventDate = item.event && item.event.event_time ? new Date(item.event.event_time) : null
        const isToday = eventDate && eventDate.toDateString() === now.toDateString()
        return {
          ...item,
          _isToday: isToday,
          event: item.event ? {
            ...item.event,
            _formattedDate: formatDate(item.event.event_time, 'YYYY年MM月DD日'),
            _formattedTime: formatDate(item.event.event_time, 'HH:mm'),
            _enrollDate: formatDate(item.created_at, 'YYYY.MM.DD')
          } : {}
        }
      })

      const pendingList = allItems.filter(i => i.status === 'pending')
      const historyList = allItems.filter(i => i.status === 'verified' || i.status === 'cancelled')

      this.setData({
        pendingList,
        historyList,
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  cancelEnroll(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认取消',
      content: '确定要取消报名吗？积分将退回账户',
      success: async (res) => {
        if (res.confirm) {
          try {
            await callFunction('event', { action: 'cancelEnroll', registrationId: id })
            const cancelledIds = [...this.data.cancelledIds, id]
            this.setData({ cancelledIds })
            wx.showToast({ title: '报名已取消，积分将退回账户', icon: 'none' })
          } catch (err) {
            wx.showToast({ title: err.message || '取消失败', icon: 'none' })
          }
        }
      }
    })
  },

  showTicket(e) {
    const code = e.currentTarget.dataset.code
    this.setData({
      showTicketModal: true,
      ticketCode: code || '',
      qrcodeUrl: null,
      qrLoading: true
    })
    this.loadQRCode(code)
  },

  async loadQRCode(verifyCode) {
    try {
      const res = await callFunction('event', {
        action: 'getQRCode',
        verifyCode
      })
      if (res.data && res.data.qrcode_url) {
        this.setData({ qrcodeUrl: res.data.qrcode_url, qrLoading: false })
      } else {
        this.setData({ qrLoading: false })
      }
    } catch (e) {
      this.setData({ qrLoading: false })
    }
  },

  closeTicket() {
    this.setData({ showTicketModal: false })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${id}` })
  },

  noop() {}
})
