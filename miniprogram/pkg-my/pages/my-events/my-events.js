const { callFunction } = require('../../../utils/cloud')
const { formatDate, isPast, formatEventRange, formatEventParts } = require('../../../utils/util')
const { generateQR } = require('../../../utils/qrcode')
const { removeCache } = require('../../../utils/cache')

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

  onUnload() {
    this.stopPolling()
    if (this._navTimer) clearTimeout(this._navTimer)
  },

  onPullDownRefresh() {
    this.loadAllEvents().then(() => wx.stopPullDownRefresh())
  },

  async loadAllEvents() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const res = await callFunction('event', {
        action: 'myEvents',
        page: 1,
        pageSize: 100
      })

      const nowMs = Date.now()
      const todayStart = new Date(nowMs)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(nowMs)
      todayEnd.setHours(23, 59, 59, 999)

      const allItems = (res.data.list || []).map(item => {
        const eventTimeMs = item.event && item.event.event_time ? new Date(item.event.event_time).getTime() : 0
        const isToday = eventTimeMs > 0 && eventTimeMs >= todayStart.getTime() && eventTimeMs <= todayEnd.getTime()
        const isExpired = item.event ? isPast(item.event.event_end_time || item.event.event_time) : true
        return {
          ...item,
          _isToday: isToday,
          event: item.event ? {
            ...item.event,
            _formattedDate: formatDate(item.event.event_time, 'YYYY-MM-DD'),
            _formattedTime: formatEventParts(item.event.event_time, item.event.event_end_time).rangeStr,
            _enrollDate: formatDate(item.created_at, 'YYYY.MM.DD'),
            _isExpired: isExpired
          } : {}
        }
      })

      const pendingList = allItems.filter(i => {
        if (i.status === 'cancelled') return false
        if (i.status === 'verified') return false
        if (i.event && i.event._isExpired) return false
        return true
      })

      const historyList = allItems.filter(i => {
        if (i.status === 'verified') return true
        if (i.status === 'pending' && i.event && i.event._isExpired) return true
        return false
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
            
            // Invalidate the enrolled events cache since user cancelled enrollment
            removeCache('enrolled_event_ids')

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
    const regId = e.currentTarget.dataset.id
    const eventId = e.currentTarget.dataset.event
    this.setData({
      showTicketModal: true,
      ticketCode: code || '',
      qrcodeUrl: null,
      qrLoading: true
    })
    this.loadQRCode(code)
    this.startPolling(regId, eventId)
  },

  async loadQRCode(verifyCode) {
    console.log('[loadQRCode] 开始生成二维码, verifyCode:', verifyCode)
    try {
      const query = wx.createSelectorQuery()
      query.select('#qr-canvas').node()
      const res = await new Promise(resolve => query.exec(resolve))
      console.log('[loadQRCode] query result:', res)

      const canvasNode = res[0].node
      if (!canvasNode) {
        console.error('[loadQRCode] 未找到 canvas 节点')
        this.setData({ qrLoading: false })
        return
      }

      const dpr = wx.getSystemInfoSync().pixelRatio
      const size = 200 * dpr
      console.log('[loadQRCode] dpr:', dpr, 'size:', size)

      canvasNode.width = size
      canvasNode.height = size

      console.log('[loadQRCode] 开始调用 generateQR')
      const tempPath = await generateQR(verifyCode, canvasNode, size)
      console.log('[loadQRCode] 生成成功, tempPath:', tempPath)

      this.setData({ qrcodeUrl: tempPath, qrLoading: false })
    } catch (e) {
      console.error('[二维码生成] 失败:', e)
      console.error('[二维码生成] 错误堆栈:', e.stack)
      this.setData({ qrLoading: false })
    }
  },

  closeTicket() {
    this.stopPolling()
    this.setData({ showTicketModal: false })
  },

  startPolling(regId, eventId) {
    this.stopPolling()
    if (!regId) return
    this._pollingStopped = false
    const poll = async () => {
      if (this._pollingStopped || !this.data.showTicketModal) {
        this.stopPolling()
        return
      }
      try {
        const res = await callFunction('event', { action: 'checkRegStatus', registrationId: regId })
        if (res.data && res.data.status === 'verified') {
          this.stopPolling()
          this.setData({ showTicketModal: false })
          wx.showToast({ title: '核销成功', icon: 'success', duration: 2000 })
          if (eventId) {
            this._navTimer = setTimeout(() => {
              wx.navigateTo({ url: `/pkg-event/pages/event-detail/event-detail?id=${eventId}` })
            }, 2000)
          } else {
            this._navTimer = setTimeout(() => { wx.navigateBack() }, 2000)
          }
        } else if (!this._pollingStopped) {
          this._pollingTimer = setTimeout(poll, 3000)
        }
      } catch (e) {
        if (!this._pollingStopped) this._pollingTimer = setTimeout(poll, 3000)
      }
    }
    this._pollingTimer = setTimeout(poll, 3000)
  },

  stopPolling() {
    this._pollingStopped = true
    if (this._pollingTimer) {
      clearTimeout(this._pollingTimer)
      this._pollingTimer = null
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pkg-event/pages/event-detail/event-detail?id=${id}` })
  },

  noop() { }
})
