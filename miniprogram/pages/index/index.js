const { callFunction, resolveCloudUrls } = require('../../utils/cloud')
const auth = require('../../utils/auth')
const { formatDate, getLevelName, isPast, formatEventRange } = require('../../utils/util')
const { getCache, setCache } = require('../../utils/cache')

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
    unreadCount: 0,
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
    this.checkUnreadNotifications()

    const app = getApp()
    if (app.globalData.lastEnrollTime && (!this.data._lastLoadTime || this.data._lastLoadTime < app.globalData.lastEnrollTime)) {
      this.loadEvents()
    }
  },

  async checkUnreadNotifications() {
    try {
      const openid = getApp().globalData.openid || wx.getStorageSync('userInfo')?.open_id
      if (!openid) return

      const db = wx.cloud.database()
      const res = await db.collection('notifications')
        .where({ open_id: openid, is_read: false })
        .count({ timeout: 8000 })
      this.setData({ unreadCount: res.total })
    } catch (e) {
      // collection may not exist yet
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

    try {
      await Promise.all([
        this.loadBanners(),
        this.loadEvents(),
        this.loadBooks()
      ])
    } catch (e) {
      console.warn('部分数据加载失败:', e)
    }

    this.setData({ loading: false })
  },

  getTodayStr() {
    const d = new Date(Date.now() + 8 * 3600000)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  },

  async loadBanners() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('banners')
        .where({ status: 'online' })
        .orderBy('sort_order', 'asc')
        .limit(5)
        .get({ timeout: 10000 })
      if (res.data.length > 0) {
        await resolveCloudUrls(res.data, 'image_url')
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

  // 增加分享
  onShareAppMessage() {
    return {
      title: '青翼读书会 - 以书会友，以文化人',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: '青翼读书会 - 以书会友，以文化人'
    }
  },

  async loadEvents() {
    this.setData({ _lastLoadTime: Date.now() })
    try {
      // 请求更多数据，确保有足够的选择
      const res = await callFunction('event', { action: 'list', page: 1, pageSize: 30 })

      let enrolledIds = []
      try {
        const openid = getApp().globalData.openid || wx.getStorageSync('userInfo')?.open_id
        if (openid && res.data.list && res.data.list.length > 0) {
          const cachedIds = getCache('enrolled_event_ids')
          if (cachedIds) {
            enrolledIds = cachedIds
          } else {
            const eventIds = res.data.list.map(e => e._id)
            const db = wx.cloud.database()
            const _ = db.command
            
            // 查询当前用户在这些活动中的报名记录
            const MAX_LIMIT = 20
            let promises = []
            for (let i = 0; i < eventIds.length; i += MAX_LIMIT) {
               const batchIds = eventIds.slice(i, i + MAX_LIMIT)
               promises.push(db.collection('registrations').where({
                 open_id: openid,
                 event_id: _.in(batchIds),
                 status: _.neq('cancelled')
               }).get())
            }
            const regResArr = await Promise.all(promises)
            regResArr.forEach(regRes => {
              enrolledIds = enrolledIds.concat(regRes.data.map(r => r.event_id))
            })
            
            // 写入缓存，存活 5 分钟
            setCache('enrolled_event_ids', enrolledIds, 300)
          }
        }
      } catch (e) {
        console.error('获取报名状态失败', e)
      }

      console.log('[loadEvents] 云函数返回活动数量:', res.data.list?.length || 0)

      // 过滤并计算状态
      const events = res.data.list
        .map(e => {
          const plainText = (e.description || '').replace(/<[^>]+>/g, '').trim();
          const eventTimeMs = e.event_time ? new Date(e.event_time).getTime() : 0

          const _isEnded = e.status === 'ended' || isPast(e.event_time)
          const _isClosed = isPast(e.registration_deadline)
          const _enrolled = enrolledIds.includes(e._id)
          const isFull = e.quota && e.enrolled_count >= e.quota

          let _statusPriority = 1
          let _statusText = '报名中'

          if (_isEnded) {
            _statusPriority = 5
            _statusText = '已结束'
          } else if (_isClosed) {
            _statusPriority = 4
            _statusText = '报名截止'
          } else if (_enrolled) {
            _statusPriority = 2
            _statusText = '已报名'
          } else if (isFull) {
            _statusPriority = 3
            _statusText = '名额已满'
          }

          return {
            ...e,
            _enrolled,
            _statusText,
            _statusPriority,
            _eventTimeMs: eventTimeMs,
            _formattedTime: formatEventRange(e.event_time, e.event_end_time),
            _excerpt: plainText.length > 30 ? plainText.substring(0, 30) + '...' : plainText,
          };
        })
        // 排序：优先级高的在前，同优先级内即将开始的在前
        .sort((a, b) => {
          if (a._statusPriority !== b._statusPriority) {
            return a._statusPriority - b._statusPriority
          }
          // 同优先级内，按时间升序（即将开始的在前）
          return a._eventTimeMs - b._eventTimeMs
        })
        // 首页只显示未结束的活动，最多 3 个
        .filter(e => e._statusPriority < 5)
        .slice(0, 3)

      console.log('[loadEvents] 首页显示活动数量:', events.length, events.map(e => ({ id: e._id, title: e.title, status: e._statusText })))

      if (events.length > 0) {
        await resolveCloudUrls(events, 'cover_image')
        this.setData({ events })
        return
      }
    } catch (e) {
      console.error('[loadEvents] 云函数调用失败:', e.message)
    }
    // 云端无数据或云函数未部署，使用本地默认活动
    this.setData({
      events: [
        { _id: 'e1', cover_image: '/images/event.jpg', title: '古典主义回响：维吉尔《埃涅阿斯纪》精读营', status: 'published', registration_mode: 'points_only', points_cost: 100, location: '青翼读书会·主茶室', event_time: '2099-04-18T15:30:00', event_end_time: '2099-04-18T17:30:00', _formattedTime: '2099-04-18 15:30 - 17:30', _statusText: '报名中' },
        { _id: 'e2', cover_image: '/images/event.jpg', title: '博尔赫斯的迷宫：《小径分岔的花园》', status: 'published', registration_mode: 'free', points_cost: 0, location: '青翼读书会·影音室', event_time: '2099-04-25T15:30:00', event_end_time: '2099-04-25T17:30:00', _formattedTime: '2099-04-25 15:30 - 17:30', _statusText: '报名中' }
      ]
    })
  },

  async loadBooks() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('books')
        .where({ status: 'published' })
        .orderBy('sort_order', 'desc')
        .limit(10)
        .get({ timeout: 10000 })
      if (res.data.length > 0) {
        const books = res.data.map(b => ({
          ...b,
          _fullStars: Math.floor((b.rating || 0) / 2),
          _halfStar: (b.rating || 0) % 2 === 1
        }))
        // cloud:// 在 DevTools 下可能无法解析，转为 HTTP URL
        await resolveCloudUrls(books, 'cover_image')
        this.setData({ books })
      }
    } catch (e) { /* ignore */ }
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
  goSearch() {
    wx.navigateTo({ url: '/pkg-base/pages/search/search' })
  },

  goEventList() {
    wx.switchTab({ url: '/pages/event/event' })
  },

  goEventDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pkg-event/pages/event-detail/event-detail?id=${id}` })
  },

  goPoints() {
    wx.navigateTo({ url: '/pkg-my/pages/points/points' })
  },

  goVerify() {
    wx.navigateTo({ url: '/pkg-my/pages/verify/verify' })
  },

  goMyEvents() {
    wx.navigateTo({ url: '/pkg-my/pages/my-events/my-events' })
  },

  goNotifications() {
    wx.navigateTo({ url: '/pkg-my/pages/notifications/notifications' })
  },

  goBooks() {
    wx.navigateTo({ url: '/pkg-base/pages/books/books' })
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
      wx.navigateTo({ url: `/pkg-base/pages/book-detail/book-detail?id=${id}` })
    }
  }
})
