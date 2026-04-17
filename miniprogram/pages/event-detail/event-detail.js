const { callFunction, resolveCloudUrls } = require('../../utils/cloud')
const auth = require('../../utils/auth')
const { formatDate, formatMoney, timeAgo } = require('../../utils/util')

Page({
  data: {
    event: null,
    eventId: '',
    modeText: '',
    priceText: '',
    formattedTime: '',
    formattedTimeSub: '',
    tierText: '',
    tierOk: false,
    userPoints: 0,
    canEnroll: false,
    enrollBtnText: '立即报名',
    platformStatus: 'open',  // 'open' | 'full' | 'closed'
    isEventPast: false,
    showSuccessModal: false,
    showNameModal: false,     // 真实姓名填写弹窗
    verifyCode: '',
    enrollRealName: '',       // 报名时填写的真实姓名
    enrollContactPhone: '',   // 报名时填写的联系电话
    // 评论
    comments: [],
    commentTotal: 0,
    commentPage: 1,
    commentHasMore: false,
    commentText: '',
    isEnrolled: false,
    commentsLoading: false,
    commentPosting: false,
    showCommentInput: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ eventId: options.id })
      this.loadEvent(options.id)
      this.loadUserInfo().then(() => this.checkEnrollment())
    }
  },

  onShow() {
    // 更新 TabBar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }

    // 重新加载活动数据，确保数据是最新的
    if (this.data.eventId) {
      this.loadEvent(this.data.eventId)
      this.loadUserInfo().then(() => this.checkEnrollment())
    }
  },

  async loadUserInfo() {
    try {
      const user = await auth.ensureLogin()
      const app = getApp()
      const settings = app.globalData.settings || {}
      const thresholds = settings.level_thresholds || { bronze: 0, silver: 500, gold: 1000 }

      this.setData({ userPoints: user.current_points || 0 })

      // 计算等级门槛是否满足
      if (this.data.event && this.data.event.tier_threshold && this.data.event.tier_threshold !== 'none') {
        const levelOrder = ['bronze', 'silver', 'gold']
        const userLevelIdx = levelOrder.indexOf(user.level)
        const requireLevelIdx = levelOrder.indexOf(this.data.event.tier_threshold)
        this.setData({ tierOk: userLevelIdx >= requireLevelIdx })
      }

      this._userLevel = user.level
      this._levelOrder = ['bronze', 'silver', 'gold']
      this._thresholds = thresholds
    } catch (e) {
      console.warn('获取用户信息失败')
    }
  },

  async loadEvent(id) {
    try {
      wx.showLoading({ title: '加载中...' })

      // 调试日志：显示活动ID和原始数据
      console.log('[DEBUG] 加载活动详情，eventId:', id)
      const res = await callFunction('event', { action: 'detail', eventId: id })
      const event = res.data
      console.log('[DEBUG] 从服务器获取的原始数据:', event)
      console.log('[DEBUG] event.price 原始值:', event.price, '(分)')
      console.log('[DEBUG] formatMoney 后:', formatMoney(event.price), '(元)')

      await resolveCloudUrls([event], 'cover_image')

      const modeMap = { free: '免费报名', points_only: '积分兑换', paid: '付费报名' }
      const tierMap = { bronze: '青铜会员', silver: '白银会员', gold: '黄金会员' }

      const isEventPast = new Date(event.event_time) < new Date()

      this.setData({
        event,
        modeText: modeMap[event.registration_mode],
        priceText: event.price ? formatMoney(event.price) : '',
        formattedTime: formatDate(event.event_time, 'YYYY年MM月DD日'),
        formattedTimeSub: formatDate(event.event_time, 'HH:mm'),
        tierText: tierMap[event.tier_threshold] || '',
        isEventPast
      })

      this.updateUIState()

      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async onEnroll() {
    if (!this.data.canEnroll) return

    // 报名前检查是否已完善资料
    const profileOk = await auth.ensureProfile()
    if (!profileOk) return

    const event = this.data.event
    const eventId = this.data.eventId

    // 付费模式跳转订单确认页
    if (event.registration_mode === 'paid') {
      wx.navigateTo({ url: `/pages/order-confirm/order-confirm?eventId=${eventId}` })
      return
    }

    // 检查登录
    try {
      await auth.ensureLogin()
    } catch (e) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    // 检查用户是否有真实姓名
    const app = getApp()
    const user = app.globalData.userInfo || {}
    if (!user.real_name) {
      // 弹出真实姓名填写弹窗
      this.setData({
        showNameModal: true,
        enrollRealName: '',
        enrollContactPhone: user.phone || ''
      })
      return
    }

    // 有真实姓名，直接报名
    await this.doEnroll(user.real_name, user.phone)
  },

  closeSuccessModal() {
    this.setData({ showSuccessModal: false })
  },

  // 真实姓名弹窗相关
  closeNameModal() {
    this.setData({ showNameModal: false })
  },

  onEnrollNameInput(e) {
    this.setData({ enrollRealName: e.detail.value })
  },

  onEnrollPhoneInput(e) {
    this.setData({ enrollContactPhone: e.detail.value })
  },

  async confirmEnrollWithName() {
    const { enrollRealName, eventId } = this.data

    if (!enrollRealName.trim()) {
      wx.showToast({ title: '请输入真实姓名', icon: 'none' })
      return
    }

    // 关闭姓名弹窗，继续报名流程
    this.setData({ showNameModal: false })

    // 调用报名接口，传入真实姓名
    await this.doEnroll(enrollRealName.trim(), this.data.enrollContactPhone.trim())
  },

  async doEnroll(realName, contactPhone) {
    const { eventId } = this.data

    try {
      wx.showLoading({ title: '报名中...' })

      const event = this.data.event
      const action = event.registration_mode === 'free' ? 'enrollFree' : 'enrollPoints'

      const params = { eventId }
      if (realName) params.realName = realName
      if (contactPhone) params.contactPhone = contactPhone

      const res = await callFunction('event', { action, ...params })
      wx.hideLoading()

      // Update local userInfo cache
      const app = getApp()
      const cached = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
      let isUpdated = false
      if (realName && cached.real_name !== realName) {
        cached.real_name = realName
        isUpdated = true
      }
      if (contactPhone && cached.phone !== contactPhone) {
        cached.phone = contactPhone
        isUpdated = true
      }
      if (isUpdated) {
        app.globalData.userInfo = cached
        wx.setStorageSync('userInfo', cached)
      }

      this.setData({
        showSuccessModal: true,
        verifyCode: res.data.verify_code,
        isEnrolled: true
      })
      this.updateUIState()
      this.loadComments()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '报名失败', icon: 'none' })
    }
  },

  goMyEvents() {
    this.setData({ showSuccessModal: false })
    wx.navigateTo({ url: '/pages/my-events/my-events' })
  },

  async checkEnrollment() {
    try {
      const app = getApp()
      if (!app.globalData.userInfo) return

      const res = await callFunction('event', {
        action: 'checkEnrollment',
        eventId: this.data.eventId
      })

      this.setData({ isEnrolled: res.data.enrolled })
      this.updateUIState()
      if (res.data.enrolled) {
        this.loadComments()
      }
    } catch (e) {
      console.warn('检查报名状态失败:', e)
    }
  },

  async loadComments(loadMore = false) {
    if (this.data.commentsLoading) return

    const page = loadMore ? this.data.commentPage + 1 : 1
    this.setData({ commentsLoading: true })

    try {
      const res = await callFunction('event', {
        action: 'listComments',
        eventId: this.data.eventId,
        page,
        pageSize: 20
      })

      const formattedList = res.data.list.map(item => ({
        ...item,
        timeAgo: item.created_at ? timeAgo(item.created_at) : ''
      }))

      // 按 created_at 升序排列（API 返回 desc）
      const sorted = formattedList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

      const comments = loadMore
        ? [...this.data.comments, ...sorted]
        : sorted

      this.setData({
        comments,
        commentTotal: res.data.total,
        commentPage: page,
        commentHasMore: res.data.hasMore,
        commentsLoading: false
      })
    } catch (e) {
      this.setData({ commentsLoading: false })
      console.warn('加载评论失败:', e)
    }
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value })
  },

  async onPostComment() {
    const content = this.data.commentText.trim()
    if (!content) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' })
      return
    }

    this.setData({ commentPosting: true })

    try {
      const res = await callFunction('event', {
        action: 'addComment',
        eventId: this.data.eventId,
        content
      })

      const newComment = {
        ...res.data,
        timeAgo: '刚刚'
      }

      this.setData({
        comments: [...this.data.comments, newComment],
        commentTotal: this.data.commentTotal + 1,
        commentText: '',
        commentPosting: false,
        showCommentInput: false
      })

      wx.showToast({ title: '评论成功', icon: 'success' })
    } catch (e) {
      this.setData({ commentPosting: false })
      wx.showToast({ title: e.message || '评论失败', icon: 'none' })
    }
  },

  onToggleCommentInput() {
    this.setData({ showCommentInput: !this.data.showCommentInput })
  },

  onLoadMoreComments() {
    if (this.data.commentHasMore && !this.data.commentsLoading) {
      this.loadComments(true)
    }
  },

  // 统一计算按钮状态（平台状态 + 用户报名状态）
  updateUIState() {
    const { event, isEnrolled, isEventPast } = this.data
    if (!event) return

    const modeMap = { free: '免费报名', points_only: '积分兑换', paid: '付费报名' }

    // 平台状态
    const isEnded = event.status === 'ended'
    const isPastDeadline = event.registration_deadline && new Date() > new Date(event.registration_deadline)
    const isFull = event.quota && event.enrolled_count >= event.quota

    let platformStatus = 'open'
    if (isEnded || isPastDeadline || isEventPast) {
      platformStatus = 'closed'
    } else if (isFull) {
      platformStatus = 'full'
    }

    // 按钮文案 + 可点击
    let enrollBtnText, canEnroll

    if (isEnrolled) {
      enrollBtnText = isEventPast || isEnded ? '已结束' : '已报名'
      canEnroll = false
    } else if (platformStatus === 'closed') {
      enrollBtnText = '报名已结束'
      canEnroll = false
    } else if (platformStatus === 'full') {
      enrollBtnText = '名额已满'
      canEnroll = false
    } else {
      enrollBtnText = modeMap[event.registration_mode] || '立即报名'
      canEnroll = true
    }

    this.setData({ platformStatus, enrollBtnText, canEnroll })
  }
})
