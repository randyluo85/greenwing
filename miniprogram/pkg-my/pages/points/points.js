const { callFunction } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const { formatDate } = require('../../../utils/util')

Page({
  data: {
    list: [],
    currentPoints: 0,
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    const app = getApp()
    this.setData({ currentPoints: (app.globalData.userInfo && app.globalData.userInfo.current_points) || 0 })
    this.loadList()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList()
  },

  async loadList() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const { page } = this.data
      const res = await callFunction('user', { action: 'getPointLogs', page, pageSize: 20 })

      const newList = res.data.list.map(item => ({
        ...item,
        _formattedTime: formatDate(item.created_at, 'MM-DD HH:mm')
      }))

      this.setData({
        list: page === 1 ? newList : [...this.data.list, ...newList],
        hasMore: res.data.hasMore,
        page: page + 1,
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  }
})
