const { callFunction } = require('../../utils/cloud')

Page({
  data: {
    userInfo: {},
    nickname: '',
    bio: '',
    genderIndex: 2,
    genderOptions: ['男', '女', '隐私'],
    birthday: '',
    maskedPhone: '',
    joinDays: 0,
    saving: false
  },

  onLoad() {
    const userInfo = getApp().globalData.userInfo || wx.getStorageSync('userInfo') || {}
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
      bio: userInfo.bio || '',
      genderIndex,
      birthday: userInfo.birthday || '',
      maskedPhone: masked,
      joinDays
    })
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
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
    const { nickname, bio, genderIndex, genderOptions, birthday, userInfo } = this.data
    const gender = genderIndex === 0 ? 'male' : genderIndex === 1 ? 'female' : 'private'

    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    try {
      const updateData = {
        nickname: nickname.trim(),
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
