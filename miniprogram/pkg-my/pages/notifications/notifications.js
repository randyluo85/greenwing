const { timeAgo } = require('../../../utils/util')
const { callFunction } = require('../../../utils/cloud')

Page({
  data: {
    newMessages: [],
    oldMessages: [],
    loading: true,
    notifPage: 1,
    notifHasMore: false
  },

  onLoad() {
    this.loadNotifications()
  },

  onShow() {
    // 仅首次或需要刷新时加载
    if (!this.data.newMessages.length && !this.data.oldMessages.length) {
      this.loadNotifications()
    }
  },

  async loadNotifications(loadMore = false) {
    try {
      if (loadMore && !this.data.notifHasMore) return

      const openid = getApp().globalData.openid
      if (!openid) {
        this.setData({ loading: false })
        return
      }

      const page = loadMore ? this.data.notifPage + 1 : 1
      this.setData({ loading: loadMore ? true : this.data.loading })

      // P1-15: 改用云函数分页查询
      const res = await callFunction('user', {
        action: 'listNotifications',
        page,
        pageSize: 20
      })

      const messages = (res.data.list || []).map(m => {
        let _iconPath = '/images/icons/bell-white.svg'
        let _bgColor = '#14b8a6'

        if (m.type === 'points_reward') {
          _iconPath = '/images/my-points-white.png'
          _bgColor = '#eab308'
        } else if (m.type === 'event_register' || m.title?.includes('核销') || m.title?.includes('活动') || m.title?.includes('报名')) {
          _iconPath = '/images/my-verify-white.png'
          _bgColor = '#3b82f6'
        } else if (m.type?.includes('refund') || m.title?.includes('退款')) {
          _iconPath = '/images/my-receipt-white.png'
          _bgColor = '#ef4444'
        }

        return {
          ...m,
          _timeAgo: m.created_at ? timeAgo(new Date(m.created_at)) : '',
          _bgColor: _bgColor,
          _iconPath
        }
      })

      if (loadMore) {
        const newMessages = [...this.data.newMessages, ...messages.filter(m => !m.is_read)]
        const oldMessages = [...this.data.oldMessages, ...messages.filter(m => m.is_read)]
        this.setData({
          newMessages,
          oldMessages,
          notifPage: page,
          notifHasMore: res.data.hasMore,
          loading: false
        })
      } else {
        const newMessages = messages.filter(m => !m.is_read)
        const oldMessages = messages.filter(m => m.is_read)
        this.setData({
          newMessages,
          oldMessages,
          notifPage: page,
          notifHasMore: res.data.hasMore,
          loading: false
        })
      }
    } catch (e) {
      console.error('[通知] 获取通知失败:', e)
      this.setData({ loading: false })
    }
  },

  onLoadMoreNotifications() {
    if (this.data.notifHasMore && !this.data.loading) {
      this.loadNotifications(true)
    }
  },

  async onMsgTap(e) {
    const { id, index } = e.currentTarget.dataset
    if (id && id.startsWith('mock')) return

    const message = this.data.newMessages.find(m => m._id === id) || this.data.oldMessages.find(m => m._id === id)
    if (!message) return

    wx.setStorageSync('currentNotification', message)

    try {
      await callFunction('user', {
        action: 'markNotificationsRead',
        notificationIds: [id]
      })

      const isNew = typeof index === 'number' && index < this.data.newMessages.length
      if (isNew && this.data.newMessages[index]._id === id) {
        const key = `newMessages[${index}].is_read`
        this.setData({ [key]: true })
      }
    } catch (e) {
      console.warn('[通知] 标记已读失败:', e.message)
    }

    wx.navigateTo({
      url: `/pkg-my/pages/notification-detail/notification-detail?id=${id}`
    })
  }
})
