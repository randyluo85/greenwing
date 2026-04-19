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

      const messages = res.data.map(m => ({
        ...m,
        _timeAgo: m.created_at ? timeAgo(new Date(m.created_at)) : ''
      }))

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
