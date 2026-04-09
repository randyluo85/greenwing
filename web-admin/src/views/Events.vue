<template>
  <div>
    <div class="top-bar">
      <div style="display:flex;gap:8px;">
        <div v-for="tab in tabs" :key="tab.key" :class="['tab-btn', { active: activeTab === tab.key }]" @click="activeTab = tab.key">
          {{ tab.label }} ({{ tab.count }})
        </div>
      </div>
      <el-button type="primary" @click="openCreate">+ 创建活动</el-button>
    </div>
    <div class="event-list" v-if="filteredEvents.length">
      <div v-for="evt in filteredEvents" :key="evt.id" :class="['event-card', { draft: evt.status === 'draft' }]" :style="{ borderLeftColor: borderColor(evt) }">
        <div class="event-cover">封面图</div>
        <div class="event-info">
          <div class="event-header">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="event-title">{{ evt.title }}</span>
              <el-tag :type="statusType(evt.status)" size="small">{{ statusLabel(evt.status) }}</el-tag>
              <el-tag :type="modeType(evt.registration_mode)" size="small">{{ modeLabel(evt) }}</el-tag>
            </div>
            <div class="event-actions">
              <span class="action-link primary" @click="openRegistration(evt)">报名名单</span>
              <span class="action-link" @click="openEdit(evt)">编辑</span>
              <el-popconfirm v-if="evt.status === 'draft'" :title="'确认删除活动「' + evt.title + '」？'" @confirm="onDelete(evt)">
                <template #reference>
                  <span class="action-link danger">删除</span>
                </template>
              </el-popconfirm>
            </div>
          </div>
          <div class="event-meta">
            <span v-if="evt.event_time">{{ formatDateTime(evt.event_time) }}</span>
            <span v-if="evt.location">{{ evt.location }}</span>
            <span v-if="evt.speaker">主讲: {{ evt.speaker }}</span>
            <span>报名: <b :style="{ color: evt.enrolled_count > evt.quota ? '#EF5350' : '#00897B' }">{{ evt.enrolled_count }}/{{ evt.quota }}</b></span>
            <span v-if="evt.registration_mode === 'paid'">收入: <b>{{ formatMoney(evt.price * evt.enrolled_count) }}</b></span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <div style="font-size:13px;color: var(--color-text-secondary);">暂无活动</div>
      <div style="font-size:11px;color: var(--color-text-tertiary);margin-top:4px;">点击「创建活动」添加新活动</div>
    </div>
    <EventDrawer v-model="drawerVisible" :event="selectedEvent" @submit="onDrawerSubmit" />
    <RegistrationDrawer v-model="regVisible" :event="selectedEvent" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { mockEvents } from '../mock/events'
import { formatDateTime, formatMoney } from '../utils/format'
import EventDrawer from '../components/EventDrawer.vue'
import RegistrationDrawer from '../components/RegistrationDrawer.vue'

const activeTab = ref('all')
const drawerVisible = ref(false)
const regVisible = ref(false)
const selectedEvent = ref(null)

const tabs = computed(() => {
  const all = mockEvents.length
  const p = mockEvents.filter(e => e.status === 'published').length
  const d = mockEvents.filter(e => e.status === 'draft').length
  const e = mockEvents.filter(ev => ev.status === 'ended').length
  return [
    { key: 'all', label: '全部', count: all },
    { key: 'published', label: '已发布', count: p },
    { key: 'draft', label: '草稿', count: d },
    { key: 'ended', label: '已结束', count: e }
  ]
})

const filteredEvents = computed(() => {
  if (activeTab.value === 'all') return mockEvents
  return mockEvents.filter(e => e.status === activeTab.value)
})

function borderColor(evt) { return evt.status === 'published' ? '#00897B' : evt.status === 'draft' ? '#d1d5db' : '#9ca3af' }
function statusType(s) { return s === 'published' ? 'success' : s === 'draft' ? 'info' : 'info' }
function statusLabel(s) { return { published: '已发布', draft: '草稿', ended: '已结束' }[s] || s }
function modeType(m) { return m === 'free' ? 'success' : m === 'points_only' ? 'warning' : 'danger' }
function modeLabel(evt) {
  if (evt.registration_mode === 'points_only') return '积分'
  if (evt.registration_mode === 'paid') return '付费 ' + formatMoney(evt.price)
  return '免费'
}

function openCreate() { selectedEvent.value = null; drawerVisible.value = true }
function openEdit(evt) { selectedEvent.value = evt; drawerVisible.value = true }
function openRegistration(evt) { selectedEvent.value = evt; regVisible.value = true }
function onDrawerSubmit() { ElMessage.success('活动已保存') }
function onDelete() { ElMessage.success('活动已删除') }
</script>

<style scoped>
/* tab-btn, action-link inherited from theme.css */
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-4); }
.event-list { display: flex; flex-direction: column; gap: var(--sp-3); }
.event-card { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--sp-4); display: flex; gap: var(--sp-4); border-left: 4px solid; transition: box-shadow 0.2s ease; }
.event-card:not(.draft):hover { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08); }
.event-card.draft { opacity: 0.7; }
.event-cover { width: 100px; height: 70px; background: var(--color-primary-light); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-primary); font-size: var(--fs-sm); flex-shrink: 0; }
.event-info { flex: 1; min-width: 0; }
.event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: var(--sp-2); }
.event-title { font-weight: 600; color: var(--color-text-primary); font-size: var(--fs-md); }
.event-actions { display: flex; gap: var(--sp-2); }
.event-meta { display: flex; gap: var(--sp-4); color: var(--color-text-secondary); font-size: var(--fs-sm); flex-wrap: wrap; }
</style>
