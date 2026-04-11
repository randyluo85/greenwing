Page({
  data: {
    book: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.loadBook(options.id)
    }
  },

  async loadBook(id) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('books').doc(id).get()
      const book = res.data
      const r = book.rating || 0
      let fullStars = 0
      let halfStar = false
      if (r >= 9.5) { fullStars = 5 }
      else if (r >= 8.5) { fullStars = 4; halfStar = true }
      else if (r >= 7.5) { fullStars = 4 }
      else if (r >= 6.5) { fullStars = 3; halfStar = true }
      else if (r >= 5.5) { fullStars = 3 }
      else { fullStars = 2; halfStar = r >= 4.5 }
      book._fullStars = fullStars
      book._halfStar = halfStar
      this.setData({ book, loading: false })
      wx.setNavigationBarTitle({ title: book.title || '好书推荐' })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  }
})
