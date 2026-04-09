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
    <div class="event-list">
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
              <span v-if="evt.status === 'draft'" class="action-link danger" @click="onDelete(evt)">删除</span>
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
    <EventDrawer v-model="drawerVisible" :event="selectedEvent" @submit="onDrawerSubmit" />
    <RegistrationDrawer v-model="regVisible" :event="selectedEvent" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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
function onDrawerSubmit() {}
function onDelete() {}
</script>

<style scoped>
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.tab-btn { background: white; color: #374151; padding: 6px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.tab-btn.active { background: #00897B; color: white; font-weight: 500; }
.event-list { display: flex; flex-direction: column; gap: 12px; }
.event-card { background: white; border-radius: 8px; padding: 16px; display: flex; gap: 16px; border-left: 4px solid; }
.event-card.draft { opacity: 0.7; }
.event-cover { width: 100px; height: 70px; background: #e0f2f1; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #00897B; font-size: 11px; flex-shrink: 0; }
.event-info { flex: 1; min-width: 0; }
.event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px; }
.event-title { font-weight: 600; color: #1f2937; font-size: 13px; }
.event-actions { display: flex; gap: 8px; }
.action-link { font-size: 11px; cursor: pointer; color: #374151; }
.action-link.primary { color: #00897B; }
.action-link.danger { color: #EF5350; }
.event-meta { display: flex; gap: 16px; color: #6b7280; font-size: 11px; flex-wrap: wrap; }
</style>
