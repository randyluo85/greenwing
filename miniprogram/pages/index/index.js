const { callFunction } = require('../../utils/cloud')
const auth = require('../../utils/auth')
const { formatDate, getLevelName } = require('../../utils/util')

Page({
  data: {
    userInfo: null,
    banners: [],
    bannerCurrent: 0,
    events: [],
    books: [],
    signedToday: false,
    showSignModal: false,
    signResult: {},
    loading: true,
    levelName: '青铜会员',
    modeTextMap: {
      free: '免费报名',
      points_only: '积分兑换',
      paid: '付费报名'
    }
  },

  onLoad() {
    this.init()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  async onPullDownRefresh() {
    await this.init()
    wx.stopPullDownRefresh()
  },

  async init() {
    try {
      const userInfo = await auth.ensureLogin()
      this.setData({
        userInfo,
        levelName: getLevelName(userInfo.level),
        signedToday: userInfo.last_sign_date === this.getTodayStr()
      })
      wx.setStorageSync('userInfo', userInfo)
    } catch (e) {
      console.warn('登录失败，使用游客模式')
    }

    await Promise.all([
      this.loadBanners(),
      this.loadEvents(),
      this.loadBooks()
    ])

    this.setData({ loading: false })
  },

  getTodayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  async loadBanners() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('banners')
        .where({ status: 'online' })
        .orderBy('sort_order', 'asc')
        .limit(5)
        .get()
      if (res.data.length > 0) {
        this.setData({ banners: res.data })
        return
      }
    } catch (e) { /* 集合不存在 */ }
    // 云端无数据，使用本地默认 banner
    this.setData({
      banners: [{
        _id: 'default',
        image_url: '/images/banner.jpg',
        title: '青翼读书会',
        subtitle: '以书会友，以文化人',
        redirect_url: '',
        status: 'online'
      }]
    })
  },

  async loadEvents() {
    try {
      const res = await callFunction('event', { action: 'list', pageSize: 5 })
      const events = res.data.list.map(e => ({
        ...e,
        _formattedTime: formatDate(e.event_time, 'MM/DD/DD HH:mm')
      }))
      if (events.length > 0) {
        this.setData({ events })
        return
      }
    } catch (e) { /* 云函数未部署 */ }
    // 云端无数据，使用本地默认活动
    this.setData({
      events: [
        { _id: 'e1', cover_image: '/images/event.jpg', title: '古典主义回响：维吉尔《埃涅阿斯纪》精读营', status: 'published', registration_mode: 'points_only', points_cost: 100, location: '青翼读书会·主茶室', _formattedTime: '04/18 15:30' },
        { _id: 'e2', cover_image: '/images/event.jpg', title: '博尔赫斯的迷宫：《小径分岔的花园》', status: 'published', registration_mode: 'free', points_cost: 0, location: '青翼读书会·影音室', _formattedTime: '04/25 15:30' }
      ]
    })
  },

  async loadBooks() {
    const db = wx.cloud.database()
    const res = await db.collection('books')
      .where({ status: 'published' })
      .orderBy('sort_order', 'desc')
      .limit(10)
      .get()
    if (res.data.length > 0) {
      const books = res.data
      // cloud:// 在 DevTools 下可能无法解析，转为 HTTP URL
      const cloudIds = books.filter(b => b.cover_image && b.cover_image.startsWith('cloud://'))
        .map(b => b.cover_image)
      if (cloudIds.length > 0) {
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: cloudIds })
          const urlMap = {}
          urlRes.fileList.forEach(f => { urlMap[f.fileID] = f.tempFileURL })
          books.forEach(b => {
            if (b.cover_image && urlMap[b.cover_image]) {
              b.cover_image = urlMap[b.cover_image]
            }
          })
        } catch (e) { /* 转换失败则保留原值，真机可用 */ }
      }
      this.setData({ books })
    }
  },

  // 签到
  async onSignIn() {
    if (this.data.signedToday) {
      wx.showToast({ title: '今日已签到', icon: 'none' })
      return
    }

    // 签到前检查是否已完善资料
    const profileOk = await auth.ensureProfile()
    if (!profileOk) return

    try {
      wx.showLoading({ title: '签到中...' })
      const res = await callFunction('user', { action: 'signIn' })
      wx.hideLoading()

      this.setData({
        showSignModal: true,
        signResult: res.data,
        signedToday: true,
        'userInfo.current_points': (this.data.userInfo.current_points || 0) + res.data.earned,
        'userInfo.continuous_sign_days': res.data.continuousDays
      })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '签到失败', icon: 'none' })
    }
  },

  closeSignModal() {
    this.setData({ showSignModal: false })
  },

  // 跳转
  goEventList() {
    wx.switchTab({ url: '/pages/event/event' })
  },

  goEventDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${id}` })
  },

  goPoints() {
    wx.navigateTo({ url: '/pages/points/points' })
  },

  goVerify() {
    wx.navigateTo({ url: '/pages/verify/verify' })
  },

  goMyEvents() {
    wx.navigateTo({ url: '/pages/my-events/my-events' })
  },

  goNotifications() {
    wx.navigateTo({ url: '/pages/notifications/notifications' })
  },

  goBooks() {
    wx.navigateTo({ url: '/pages/books/books' })
  },

  onBannerTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item || !item.redirect_url) return

    const type = item.redirect_type
    if (type === 'article') {
      wx.showToast({ title: '功能开发中', icon: 'none' })
      return
    }
    // event / page / 兼容旧数据
    wx.navigateTo({ url: item.redirect_url })
  },

  onBannerChange(e) {
    this.setData({ bannerCurrent: e.detail.current })
  },

  onBookTap(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: `/pages/book-detail/book-detail?id=${id}` })
    }
  }
})
