const { callFunction } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    groups: [],
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
      const newGroups = data.groups || []

      // 合并分组：刷新时替换，加载更多时追加同 event_id 的 records
      let mergedGroups
      if (refresh) {
        mergedGroups = newGroups
      } else {
        const existingMap = {}
        this.data.groups.forEach(g => { existingMap[g.event_id] = g })
        newGroups.forEach(g => {
          if (existingMap[g.event_id]) {
            existingMap[g.event_id].records.push(...g.records)
          } else {
            existingMap[g.event_id] = g
            this.data.groups.push(g)
          }
        })
        mergedGroups = this.data.groups.map(g => existingMap[g.event_id] || g)
      }

      this.setData({
        groups: mergedGroups,
        page,
        total: data.total || 0,
        hasMore: data.hasMore !== false,
        [loadingKey]: false
      })
    } catch (e) {
      this.setData({ [loadingKey]: false })
      wx.showToast({ title: e.message || '加载失败', icon: 'none', duration: 3000 })
      console.error('[verify-records] 加载核销记录失败:', e)
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
  }
})
