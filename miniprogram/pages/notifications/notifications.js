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
    // Refresh on show
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
      // notifications collection may not exist yet - show mock data
      this.setData({
        newMessages: [
          {
            _id: 'mock1',
            title: '活动报名成功',
            body: '您已成功报名《百年孤独》精读研讨会',
            icon_bg_color: '#5c8deb',
            icon_text: '签',
            _timeAgo: '刚刚',
            is_read: false
          },
          {
            _id: 'mock2',
            title: '积分奖励发放',
            body: '您已连续签到7天，系统已发放50额积分奖励',
            icon_bg_color: '#fb923c',
            icon_text: '奖',
            _timeAgo: '1小时前',
            is_read: false
          }
        ],
        oldMessages: [
          {
            _id: 'mock3',
            title: '系统维护公告',
            body: '服务器将于本周进行维护，届时服务可能短暂不可用',
            icon_bg_color: '#f05232',
            icon_text: '系',
            _timeAgo: '昨天',
            is_read: true
          },
          {
            _id: 'mock4',
            title: '欢迎加入',
            body: '欢迎注册青翼读书会会员！社群活动与精彩内容等你探索',
            icon_bg_color: '#14b8a6',
            icon_text: '公',
            _timeAgo: '2月21日',
            is_read: true
          }
        ],
        loading: false
      })
    }
  },

  async onMsgTap(e) {
    const { id, index } = e.currentTarget.dataset
    if (id && id.startsWith('mock')) return

    // Mark as read
    try {
      const db = wx.cloud.database()
      await db.collection('notifications').doc(id).update({
        data: { is_read: true }
      })
      const key = `newMessages[${index}].is_read`
      this.setData({ [key]: true })
    } catch (e) {
      // silent
    }
  }
})
