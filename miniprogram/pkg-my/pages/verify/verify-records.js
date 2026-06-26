const { callFunction } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    list: [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    loading: false,
    loadingMore: false
  },

  onLoad() {
    if (!auth.isAdmin()) {
      wx.showModal({
        title: '无权限',
        content: '仅管理员和核销员可以使用此功能',
        showCancel: false,
        success: () => wx.navigateBack()
      })
      return
    }
    this.loadList(true)
  },

  async loadList(refresh = false) {
    const page = refresh ? 1 : this.data.page + 1
    const loadingKey = refresh ? 'loading' : 'loadingMore'
    this.setData({ [loadingKey]: true })

    try {
      const res = await callFunction('event', {
        action: 'getMyVerifications',
        page,
        pageSize: this.data.pageSize
      })

      const data = res.data || {}
      const newList = data.list || []

      this.setData({
        list: refresh ? newList : [...this.data.list, ...newList],
        page,
        total: data.total || 0,
        hasMore: data.hasMore !== false,
        [loadingKey]: false
      })
    } catch (e) {
      this.setData({ [loadingKey]: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadList(false)
    }
  },

  onPullDownRefresh() {
    this.loadList(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  formatTime(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const pad = n => n < 10 ? '0' + n : n
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
})
