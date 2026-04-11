const { callFunction } = require('../../utils/cloud')
const auth = require('../../utils/auth')
const { formatDate, formatMoney } = require('../../utils/util')

Page({
  data: {
    event: null,
    eventId: '',
    priceText: '',
    formattedTime: '',
    orderStatus: '',
    statusText: '',
    countdown: 0,
    countdownStr: '',
    paying: false,
    orderId: ''
  },

  _timer: null,

  onLoad(options) {
    if (options.eventId) {
      this.setData({ eventId: options.eventId })
      this.loadEvent(options.eventId)
    }
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  },

  async loadEvent(eventId) {
    try {
      await auth.ensureLogin()
      const res = await callFunction('event', { action: 'detail', eventId })
      const event = res.data

      this.setData({
        event,
        priceText: formatMoney(event.price),
        formattedTime: formatDate(event.event_time, 'YYYY-MM-DD HH:mm')
      })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async onPay() {
    if (this.data.paying) return

    // 付款前检查是否已完善资料
    const profileOk = await auth.ensureProfile()
    if (!profileOk) return

    try {
      this.setData({ paying: true })

      // 创建订单
      const orderRes = await callFunction('pay', {
        action: 'createOrder',
        eventId: this.data.eventId
      })

      const { orderId, payment, expireAt } = orderRes.data
      this.setData({ orderId })

      // 开始倒计时
      if (expireAt) {
        this.startCountdown(new Date(expireAt))
      }

      // 唤起微信支付
      wx.requestPayment({
        provider: 'wxpay',
        timeStamp: payment.timeStamp,
        nonceStr: payment.nonceStr,
        package: payment.package,
        signType: 'MD5',
        paySign: payment.paySign,
        success: () => {
          this.checkOrderStatus(orderId)
        },
        fail: (err) => {
          if (err.errMsg.includes('cancel')) {
            wx.showToast({ title: '已取消支付', icon: 'none' })
          } else {
            wx.showToast({ title: '支付失败', icon: 'none' })
          }
          this.setData({ paying: false })
        }
      })
    } catch (e) {
      this.setData({ paying: false })
      wx.showToast({ title: e.message || '创建订单失败', icon: 'none' })
    }
  },

  async checkOrderStatus(orderId) {
    try {
      const res = await callFunction('pay', { action: 'queryOrder', orderId })
      const order = res.data

      if (order.status === 'paid') {
        if (this._timer) clearInterval(this._timer)
        this.setData({
          orderStatus: 'paid',
          statusText: '支付成功！报名已完成',
          paying: false
        })
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/my-events/my-events' })
        }, 2000)
      } else {
        this.setData({ paying: false })
        wx.showToast({ title: '请稍后在"我的订单"查看', icon: 'none' })
      }
    } catch (e) {
      this.setData({ paying: false })
      wx.showToast({ title: '请到"我的订单"确认', icon: 'none' })
    }
  },

  startCountdown(expireAt) {
    const update = () => {
      const diff = expireAt.getTime() - Date.now()
      if (diff <= 0) {
        clearInterval(this._timer)
        this.setData({ countdown: 0, countdownStr: '已超时', orderStatus: 'closed', statusText: '订单已超时' })
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      this.setData({
        countdown: diff,
        countdownStr: `${minutes}分${String(seconds).padStart(2, '0')}秒`
      })
    }

    update()
    this._timer = setInterval(update, 1000)
  }
})
