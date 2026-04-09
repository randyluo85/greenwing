<template>
  <div>
    <el-tabs v-model="activeTab">
      <!-- 轮播管理 -->
      <el-tab-pane label="轮播管理" name="banners">
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
          <el-button type="primary">+ 添加轮播</el-button>
        </div>
        <div class="banner-list">
          <div v-for="(b, i) in mockBanners" :key="b.id" :class="['banner-row', { offline: b.status === 'offline' }]">
            <span class="banner-idx">{{ i + 1 }}</span>
            <div class="banner-thumb">轮播图片</div>
            <div class="banner-info">
              <div class="banner-title">{{ b.title }}</div>
              <div class="banner-url">{{ b.redirect_url || '无跳转' }}</div>
            </div>
            <div class="banner-actions">
              <el-tag :type="b.status === 'online' ? 'success' : 'info'" size="small">{{ b.status === 'online' ? '已上线' : '已下线' }}</el-tag>
              <span class="icon-btn" @click="moveUp(i, b)">↑</span>
              <span class="icon-btn" @click="moveDown(i, b)">↓</span>
              <span class="action-link">编辑</span>
              <span v-if="b.status === 'online'" class="action-link danger" @click="toggleBanner(b)">下线</span>
              <template v-else>
                <span class="action-link primary" @click="toggleBanner(b)">上线</span>
                <span class="action-link danger">删除</span>
              </template>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 推荐图书 -->
      <el-tab-pane label="推荐图书" name="books">
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
          <el-button type="primary">+ 添加图书</el-button>
        </div>
        <div class="book-grid">
          <div v-for="book in mockBooks" :key="book.id" class="book-card">
            <div class="book-cover">封面</div>
            <div class="book-info">
              <div class="book-title">{{ book.title }}</div>
              <div class="book-author">{{ book.author }}</div>
              <div class="book-desc">{{ book.description }}</div>
              <div class="book-actions">
                <span class="action-link">编辑</span>
                <span class="action-link danger">删除</span>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { mockBanners } from '../mock/banners'
import { mockBooks } from '../mock/books'

const activeTab = ref('banners')
const banners = ref([...mockBanners])

function moveUp(i) { if (i > 0) { const list = banners.value; [list[i], list[i-1]] = [list[i-1], list[i]] } }
function moveDown(i) { if (i < banners.value.length - 1) { const list = banners.value; [list[i], list[i+1]] = [list[i+1], list[i]] } }
function toggleBanner(b) { b.status = b.status === 'online' ? 'offline' : 'online' }
</script>

<style scoped>
.banner-list { display: flex; flex-direction: column; gap: 0; }
.banner-row { background: white; border-radius: 8px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; border-bottom: 1px solid #f3f4f6; }
.banner-row:last-child { border-bottom: none; }
.banner-row.offline { opacity: 0.6; }
.banner-idx { color: #9ca3af; font-size: 14px; font-weight: 600; width: 20px; text-align: center; }
.banner-thumb { width: 120px; height: 48px; background: linear-gradient(135deg, #00897B, #26A69A); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; flex-shrink: 0; }
.banner-info { flex: 1; min-width: 0; }
.banner-title { color: #1f2937; font-weight: 500; margin-bottom: 2px; }
.banner-url { color: #6b7280; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.banner-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.icon-btn { color: #9ca3af; cursor: pointer; font-size: 14px; }
.action-link { font-size: 11px; cursor: pointer; color: #374151; }
.action-link.primary { color: #00897B; }
.action-link.danger { color: #EF5350; }
.book-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.book-card { background: white; border-radius: 8px; padding: 14px; display: flex; gap: 12px; }
.book-cover { width: 50px; height: 66px; background: #e0f2f1; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #00897B; font-size: 9px; flex-shrink: 0; }
.book-info { flex: 1; min-width: 0; }
.book-title { color: #1f2937; font-weight: 500; font-size: 12px; margin-bottom: 2px; }
.book-author { color: #6b7280; font-size: 10px; margin-bottom: 6px; }
.book-desc { color: #9ca3af; font-size: 10px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.book-actions { margin-top: 6px; display: flex; gap: 6px; }
</style>
