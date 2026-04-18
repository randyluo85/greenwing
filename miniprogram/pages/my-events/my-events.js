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

      const now = new Date()

      const allItems = (res.data.list || []).map(item => {
        const eventDate = item.event && item.event.event_time ? new Date(item.event.event_time) : null
        const isToday = eventDate && eventDate.toDateString() === now.toDateString()
        const isExpired = eventDate && eventDate < now
        return {
          ...item,
          _isToday: isToday,
          event: item.event ? {
            ...item.event,
            _formattedDate: formatDate(item.event.event_time, 'YYYY年MM月DD日'),
            _formattedTime: formatDate(item.event.event_time, 'HH:mm'),
            _enrollDate: formatDate(item.created_at, 'YYYY.MM.DD'),
            _isExpired: isExpired
          } : {}
        }
      })

      // 待参加：状态为pending/verified (如果不包括verified，那么待参加就是pending) 且活动未过期
      const pendingList = allItems.filter(i => {
        if (i.status === 'cancelled') return false
        if (i.status === 'verified') return false
        if (i.event && i.event._isExpired) return false
        return true
      })

      // 历史足迹：已核销，或活动已过期（已取消的不显示）
      const historyList = allItems.filter(i => {
        if (i.status === 'verified') return true  // 只显示已核销的
        if (i.status === 'pending' && i.event && i.event._isExpired) return true  // 过期未参加的
        return false  // 不显示已取消的
      })

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
            getApp().globalData.lastEnrollTime = Date.now()
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
      // 调试日志：显示传入的核销码
      console.log('[二维码生成] 传入的核销码:', verifyCode)
      console.log('[二维码生成] 核销码类型:', typeof verifyCode)

      const res = await callFunction('event', {
        action: 'getQRCode',
        verifyCode
      })

      // 调试日志：显示云函数返回的完整结果
      console.log('[二维码生成] 云函数返回结果:', JSON.stringify(res))
      console.log('[二维码生成] res.data:', res.data)
      console.log('[二维码生成] res.data.qrcode_url:', res.data?.qrcode_url)

      if (res.data && res.data.qrcode_url) {
        this.setData({ qrcodeUrl: res.data.qrcode_url, qrLoading: false })
      } else {
        // 调试日志：没有返回二维码URL
        console.log('[二维码生成] 未返回二维码URL，使用降级方案')
        this.setData({ qrLoading: false })
      }
    } catch (e) {
      // 调试日志：捕获到异常
      console.error('[二维码生成] 调用云函数异常:', e)
      console.error('[二维码生成] 错误消息:', e.message)
      this.setData({ qrLoading: false })
      wx.showToast({ title: e.message || '生成二维码失败', icon: 'none', duration: 3000 })
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
