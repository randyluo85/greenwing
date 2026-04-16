<template>
  <div>
    <el-tabs v-model="activeTab">
      <!-- 轮播管理 -->
      <el-tab-pane label="轮播管理" name="banners">
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
          <el-button type="primary" @click="openBannerDrawer()">+ 添加轮播</el-button>
        </div>
        <div class="banner-list" v-if="banners.length">
          <div v-for="(b, i) in banners" :key="b._id" :class="['banner-row', { offline: b.status === 'offline' }]">
            <span class="banner-idx">{{ i + 1 }}</span>
            <div class="banner-thumb">
              <img v-if="b.image_url" :src="b._httpUrl || b.image_url" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />
              <span v-else>轮播图片</span>
            </div>
            <div class="banner-info">
              <div class="banner-title">{{ b.title || '无标题' }}</div>
              <div class="banner-subtitle-admin" v-if="b.subtitle">{{ b.subtitle }}</div>
              <div class="banner-url">
                <el-tag size="small" type="info" v-if="b.redirect_type">{{ redirectTypeLabel(b.redirect_type) }}</el-tag>
                {{ b.redirect_url || '无跳转' }}
              </div>
            </div>
            <div class="banner-actions">
              <el-tag :type="b.status === 'online' ? 'success' : 'info'" size="small">{{ b.status === 'online' ? '已上线' : '已下线' }}</el-tag>
              <span class="action-link" @click="openBannerDrawer(b)">编辑</span>
              <span v-if="b.status === 'online'" class="action-link danger" @click="toggleBanner(b, 'offline')">下线</span>
              <template v-else>
                <span class="action-link primary" @click="toggleBanner(b, 'online')">上线</span>
                <span class="action-link danger" @click="deleteBanner(b)">删除</span>
              </template>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div style="font-size:13px;color: var(--color-text-secondary);">暂无轮播内容</div>
        </div>
      </el-tab-pane>

      <!-- 推荐图书 -->
      <el-tab-pane label="推荐图书" name="books">
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
          <el-button type="primary" @click="openBookDrawer()">+ 添加图书</el-button>
        </div>
        <div class="book-grid" v-if="books.length">
          <div v-for="book in books" :key="book._id" class="book-card">
            <div class="book-cover">
              <img v-if="book._httpUrl" :src="book._httpUrl" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />
              <span v-else>封面</span>
              <span v-if="book.rating" class="book-rating-badge">{{ book.rating }}</span>
            </div>
            <div class="book-info">
              <div class="book-title">{{ book.title }}</div>
              <div class="book-author">{{ book.author }}</div>
              <div class="book-desc">{{ book.description }}</div>
              <div class="book-actions">
                <span class="action-link" @click="openBookDrawer(book)">编辑</span>
                <span class="action-link danger" @click="deleteBook(book)">删除</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div style="font-size:13px;color: var(--color-text-secondary);">暂无推荐图书</div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Banner 编辑抽屉 -->
    <el-drawer v-model="drawerVisible" :title="editingBanner ? '编辑轮播' : '添加轮播'" size="420px" :before-close="closeDrawer">
      <el-form :model="bannerForm" label-width="80px" style="padding:0 16px;">
        <el-form-item label="主标题" required>
          <el-input v-model="bannerForm.title" placeholder="例: 世界读书日特别活动" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="bannerForm.subtitle" placeholder="例: 4月23日 诚邀书友共赴文学盛宴" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="图片">
          <div class="upload-placeholder" @click="handleImageUpload">
            <img v-if="bannerFormImageUrl" :src="bannerFormImageUrl" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />
            <span v-else>+ 上传图片</span>
          </div>
        </el-form-item>
        <el-form-item label="跳转类型">
          <el-select v-model="bannerForm.redirect_type" placeholder="选择跳转类型" clearable style="width:100%;">
            <el-option label="活动页" value="event" />
            <el-option label="文章页" value="article" />
            <el-option label="自定义页面" value="page" />
          </el-select>
        </el-form-item>
        <el-form-item label="跳转地址">
          <el-input v-model="bannerForm.redirect_url" placeholder="/pages/event-detail/event-detail?id=xxx" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="bannerForm.sort_order" :min="0" :max="99" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="bannerForm.statusOnline" active-text="上线" inactive-text="下线" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDrawer">取消</el-button>
        <el-button type="primary" @click="submitBanner">{{ editingBanner ? '更新' : '发布' }}</el-button>
      </template>
    </el-drawer>

    <!-- Book 编辑抽屉 -->
    <el-drawer v-model="bookDrawerVisible" :title="editingBook ? '编辑图书' : '添加图书'" size="420px">
      <el-form :model="bookForm" label-width="80px" style="padding:0 16px;">
        <el-form-item label="书名" required>
          <el-input v-model="bookForm.title" placeholder="书名" />
        </el-form-item>
        <el-form-item label="作者" required>
          <el-input v-model="bookForm.author" placeholder="作者" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="bookForm.description" type="textarea" :rows="4" placeholder="图书简介" />
        </el-form-item>
        <el-form-item label="封面">
          <div class="upload-placeholder" @click="handleBookCoverUpload">
            <img v-if="bookFormImageUrl" :src="bookFormImageUrl" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />
            <span v-else>+ 上传封面</span>
          </div>
        </el-form-item>
        <el-form-item label="评分">
          <el-input-number v-model="bookForm.rating" :min="1" :max="10" :step="1" :precision="0" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="bookForm.sort_order" :min="0" :max="99" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="bookForm.statusPublished" active-text="上架" inactive-text="下架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bookDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBook">{{ editingBook ? '更新' : '添加' }}</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { callFunction, uploadFile, getTempFileURL } from '../utils/cloud'

const activeTab = ref('banners')
const banners = ref([])
const books = ref([])

// Banner drawer
const drawerVisible = ref(false)
const editingBanner = ref(null)
const bannerForm = reactive({ title: '', subtitle: '', image_url: '', redirect_type: '', redirect_url: '', sort_order: 1, statusOnline: true })

// Book drawer
const bookDrawerVisible = ref(false)
const editingBook = ref(null)
const bookForm = reactive({ title: '', author: '', description: '', cover_image: '', rating: 5, sort_order: 1, statusPublished: true })

const bannerFormImageUrl = ref('')
const bookFormImageUrl = ref('')

function redirectTypeLabel(type) { return { event: '活动', article: '文章', page: '页面' }[type] || type || '' }

async function loadBanners() {
  try {
    const res = await callFunction('admin', { action: 'manageContent', type: 'banner', method: 'list' })
    const list = res.data || []
    const fileIDs = list.map(b => b.image_url).filter(u => u && u.startsWith('cloud://'))
    if (fileIDs.length) {
      const urls = await getTempFileURL(fileIDs)
      const urlMap = Object.fromEntries(urls.map(u => [u.fileID, u.tempFileURL]))
      list.forEach(b => { if (b.image_url) b._httpUrl = urlMap[b.image_url] || b.image_url })
    }
    banners.value = list
  } catch (e) { /* ignore */ }
}

async function loadBooks() {
  try {
    const res = await callFunction('admin', { action: 'manageContent', type: 'book', method: 'list' })
    const list = res.data || []
    const fileIDs = list.map(b => b.cover_image).filter(u => u && u.startsWith('cloud://'))
    if (fileIDs.length) {
      const urls = await getTempFileURL(fileIDs)
      const urlMap = Object.fromEntries(urls.map(u => [u.fileID, u.tempFileURL]))
      list.forEach(b => { if (b.cover_image) b._httpUrl = urlMap[b.cover_image] || b.cover_image })
    }
    books.value = list
  } catch (e) { /* ignore */ }
}

async function openBannerDrawer(banner = null) {
  editingBanner.value = banner
  if (banner) {
    Object.assign(bannerForm, {
      title: banner.title || '', subtitle: banner.subtitle || '', image_url: banner.image_url || '',
      redirect_type: banner.redirect_type || '', redirect_url: banner.redirect_url || '',
      sort_order: banner.sort_order || 1, statusOnline: banner.status === 'online'
    })
    const url = banner.image_url || ''
    if (url.startsWith('cloud://')) {
      const urls = await getTempFileURL([url])
      bannerFormImageUrl.value = urls[0]?.tempFileURL || url
    } else {
      bannerFormImageUrl.value = url
    }
  } else {
    Object.assign(bannerForm, { title: '', subtitle: '', image_url: '', redirect_type: '', redirect_url: '', sort_order: banners.value.length + 1, statusOnline: true })
    bannerFormImageUrl.value = ''
  }
  drawerVisible.value = true
}

function closeDrawer() { drawerVisible.value = false; editingBanner.value = null }

async function submitBanner() {
  try {
    const data = {
      title: bannerForm.title, subtitle: bannerForm.subtitle, image_url: bannerForm.image_url,
      redirect_type: bannerForm.redirect_type, redirect_url: bannerForm.redirect_url,
      sort_order: bannerForm.sort_order, status: bannerForm.statusOnline ? 'online' : 'offline'
    }
    if (editingBanner.value) {
      await callFunction('admin', { action: 'manageContent', type: 'banner', method: 'update', id: editingBanner.value._id, data })
    } else {
      await callFunction('admin', { action: 'manageContent', type: 'banner', method: 'create', data })
    }
    ElMessage.success('保存成功')
    closeDrawer()
    loadBanners()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

async function toggleBanner(b, status) {
  try {
    await callFunction('admin', { action: 'manageContent', type: 'banner', method: 'update', id: b._id, data: { status } })
    loadBanners()
  } catch (err) { ElMessage.error(err.message) }
}

async function deleteBanner(b) {
  try {
    await callFunction('admin', { action: 'manageContent', type: 'banner', method: 'delete', id: b._id })
    ElMessage.success('已删除')
    loadBanners()
  } catch (err) { ElMessage.error(err.message) }
}

function handleImageUpload() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const safeName = file.name.replace(/[^\w.\-]/g, '_')
      const cloudPath = `banners/${Date.now()}_${safeName}`
      const fileID = await uploadFile(cloudPath, file)
      bannerForm.image_url = fileID
      const urls = await getTempFileURL([fileID])
      bannerFormImageUrl.value = urls[0]?.tempFileURL || fileID
    } catch (err) { ElMessage.error('上传失败') }
  }
  input.click()
}

// Book
async function openBookDrawer(book = null) {
  editingBook.value = book
  if (book) {
    Object.assign(bookForm, { title: book.title || '', author: book.author || '', description: book.description || '', cover_image: book.cover_image || '', rating: book.rating ?? 5, sort_order: book.sort_order ?? 1, statusPublished: book.status === 'published' })
    const url = book.cover_image || ''
    if (url.startsWith('cloud://')) {
      const urls = await getTempFileURL([url])
      bookFormImageUrl.value = urls[0]?.tempFileURL || url
    } else {
      bookFormImageUrl.value = url
    }
  } else {
    Object.assign(bookForm, { title: '', author: '', description: '', cover_image: '', rating: 5, sort_order: books.value.length + 1, statusPublished: true })
    bookFormImageUrl.value = ''
  }
  bookDrawerVisible.value = true
}

function handleBookCoverUpload() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const safeName = file.name.replace(/[^\w.\-]/g, '_')
      const cloudPath = `books/${Date.now()}_${safeName}`
      const fileID = await uploadFile(cloudPath, file)
      bookForm.cover_image = fileID
      const urls = await getTempFileURL([fileID])
      bookFormImageUrl.value = urls[0]?.tempFileURL || fileID
    } catch (err) { ElMessage.error('上传失败') }
  }
  input.click()
}

async function submitBook() {
  try {
    const data = { title: bookForm.title, author: bookForm.author, description: bookForm.description, cover_image: bookForm.cover_image, rating: bookForm.rating ?? 5, sort_order: bookForm.sort_order ?? 1, status: bookForm.statusPublished ? 'published' : 'draft' }
    if (editingBook.value) {
      await callFunction('admin', { action: 'manageContent', type: 'book', method: 'update', id: editingBook.value._id, data })
    } else {
      await callFunction('admin', { action: 'manageContent', type: 'book', method: 'create', data })
    }
    ElMessage.success('保存成功')
    bookDrawerVisible.value = false
    loadBooks()
  } catch (err) { ElMessage.error(err.message || '保存失败') }
}

async function deleteBook(book) {
  try {
    await callFunction('admin', { action: 'manageContent', type: 'book', method: 'delete', id: book._id })
    ElMessage.success('已删除')
    loadBooks()
  } catch (err) { ElMessage.error(err.message) }
}

onMounted(() => { loadBanners(); loadBooks() })
</script>

<style scoped>
.banner-list { display: flex; flex-direction: column; gap: 0; }
.banner-row { background: var(--color-surface); border-radius: var(--radius-lg); padding: 14px var(--sp-4); display: flex; align-items: center; gap: 14px; border-bottom: 1px solid var(--color-border-light); }
.banner-row:last-child { border-bottom: none; }
.banner-row.offline { opacity: 0.6; }
.banner-idx { color: var(--color-text-tertiary); font-size: var(--fs-lg); font-weight: 600; width: 20px; text-align: center; }
.banner-thumb { width: 120px; height: 48px; background: linear-gradient(135deg, var(--color-primary), var(--color-teal-600)); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: white; font-size: var(--fs-xs); flex-shrink: 0; overflow: hidden; }
.banner-info { flex: 1; min-width: 0; }
.banner-title { color: var(--color-text-primary); font-weight: 500; margin-bottom: 2px; }
.banner-subtitle-admin { color: var(--color-text-secondary); font-size: var(--fs-sm); margin-bottom: 2px; }
.banner-url { color: var(--color-text-secondary); font-size: var(--fs-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
.banner-actions { display: flex; align-items: center; gap: var(--sp-2); flex-shrink: 0; }
.book-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-3); }
.book-card { background: var(--color-surface); border-radius: var(--radius-lg); padding: 14px; display: flex; gap: var(--sp-3); }
.book-cover { width: 50px; height: 66px; background: var(--color-primary-light); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: var(--color-primary); font-size: 9px; flex-shrink: 0; position: relative; overflow: hidden; }
.book-rating-badge { position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.55); color: #fff; font-size: 9px; padding: 1px 4px; border-radius: 0 0 0 4px; font-weight: 500; }
.book-info { flex: 1; min-width: 0; }
.book-title { color: var(--color-text-primary); font-weight: 500; font-size: var(--fs-base); margin-bottom: 2px; }
.book-author { color: var(--color-text-secondary); font-size: var(--fs-xs); margin-bottom: 6px; }
.book-desc { color: var(--color-text-tertiary); font-size: var(--fs-xs); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.book-actions { margin-top: 6px; display: flex; gap: 6px; }
.upload-placeholder { width: 100%; height: 120px; background: var(--color-surface); border: 2px dashed var(--color-border); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--color-text-tertiary); font-size: 13px; overflow: hidden; }
</style>
