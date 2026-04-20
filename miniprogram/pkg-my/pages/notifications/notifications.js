const { timeAgo } = require('../../../utils/util')
const { callFunction } = require('../../../utils/cloud')

Page({
  data: {
    newMessages: [],
    oldMessages: [],
    loading: true
  },

  onLoad() {
    this.loadNotifications()
  },

  onShow() {
    this.loadNotifications()
  },

  async loadNotifications() {
    try {
      const db = wx.cloud.database()
      const openid = getApp().globalData.openid
      console.log('[通知] openid:', openid)

      if (!openid) {
        console.warn('[通知] openid 为空，等待用户登录')
        this.setData({ loading: false })
        return
      }

      const res = await db.collection('notifications')
        .where({ open_id: openid })
        .orderBy('created_at', 'desc')
        .limit(50)
        .get({ timeout: 10000 })

      console.log('[通知] 查询结果数量:', res.data.length)

      const messages = res.data.map(m => {
        let _iconPath = '/images/icons/bell-white.svg'
        let _bgColor = '#14b8a6' // default green
        
        if (m.type === 'points_reward') {
          _iconPath = '/images/my-points-white.png'
          _bgColor = '#eab308' // dark yellow
        } else if (m.type === 'event_register' || m.title?.includes('核销') || m.title?.includes('活动') || m.title?.includes('报名')) {
          _iconPath = '/images/my-verify-white.png'
          _bgColor = '#3b82f6' // dark blue
        } else if (m.type?.includes('refund') || m.title?.includes('退款')) {
          _iconPath = '/images/my-receipt-white.png'
          _bgColor = '#ef4444' // dark red
        }

        return {
          ...m,
          _timeAgo: m.created_at ? timeAgo(new Date(m.created_at)) : '',
          _bgColor: _bgColor,
          _iconPath
        }
      })

      const newMessages = messages.filter(m => !m.is_read)
      const oldMessages = messages.filter(m => m.is_read)

      console.log('[通知] 新消息:', newMessages.length, '已读:', oldMessages.length)

      this.setData({ newMessages, oldMessages, loading: false })
    } catch (e) {
      console.error('[通知] 获取通知失败:', e)
      this.setData({
        newMessages: [],
        oldMessages: [],
        loading: false
      })
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
