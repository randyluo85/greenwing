Page({
  data: {
    books: [],
    loading: true,
    hasMore: false,
    page: 1
  },

  onLoad() {
    this.loadBooks()
  },

  async loadBooks() {
    try {
      const db = wx.cloud.database()
      const countRes = await db.collection('books').where({ status: 'published' }).count()
      const total = countRes.total

      const res = await db.collection('books')
        .where({ status: 'published' })
        .orderBy('sort_order', 'asc')
        .skip((this.data.page - 1) * 20)
        .limit(20)
        .get()

      const books = res.data.map(b => {
        return { ...b, _stars: computeStars(b.rating) }
      })

      this.setData({
        books: this.data.books.concat(books),
        hasMore: this.data.page * 20 < total,
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.setData({ page: this.data.page + 1 })
      this.loadBooks()
    }
  },

  goBookDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/book-detail/book-detail?id=${id}` })
  }
})

function computeStars(rating) {
  const r = rating || 0
  let fullStars = 0
  let halfStar = false
  if (r >= 9.5) { fullStars = 5 }
  else if (r >= 8.5) { fullStars = 4; halfStar = true }
  else if (r >= 7.5) { fullStars = 4 }
  else if (r >= 6.5) { fullStars = 3; halfStar = true }
  else if (r >= 5.5) { fullStars = 3 }
  else if (r >= 4.5) { fullStars = 2; halfStar = true }
  else if (r >= 3.5) { fullStars = 2 }
  else if (r >= 2.5) { fullStars = 1; halfStar = true }
  else if (r >= 1.5) { fullStars = 1 }
  else { fullStars = 0 }

  const stars = []
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) stars.push('full')
    else if (i === fullStars && halfStar) stars.push('half')
    else stars.push('empty')
  }
  return stars
}
