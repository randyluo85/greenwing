const { formatDate } = require('../../../utils/util')

Page({
  data: {
    message: null,
    loading: true
  },

  onLoad(options) {
    const cachedMsg = wx.getStorageSync('currentNotification')
    if (cachedMsg) {
      cachedMsg._formattedTime = cachedMsg.created_at ? formatDate(new Date(cachedMsg.created_at), 'YYYY-MM-DD HH:mm:ss') : ''
      this.setData({ message: cachedMsg, loading: false })
      // Notice: don't remove sync immediately if user wants to share, but for notifications it's fine.
    } else if (options.id) {
      this.loadMessage(options.id)
    } else {
      this.setData({ loading: false })
    }
  },

  async loadMessage(id) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('notifications').doc(id).get({ timeout: 8000 })
      const message = res.data
      
      message._formattedTime = message.created_at ? formatDate(new Date(message.created_at), 'YYYY-MM-DD HH:mm:ss') : ''
      
      this.setData({ message, loading: false })
      
      // Mark as read just in case
      if (!message.is_read) {
        db.collection('notifications').doc(id).update({
          data: { is_read: true }
        }).catch(e => {
          // ignore
        })
      }
    } catch (e) {
      console.error('加载消息失败', e)
      this.setData({ loading: false })
    }
  }
})