const { callFunction } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const { formatDate, formatMoney } = require('../../../utils/util')

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
  _pollTimer: null,

  onLoad(options) {
    if (options.eventId) {
      this.setData({ eventId: options.eventId })
      this.loadEvent(options.eventId)
    }

    // 调试：如果从 URL 参数中传入了 orderId，直接查询该订单状态
    if (options.orderId) {
      console.log('[调试] URL 中包含 orderId，查询订单状态:', options.orderId)
      this.queryOrderStatus(options.orderId)
    }
  },

  // 调试：手动查询订单状态
  async queryOrderStatus(orderId) {
    try {
      wx.showLoading({ title: '查询中...' })
      const res = await callFunction('pay', { action: 'queryOrder', orderId })
      const order = res.data
      wx.hideLoading()
      console.log('[调试] 订单状态查询结果:', order)
      wx.showModal({
        title: '订单状态',
        content: `订单号: ${order.order_no}\n状态: ${order.status}\n金额: ${order.amount}分`,
        showCancel: false
      })
    } catch (e) {
      wx.hideLoading()
      console.error('[调试] 查询订单状态失败:', e)
      wx.showToast({ title: '查询失败: ' + e.message, icon: 'none' })
    }
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
    if (this._pollTimer) clearInterval(this._pollTimer)
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
      console.log('[支付调试] orderRes:', JSON.stringify(orderRes))
      console.log('[支付调试] payment:', JSON.stringify(payment))
      console.log('[支付调试] payment keys:', payment ? Object.keys(payment) : 'payment is null/undefined')
      this.setData({ orderId })

      // 开始倒计时
      if (expireAt) {
        this.startCountdown(new Date(expireAt))
      }

      // 云函数返回的 payment 对象嵌套了一层，需要取 payment.payment
      const payParams = payment.payment || payment

      // 唤起微信支付
      wx.requestPayment({
        provider: 'wxpay',
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType || 'MD5',
        paySign: payParams.paySign,
        success: () => {
          // 支付成功，开始轮询订单状态
          this.startPollingOrderStatus(orderId)
        },
        fail: (err) => {
          console.error('[支付失败] 详细错误:', err)
          if (err.errMsg.includes('cancel')) {
            wx.showToast({ title: '已取消支付', icon: 'none' })
          } else {
            wx.showToast({ title: '支付失败: ' + (err.errMsg || err.errCode), icon: 'none', duration: 3000 })
          }
          this.setData({ paying: false })
        }
      })
    } catch (e) {
      this.setData({ paying: false })
      wx.showToast({ title: e.message || '创建订单失败', icon: 'none' })
    }
  },

  // 开始轮询订单状态
  startPollingOrderStatus(orderId) {
    console.log('[轮询订单状态] 开始轮询，orderId:', orderId)
    let pollCount = 0
    const maxPolls = 30  // 最多轮询 30 次（30秒）
    const pollInterval = 1000  // 每秒查询一次

    this._pollTimer = setInterval(async () => {
      pollCount++
      console.log(`[轮询订单状态] 第 ${pollCount} 次查询`)

      if (pollCount > maxPolls) {
        // 超时，停止轮询
        clearInterval(this._pollTimer)
        this.setData({ paying: false })
        wx.showToast({ title: '支付确认超时，请稍后在"我的订单"查看', icon: 'none', duration: 3000 })
        console.error('[轮询订单状态] 轮询超时')
        return
      }

      try {
        const res = await callFunction('pay', { action: 'queryOrder', orderId })
        const order = res.data
        console.log('[轮询订单状态] 订单状态:', order.status, '订单数据:', order)

        if (order.status === 'paid') {
          // 支付成功，停止轮询
          clearInterval(this._pollTimer)
          if (this._timer) clearInterval(this._timer)
          this.setData({
            orderStatus: 'paid',
            statusText: '支付成功！报名已完成',
            paying: false
          })
          getApp().globalData.lastEnrollTime = Date.now()
          wx.showToast({ title: '支付成功！报名已完成', icon: 'success' })
          console.log('[轮询订单状态] 检测到支付成功，准备跳转')
          // 延迟返回原页面
          setTimeout(() => {
            console.log('[轮询订单状态] 返回上一页')
            wx.navigateBack({ delta: 1 })
          }, 2000)
        } else if (order.status === 'pending') {
          console.log('[轮询订单状态] 订单仍为待支付状态，继续轮询...')
        }
      } catch (e) {
        console.error('[轮询订单状态] 查询失败:', e)
        // 继续轮询
      }
    }, pollInterval)
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
        getApp().globalData.lastEnrollTime = Date.now()
        wx.showToast({ title: '支付成功！报名已完成', icon: 'success' })
        // 延迟返回原页面
        setTimeout(() => {
          wx.navigateBack({ delta: 1 })
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
