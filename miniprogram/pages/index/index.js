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
      // 同时请求未结束和已结束活动
      const [activeRes, endedRes] = await Promise.all([
        callFunction('event', { action: 'list', page: 1, pageSize: 20, includeEnded: false }),
        callFunction('event', { action: 'list', page: 1, pageSize: 20, includeEnded: true })
      ])

      // 合并列表
      const allEventData = [
        ...(activeRes.data.list || []),
        ...(endedRes.data.list || [])
      ]

      let enrolledIds = []
      try {
        const openid = getApp().globalData.openid || wx.getStorageSync('userInfo')?.open_id
        if (openid && allEventData.length > 0) {
          const cachedIds = getCache('enrolled_event_ids')
          if (cachedIds) {
            enrolledIds = cachedIds
          } else {
            const eventIds = allEventData.map(e => e._id)
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

      console.log('[loadEvents] 云函数返回活动数量:', allEventData.length)

      // 计算活动状态和优先级，然后排序
      const allEvents = allEventData.map(e => {
        const plainText = (e.description || '').replace(/<[^>]+>/g, '').trim();

        // 使用 event_end_time 判断活动是否已结束
        const _isEnded = e.status === 'ended' || isPast(e.event_end_time);
        const _isClosed = isPast(e.registration_deadline);
        const _enrolled = enrolledIds.includes(e._id);
        const isFull = e.quota && e.enrolled_count >= e.quota;

        // 计算状态文本
        let _statusText = '报名中';
        if (_isEnded) _statusText = '已结束';
        else if (_isClosed) _statusText = '报名截止';
        else if (isFull) _statusText = '名额已满';
        else if (_enrolled) _statusText = '已报名';

        // 排序优先级：报名中=1（优先显示），其他=2（后显示）
        const _statusPriority = (_isEnded || _isClosed || isFull) ? 2 : 1;

        return {
          ...e,
          _enrolled,
          _statusText,
          _statusPriority,
          _formattedTime: formatEventRange(e.event_time, e.event_end_time),
          _excerpt: plainText.length > 30 ? plainText.substring(0, 30) + '...' : plainText,
        };
      }).sort((a, b) => {
        // 先按状态优先级排序（报名中优先）
        if (a._statusPriority !== b._statusPriority) {
          return a._statusPriority - b._statusPriority;
        }
        // 报名中活动：按开始时间从近到远（升序，早的开始在前）
        if (a._statusPriority === 1) {
          const timeA = new Date(a.event_time).getTime();
          const timeB = new Date(b.event_time).getTime();
          return timeA - timeB;
        }
        // 已结束活动：按结束时间从近到远（降序，最近结束的在前）
        const timeA = new Date(a.event_end_time).getTime();
        const timeB = new Date(b.event_end_time).getTime();
        return timeB - timeA;
      });

      // 首页最多显示 3 个活动
      const events = allEvents.slice(0, 3)

      console.log('[loadEvents] 总活动数:', allEvents.length, '首页显示:', events.length, events.map(e => ({ id: e._id, title: e.title, status: e._statusText })))

      if (events.length > 0) {
        await resolveCloudUrls(events, 'cover_image')
        this.setData({ events })
        return
      }
    } catch (e) {
      console.error('[loadEvents] 云函数调用失败:', e.message)
    }
    // 不再设置默认活动数据，空数据时显示空状态
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
