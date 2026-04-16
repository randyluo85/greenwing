const { timeAgo } = require('../../utils/util')

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
      if (!openid) {
        this.setData({ loading: false })
        return
      }

      const res = await db.collection('notifications')
        .where({ open_id: openid })
        .orderBy('created_at', 'desc')
        .limit(50)
        .get()

      const messages = res.data.map(m => ({
        ...m,
        _timeAgo: m.created_at ? timeAgo(new Date(m.created_at)) : ''
      }))

      const newMessages = messages.filter(m => !m.is_read)
      const oldMessages = messages.filter(m => m.is_read)

      this.setData({ newMessages, oldMessages, loading: false })
    } catch (e) {
      console.warn('获取通知失败:', e)
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

    // Mark as read
    try {
      const db = wx.cloud.database()
      db.collection('notifications').doc(id).update({
        data: { is_read: true }
      }).catch(e => {}) // non-blocking

      const isNew = typeof index === 'number' && index < this.data.newMessages.length
      if (isNew && this.data.newMessages[index]._id === id) {
        const key = `newMessages[${index}].is_read`
        this.setData({ [key]: true })
      }
    } catch (e) {
      // silent
    }

    wx.navigateTo({
      url: `/pages/notification-detail/notification-detail?id=${id}`
    })
  }
})
