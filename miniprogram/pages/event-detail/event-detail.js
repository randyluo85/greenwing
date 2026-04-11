const { callFunction } = require('../../utils/cloud')
const auth = require('../../utils/auth')
const { formatDate, formatMoney } = require('../../utils/util')

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
    showSuccessModal: false,
    verifyCode: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ eventId: options.id })
      this.loadEvent(options.id)
      this.loadUserInfo()
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
      const res = await callFunction('event', { action: 'detail', eventId: id })
      const event = res.data

      const modeMap = { free: '免费报名', points_only: '积分兑换', paid: '付费报名' }
      const tierMap = { bronze: '青铜会员', silver: '白银会员', gold: '黄金会员' }

      const isEnded = event.status === 'ended'
      const isFull = event.quota && event.enrolled_count >= event.quota
      let enrollBtnText = modeMap[event.registration_mode] || '立即报名'
      let canEnroll = !isEnded && !isFull

      if (isEnded) enrollBtnText = '活动已结束'
      else if (isFull) enrollBtnText = '名额已满'

      this.setData({
        event,
        modeText: modeMap[event.registration_mode],
        priceText: event.price ? formatMoney(event.price) : '',
        formattedTime: formatDate(event.event_time, 'YYYY年MM月DD日'),
        formattedTimeSub: formatDate(event.event_time, 'HH:mm'),
        tierText: tierMap[event.tier_threshold] || '',
        enrollBtnText,
        canEnroll
      })

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

    const action = event.registration_mode === 'free' ? 'enrollFree' : 'enrollPoints'

    try {
      wx.showLoading({ title: '报名中...' })
      const res = await callFunction('event', { action, eventId })
      wx.hideLoading()

      this.setData({
        showSuccessModal: true,
        verifyCode: res.data.verify_code,
        canEnroll: false,
        enrollBtnText: '已报名'
      })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '报名失败', icon: 'none' })
    }
  },

  closeSuccessModal() {
    this.setData({ showSuccessModal: false })
  },

  goMyEvents() {
    this.setData({ showSuccessModal: false })
    wx.navigateTo({ url: '/pages/my-events/my-events' })
  }
})
