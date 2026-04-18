const { callFunction } = require('../../../utils/cloud')

Page({
  data: {
    userInfo: {},
    nickname: '',
    realName: '',
    bio: '',
    genderIndex: 2,
    genderOptions: ['男', '女', '隐私'],
    birthday: '',
    maskedPhone: '',
    joinDays: 0,
    saving: false
  },

  onLoad() {
    this.initData()
    this.fetchLatestProfile()
  },

  initData(userCache) {
    const userInfo = userCache || getApp().globalData.userInfo || wx.getStorageSync('userInfo') || {}
    const phone = userInfo.phone || ''
    const masked = phone.length >= 11
      ? phone.slice(0, 3) + '****' + phone.slice(7)
      : phone

    let genderIndex = 2
    if (userInfo.gender === 'male') genderIndex = 0
    else if (userInfo.gender === 'female') genderIndex = 1

    let joinDays = 0
    if (userInfo.created_at) {
      const created = new Date(userInfo.created_at)
      joinDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24))
    }

    this.setData({
      userInfo,
      nickname: userInfo.nickname || '',
      realName: userInfo.real_name || '',
      bio: userInfo.bio || '',
      genderIndex,
      birthday: userInfo.birthday || '',
      maskedPhone: masked,
      joinDays
    })
  },

  async fetchLatestProfile() {
    try {
      const res = await callFunction('user', { action: 'getProfile' })
      if (res.success && res.data) {
        const userInfo = res.data
        getApp().globalData.userInfo = userInfo
        wx.setStorageSync('userInfo', userInfo)
        this.initData(userInfo)
      }
    } catch (e) {
      console.warn('获取最新用户信息失败', e)
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  onRealNameInput(e) {
    this.setData({ realName: e.detail.value })
  },

  async onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '授权取消', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '绑定中...' })

      // 调用云函数解密手机号
      const res = await callFunction('user', {
        action: 'bindPhone',
        cloudID: e.detail.cloudID
      })

      wx.hideLoading()

      if (res.success) {
        const phone = res.data.phone || ''
        const masked = phone.length >= 11
          ? phone.slice(0, 3) + '****' + phone.slice(7)
          : phone

        this.setData({ maskedPhone: masked })

        // 更新本地存储
        const stored = wx.getStorageSync('userInfo') || {}
        stored.phone = phone
        wx.setStorageSync('userInfo', stored)
        getApp().globalData.userInfo = stored

        wx.showToast({ title: '绑定成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.message || '绑定失败', icon: 'none' })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '绑定失败', icon: 'none' })
    }
  },

  onBioInput(e) {
    this.setData({ bio: e.detail.value })
  },

  onGenderChange(e) {
    this.setData({ genderIndex: Number(e.detail.value) })
  },

  onBirthdayChange(e) {
    this.setData({ birthday: e.detail.value })
  },

  async onChangeAvatar() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const tempPath = res.tempFiles[0].tempFilePath
      wx.showLoading({ title: '上传中...' })

      const cloudPath = `avatars/${getApp().globalData.openid}_${Date.now()}.jpg`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempPath
      })

      this.setData({ 'userInfo.avatar_url': uploadRes.fileID })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
    }
  },

  async onSave() {
    const { nickname, realName, bio, genderIndex, genderOptions, birthday, userInfo } = this.data
    const gender = genderIndex === 0 ? 'male' : genderIndex === 1 ? 'female' : 'private'

    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    try {
      const updateData = {
        nickname: nickname.trim(),
        real_name: realName.trim(),
        bio,
        gender,
        birthday
      }
      if (userInfo.avatar_url) {
        updateData.avatar_url = userInfo.avatar_url
      }

      await callFunction('user', {
        action: 'updateProfile',
        ...updateData
      })

      const stored = wx.getStorageSync('userInfo') || {}
      Object.assign(stored, updateData)
      wx.setStorageSync('userInfo', stored)
      getApp().globalData.userInfo = stored

      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  onUnload() {
    // Save on page close if data changed
  }
})
