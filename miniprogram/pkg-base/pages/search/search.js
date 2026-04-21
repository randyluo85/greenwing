const { callFunction, resolveCloudUrls } = require('../../../utils/cloud')
const { formatDate } = require('../../../utils/util')

Page({
  data: {
    keyword: '',
    history: [],
    results: [],
    loading: false,
    hasSearched: false
  },

  onLoad() {
    const history = wx.getStorageSync('searchHistory') || []
    this.setData({ history })
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
    if (!e.detail.value) {
      this.setData({ results: [], hasSearched: false })
    }
  },

  clearInput() {
    this.setData({ keyword: '', results: [], hasSearched: false })
  },

  tapHistory(e) {
    const kw = e.currentTarget.dataset.kw
    this.setData({ keyword: kw })
    this.doSearch(kw)
  },

  onSearch(e) {
    const kw = e.detail.value.trim()
    if (!kw) return
    this.setData({ keyword: kw })

    // 保存历史
    let history = this.data.history.filter(item => item !== kw)
    history.unshift(kw)
    if (history.length > 10) history = history.slice(0, 10)
    this.setData({ history })
    wx.setStorageSync('searchHistory', history)

    this.doSearch(kw)
  },

  clearHistory() {
    this.setData({ history: [] })
    wx.removeStorageSync('searchHistory')
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  },

  async doSearch(keyword) {
    this.setData({ loading: true, hasSearched: true, results: [] })
    try {
      const res = await callFunction('event', { action: 'list', pageSize: 50 })
      let list = res.data.list || []

      const kw = keyword.toLowerCase()
      list = list.filter(e => e.title && e.title.toLowerCase().includes(kw))

      list = list.map(e => ({
        ...e,
        _formattedTime: formatDate(e.event_time, 'MM/DD HH:mm')
      }))

      await resolveCloudUrls(list, 'cover_image')

      this.setData({ results: list })
    } catch (e) {
      wx.showToast({ title: '搜索失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  goEventDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pkg-event/pages/event-detail/event-detail?id=${id}` })
  }
})
