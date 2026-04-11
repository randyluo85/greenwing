const { callFunction } = require('../../utils/cloud')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    currentTab: 'list',
    // 活动列表
    events: [],
    page: 1,
    hasMore: true,
    loading: false,
    // 我的活动
    pendingList: [],
    historyList: [],
    myLoading: false,
    cancelledIds: [],
    // 弹窗
    showTicketModal: false,
    ticketCode: ''
  },

  onLoad(options) {
    if (options && options.tab === 'mine') {
      this.setData({ currentTab: 'mine' })
      this.loadMyEvents()
    } else {
      this.loadEvents()
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    // 每次回到页面刷新当前 tab 数据
    if (this.data.currentTab === 'list') {
      this.setData({ page: 1, hasMore: true, events: [] })
      this.loadEvents()
    } else {
      this.loadMyEvents()
    }
  },

  onPullDownRefresh() {
    if (this.data.currentTab === 'list') {
      this.setData({ page: 1, hasMore: true, events: [] })
      this.loadEvents().then(() => wx.stopPullDownRefresh())
    } else {
      this.loadMyEvents().then(() => wx.stopPullDownRefresh())
    }
  },

  onReachBottom() {
    if (this.data.currentTab === 'list' && this.data.hasMore && !this.data.loading) {
      this.loadEvents()
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return
    this.setData({ currentTab: tab })
    if (tab === 'list' && this.data.events.length === 0) {
      this.loadEvents()
    } else if (tab === 'mine' && this.data.pendingList.length === 0 && this.data.historyList.length === 0) {
      this.loadMyEvents()
    }
  },

  async loadEvents() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const { page } = this.data
      const res = await callFunction('event', { action: 'list', page, pageSize: 10 })

      // 查询当前用户已报名的活动ID集合
      let enrolledIds = []
      try {
        const myRes = await callFunction('event', { action: 'myEvents', page: 1, pageSize: 100 })
        enrolledIds = (myRes.data.list || [])
          .filter(i => i.status === 'pending')
          .map(i => i.event_id)
      } catch (e) {
        // 查询失败不影响列表展示
      }

      const newList = res.data.list.map(e => ({
        ...e,
        _formattedDate: formatDate(e.event_time, 'YYYY年MM月DD日'),
        _formattedTime: formatDate(e.event_time, 'HH:mm'),
        _isPast: new Date(e.event_time) < new Date(),
        _enrolled: enrolledIds.indexOf(e._id) >= 0
      }))

      this.setData({
        events: page === 1 ? newList : [...this.data.events, ...newList],
        hasMore: res.data.hasMore,
        page: page + 1,
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadMyEvents() {
    if (this.data.myLoading) return
    this.setData({ myLoading: true })

    try {
      const res = await callFunction('event', { action: 'myEvents', page: 1, pageSize: 100 })
      const allItems = (res.data.list || []).map(item => ({
        ...item,
        event: item.event ? {
          ...item.event,
          _formattedDate: formatDate(item.event.event_time, 'YYYY年MM月DD日'),
          _formattedTime: formatDate(item.event.event_time, 'HH:mm'),
          _enrollDate: formatDate(item.created_at, 'YYYY.MM.DD')
        } : {}
      }))

      const pendingList = allItems.filter(i => i.status === 'pending')
      const historyList = allItems.filter(i => i.status === 'verified' || i.status === 'cancelled')

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
    this.setData({ showTicketModal: true, ticketCode: code || '' })
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
