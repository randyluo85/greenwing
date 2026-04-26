const { callFunction } = require('../../utils/cloud')
const { formatDate, isPast, formatEventRange, formatEventParts } = require('../../utils/util')
const { generateQR } = require('../../utils/qrcode')
const { getCache, setCache, removeCache } = require('../../utils/cache')

Page({

  _enrolledIds: null,   // 页面级缓存的已报名活动ID

  data: {
    currentTab: 'list',
    // 活动列表
    events: [],
    activeEvents: [],      // 未结束的活动
    endedEvents: [],       // 已结束的活动
    page: 1,
    hasMore: true,
    loading: false,
    activePage: 1,         // 未结束活动当前页
    activeHasMore: true,   // 未结束活动是否还有更多
    endedPage: 0,          // 已结束活动当前页（0表示未开始加载）
    endedHasMore: true,    // 已结束活动是否还有更多
    showLoadEndedBtn: false, // 是否显示"加载已结束活动"按钮
    // 我的活动
    pendingList: [],
    historyList: [],
    myLoading: false,
    cancelledIds: [],
    // 弹窗
    showTicketModal: false,
    ticketCode: '',
    qrcodeUrl: null,
    qrLoading: false
  },

  onLoad(options) {
    if (options && options.tab === 'mine') {
      this.setData({ currentTab: 'mine' })
      this.loadMyEvents()
    } else {
      this.loadEvents()
    }
  },

  onUnload() {
    this.stopPolling()
    if (this._navTimer) clearTimeout(this._navTimer)
    this._enrolledIds = null
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    const app = getApp()
    // 每次显示都检查是否有数据更新，或首次加载
    const shouldRefresh = !this.data._lastLoadTime ||
      (app.globalData.lastEnrollTime && app.globalData.lastEnrollTime > this.data._lastLoadTime)

    if (shouldRefresh) {
      if (this.data.currentTab === 'list') {
        this._enrolledIds = null
        this.setData({
          activeEvents: [],
          endedEvents: [],
          activePage: 1,
          activeHasMore: true,
          endedPage: 0,
          showLoadEndedBtn: false
        })
        this.loadEvents()
      } else {
        this.loadMyEvents()
      }
    }
  },

  onPullDownRefresh() {
    if (this.data.currentTab === 'list') {
      this._enrolledIds = null
      this.setData({
        activeEvents: [],
        endedEvents: [],
        activePage: 1,
        activeHasMore: true,
        endedPage: 0,
        showLoadEndedBtn: false
      })
      this.loadEvents().then(() => wx.stopPullDownRefresh())
    } else {
      this.loadMyEvents().then(() => wx.stopPullDownRefresh())
    }
  },

  onReachBottom() {
    if (this.data.currentTab !== 'list' || this.data.loading) return
    // 优先加载未结束活动
    if (this.data.activeHasMore) {
      this.loadEvents()
    } else if (this.data.endedHasMore) {
      // 未结束活动加载完毕，加载已结束活动
      this.loadEndedEvents()
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return

    this.setData({ currentTab: tab })

    // 切换 tab 时重新加载对应数据，确保数据最新
    if (tab === 'list') {
      this._enrolledIds = null
      this.setData({
        activeEvents: [],
        endedEvents: [],
        activePage: 1,
        activeHasMore: true,
        endedPage: 0,
        showLoadEndedBtn: false
      })
      this.loadEvents()
    } else {
      this.loadMyEvents()
    }
  },

  async loadEvents() {
    // 如果已结束活动还有更多，继续加载已结束活动
    if (this.data.endedPage > 0 && this.data.endedHasMore && !this.data.loading) {
      return this.loadEndedEvents()
    }
    // 否则加载未结束活动
    if (!this.data.activeHasMore || this.data.loading) return
    this.setData({ loading: true, _lastLoadTime: Date.now() })

    try {
      const { activePage } = this.data
      console.log('[loadEvents] 加载未结束活动，第', activePage, '页')
      const res = await callFunction('event', {
        action: 'list',
        page: activePage,
        pageSize: 10,
        includeEnded: false
      })
      console.log('[loadEvents] 云函数返回:', res.data.list?.length, '条,', 'hasMore:', res.data.hasMore)

      // 查询当前用户已报名的活动ID集合（页面级缓存）
      const enrolledIds = await this._getEnrolledIds()

      const newList = res.data.list
        .map(e => {
          const eventTimeMs = e.event_time ? new Date(e.event_time).getTime() : 0;
          const hasEndTime = e.event_end_time && e.event_end_time.toString().trim().length > 0;
          const endTimeMs = hasEndTime ? new Date(e.event_end_time).getTime() : eventTimeMs;
          const _isEnded = isPast(e.event_end_time || e.event_time);
          const _isClosed = isPast(e.registration_deadline);
          const _isFull = e.quota && e.enrolled_count >= e.quota;
          const _enrolled = enrolledIds.indexOf(e._id) >= 0;

          // 新优先级：报名中=1, 名额已满=2, 已结束/报名截止=3
          let _statusPriority = 1;
          let _statusText = '报名中';

          if (_isEnded || _isClosed) {
            _statusPriority = 3;
            _statusText = _isEnded ? '已结束' : '报名截止';
          } else if (_isFull) {
            _statusPriority = 2;
            _statusText = '名额已满';
          } else if (_enrolled) {
            _statusPriority = 1;
            _statusText = '已报名';
          }

          return {
            ...e,
            _formattedDate: formatDate(e.event_time, 'YYYY年MM月DD日'),
            _formattedTime: formatEventParts(e.event_time, e.event_end_time).rangeStr,
            _isPast: _isEnded,
            _isDeadlinePassed: _isClosed,
            _enrolled,
            _statusPriority,
            _statusText,
            _eventTimeMs: eventTimeMs,
            _endTimeMs: endTimeMs
          };
        })
        // 排序：优先级低的在前（报名中优先），同优先级内按时间排序
        // 已结束活动按结束时间近→远排序（降序），其他按开始时间近→远排序（升序）
        .sort((a, b) => {
          if (a._statusPriority !== b._statusPriority) {
            return a._statusPriority - b._statusPriority;
          }
          // 已结束活动（优先级3）按结束时间近→远排序（降序：最近结束的在前）
          if (a._statusPriority === 3) {
            return (b._endTimeMs || b._eventTimeMs) - (a._endTimeMs || a._eventTimeMs);
          }
          // 报名中活动按开始时间近→远排序（升序：早开始的在前）
          return a._eventTimeMs - b._eventTimeMs;
        })

      // 过滤：已结束的活动不显示在 activeEvents 中
      const activeList = newList.filter(e => !e._isPast)

      const activeHasMore = res.data.hasMore

      this.setData({
        activeEvents: activePage === 1 ? activeList : [...this.data.activeEvents, ...activeList],
        activeHasMore,
        activePage: activePage + 1,
        loading: activeHasMore // 保持 loading 状态，如果还有未结束活动
      })

      console.log('[loadEvents] 未结束活动数量:', this.data.activeEvents.length, 'hasMore:', activeHasMore)

      // 未结束活动加载完毕后，自动加载已结束活动
      if (!activeHasMore) {
        await this.loadEndedEvents()
      } else {
        this.setData({ loading: false })
      }
    } catch (e) {
      console.error('[loadEvents] 加载失败:', e.message)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadEndedEvents() {
    if (!this.data.endedHasMore || this.data.loading) return
    this.setData({ loading: true })

    try {
      const { endedPage } = this.data
      const page = endedPage + 1
      console.log('[loadEndedEvents] 加载已结束活动，第', page, '页')
      const res = await callFunction('event', {
        action: 'list',
        page,
        pageSize: 10,
        includeEnded: true
      })
      console.log('[loadEndedEvents] 云函数返回:', res.data.list?.length, '条,', 'hasMore:', res.data.hasMore)

      const enrolledIds = await this._getEnrolledIds()

      const newList = res.data.list
        .map(e => {
          const eventTimeMs = e.event_time ? new Date(e.event_time).getTime() : 0;
          const hasEndTime = e.event_end_time && e.event_end_time.toString().trim().length > 0;
          const endTimeMs = hasEndTime ? new Date(e.event_end_time).getTime() : eventTimeMs;
          const _isEnded = isPast(e.event_end_time || e.event_time);
          const _isClosed = isPast(e.registration_deadline);
          const _isFull = e.quota && e.enrolled_count >= e.quota;
          const _enrolled = enrolledIds.indexOf(e._id) >= 0;

          // 新优先级：报名中=1, 名额已满=2, 已结束/报名截止=3
          let _statusPriority = 1;
          let _statusText = '报名中';

          if (_isEnded || _isClosed) {
            _statusPriority = 3;
            _statusText = _isEnded ? '已结束' : '报名截止';
          } else if (_isFull) {
            _statusPriority = 2;
            _statusText = '名额已满';
          } else if (_enrolled) {
            _statusPriority = 1;
            _statusText = '已报名';
          }

          return {
            ...e,
            _formattedDate: formatDate(e.event_time, 'YYYY年MM月DD日'),
            _formattedTime: formatEventParts(e.event_time, e.event_end_time).rangeStr,
            _isPast: _isEnded,
            _isDeadlinePassed: _isClosed,
            _enrolled,
            _statusPriority,
            _statusText,
            _eventTimeMs: eventTimeMs,
            _endTimeMs: endTimeMs
          };
        })
        // 排序：优先级低的在前（报名中优先），同优先级内按时间排序
        // 已结束活动按结束时间近→远排序（降序），其他按开始时间近→远排序（升序）
        .sort((a, b) => {
          if (a._statusPriority !== b._statusPriority) {
            return a._statusPriority - b._statusPriority;
          }
          // 已结束活动（优先级3）按结束时间近→远排序（降序：最近结束的在前）
          if (a._statusPriority === 3) {
            return (b._endTimeMs || b._eventTimeMs) - (a._endTimeMs || a._eventTimeMs);
          }
          // 报名中活动按开始时间近→远排序（升序：早开始的在前）
          return a._eventTimeMs - b._eventTimeMs;
        })

      // 过滤：只显示真正已结束的活动
      const endedList = newList.filter(e => e._isPast)

      this.setData({
        endedEvents: [...this.data.endedEvents, ...endedList],
        endedPage: page,
        endedHasMore: res.data.hasMore,
        loading: false
      })

      console.log('[loadEndedEvents] 已结束活动数量:', this.data.endedEvents.length, 'hasMore:', res.data.hasMore)
    } catch (e) {
      console.error('[loadEndedEvents] 加载失败:', e.message)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async _getEnrolledIds() {
    if (this._enrolledIds) return this._enrolledIds
    
    const cachedIds = getCache('enrolled_event_ids')
    if (cachedIds) {
      this._enrolledIds = cachedIds
      return this._enrolledIds
    }
    
    try {
      const myRes = await callFunction('event', { action: 'myEvents', page: 1, pageSize: 100 })
      this._enrolledIds = (myRes.data.list || [])
        .filter(i => i.status !== 'cancelled')
        .map(i => i.event_id)
      
      setCache('enrolled_event_ids', this._enrolledIds, 300)
    } catch (e) {
      console.warn('[_getEnrolledIds] 获取已报名活动失败:', e.message)
      this._enrolledIds = []
    }
    return this._enrolledIds
  },

  async loadMyEvents() {
    if (this.data.myLoading) return
    this.setData({ myLoading: true, _lastLoadTime: Date.now() })

    try {
      const res = await callFunction('event', { action: 'myEvents', page: 1, pageSize: 100 })
      const nowMs = Date.now()

      const allItems = (res.data.list || []).map(item => {
        const eventTimeMs = item.event && item.event.event_time ? new Date(item.event.event_time).getTime() : 0
        return {
          ...item,
          event: item.event ? {
            ...item.event,
            _formattedDate: formatDate(item.event.event_time, 'YYYY年MM月DD日'),
            _formattedTime: formatEventParts(item.event.event_time, item.event.event_end_time).rangeStr,
            _enrollDate: formatDate(item.created_at, 'YYYY.MM.DD'),
            _isExpired: item.event ? isPast(item.event.event_end_time || item.event.event_time) : true
          } : {}
        }
      })

      // 待参加：状态为pending且活动未过期
      const pendingList = allItems.filter(i => {
        if (i.status !== 'pending') return false
        if (i.event && i.event._isExpired) return false
        return true
      }).map(i => ({ ...i, _statusLabel: '待参加' }))

      // 历史足迹：已核销/已取消，或活动已过期
      const historyList = allItems.filter(i => {
        if (i.status === 'verified' || i.status === 'cancelled') return true
        if (i.status === 'pending' && i.event && i.event._isExpired) return true
        return false
      }).map(i => {
        let label = '已结束'
        if (i.status === 'verified') label = '已核销'
        if (i.status === 'cancelled') label = '已取消'
        if (i.status === 'pending' && i.event && i.event._isExpired) label = '活动已结束'
        return { ...i, _statusLabel: label }
      })

      this.setData({ pendingList, historyList, myLoading: false })
    } catch (e) {
      this.setData({ myLoading: false })
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
            this._enrolledIds = null
            removeCache('enrolled_event_ids')
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
    try {
      const query = wx.createSelectorQuery()
      query.select('#qr-canvas').node()
      const res = await new Promise(resolve => query.exec(resolve))

      const canvasNode = res[0].node
      if (!canvasNode) {
        this.setData({ qrLoading: false })
        return
      }

      const dpr = wx.getSystemInfoSync().pixelRatio
      const size = 200 * dpr

      canvasNode.width = size
      canvasNode.height = size

      const tempPath = await generateQR(verifyCode, canvasNode, size)
      this.setData({ qrcodeUrl: tempPath, qrLoading: false })
    } catch (e) {
      console.error('[二维码生成] 失败:', e)
      this.setData({ qrLoading: false })
      wx.showToast({ title: '二维码生成失败', icon: 'none' })
    }
  },

  closeTicket() {
    this.stopPolling()
    this.setData({ showTicketModal: false, qrcodeUrl: null })
  },

  startPolling(regId, eventId) {
    this.stopPolling()
    if (!regId) return
    this._pollingRegId = regId
    this._pollingEventId = eventId
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
