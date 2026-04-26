<template>
  <div class="events-page">
    <!-- 顶部操作栏 -->
    <div class="top-bar">
      <div class="tabs-wrapper">
        <div class="tabs-container">
          <div
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-item', { active: activeTab === tab.key }]"
            @click="switchTab(tab.key)"
          >
            <span class="tab-label">{{ tab.label }}</span>
            <StatusBadge
              :type="getTabBadgeType(tab.key)"
              :text="tab.count !== undefined ? tab.count.toString() : '0'"
              size="small"
            />
          </div>
        </div>
      </div>
      <el-button type="warning" @click="runDataMigration">
        <i class="fa-solid fa-wrench"></i>
        修复旧数据 (结束时间)
      </el-button>
      <el-button type="primary" @click="openCreate">
        <i class="fa-solid fa-plus"></i>
        创建活动
      </el-button>
    </div>

    <!-- 活动列表 -->
    <BaseCard :shadow="'sm'">
      <BaseTable
        :data="filteredEvents"
        :columns="eventColumns"
        :loading="loading"
        :striped="true"
        :border="true"
        emptyText="暂无活动数据"
        :actionsWidth="320"
      >
        <!-- 活动标题 -->
        <template #title="{ row }">
          <div class="event-title-cell">
            <div class="event-title">{{ row.title }}</div>
            <StatusBadge
              :type="getModeType(row)"
              :text="getModeLabel(row)"
              size="small"
            />
          </div>
        </template>

        <!-- 活动时间 -->
        <template #event_time="{ row }">
          <span v-if="row.event_time">{{ formatEventTimeRange(row.event_time, row.event_end_time) }}</span>
          <span v-else class="text-muted">-</span>
        </template>

        <!-- 地点 -->
        <template #location="{ row }">
          <span v-if="row.location">{{ row.location }}</span>
          <span v-else class="text-muted">-</span>
        </template>

        <!-- 报名情况 -->
        <template #enrollment="{ row }">
          <div class="enrollment-cell">
            <div class="enrollment-count">
              <b>{{ row.enrolled_count || 0 }}</b> / {{ row.quota || '-' }}
            </div>
            <el-progress
              :percentage="calculateProgress(row)"
              :color="getProgressColor(row)"
              :stroke-width="4"
              :show-text="false"
            />
          </div>
        </template>

        <!-- 状态 -->
        <template #status="{ row }">
          <StatusBadge
            :type="getStatusType(getComputedStatus(row))"
            :text="getStatusLabel(getComputedStatus(row))"
            size="small"
          />
        </template>

        <!-- 操作 -->
        <template #actions="{ row }">
          <el-button
            link
            type="primary"
            @click="openRegistration(row)"
          >
            <i class="fa-solid fa-users"></i>
            报名名单
          </el-button>
          <el-button
            link
            type="primary"
            @click="openEdit(row)"
          >
            <i class="fa-solid fa-pen"></i>
            编辑
          </el-button>
          <el-popconfirm
            :title="getDeleteConfirmTitle(row)"
            @confirm="onDelete(row)"
          >
            <template #reference>
              <el-button
                link
                :type="getDeleteButtonType(row)"
              >
                <i :class="getDeleteButtonIcon(row)"></i>
                {{ getDeleteButtonText(row) }}
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </BaseTable>
    </BaseCard>

    <!-- 活动编辑抽屉 -->
    <EventDrawer
      v-model="drawerVisible"
      :event="selectedEvent"
      @submit="onDrawerSubmit"
    />

    <!-- 报名名单抽屉 -->
    <RegistrationDrawer
      v-model="regVisible"
      :event="selectedEvent"
    />
  </div>
</template>

<script setup>
/**
 * Events - 活动管理页面
 *
 * 功能特性：
 * - 活动卡片展示
 * - Tab 切换不同状态
 * - 创建/编辑活动
 * - 查看报名名单
 * - 响应式 Grid 布局
 */

import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import BaseCard from '@/components/BaseCard.vue'
import BaseTable from '@/components/BaseTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import EventDrawer from '@/components/EventDrawer.vue'
import RegistrationDrawer from '@/components/RegistrationDrawer.vue'
import { callFunction } from '@/utils/cloud'
import { formatDateTime, formatMoney, formatEventTimeRange } from '@/utils/format'

// 状态管理
const loading = ref(false)
const allEvents = ref([])
const activeTab = ref('all')
const drawerVisible = ref(false)
const regVisible = ref(false)
const selectedEvent = ref(undefined)

// 监听抽屉关闭，清理选中状态
watch(drawerVisible, (newValue) => {
  if (!newValue) {
    // 抽屉关闭时延迟清理，避免影响关闭动画
    setTimeout(() => {
      selectedEvent.value = undefined
    }, 300)
  }
})

// 获取活动的计算状态 (根据时间自动判断已结束)
function getComputedStatus(evt) {
  if (evt.status === 'published' && evt.event_end_time) {
    const endTime = new Date(evt.event_end_time).getTime()
    if (Date.now() > endTime) {
      return 'ended'
    }
  }
  return evt.status
}

// Tab 配置
const tabs = computed(() => {
  const all = allEvents.value.length
  const published = allEvents.value.filter(e => getComputedStatus(e) === 'published').length
  const draft = allEvents.value.filter(e => getComputedStatus(e) === 'draft').length
  const ended = allEvents.value.filter(e => getComputedStatus(e) === 'ended').length

  return [
    { key: 'all', label: '全部', count: all },
    { key: 'published', label: '已发布', count: published },
    { key: 'draft', label: '草稿', count: draft },
    { key: 'ended', label: '已结束', count: ended }
  ]
})

// 表格列配置
const eventColumns = computed(() => [
  {
    prop: '_id',
    label: '活动ID',
    width: 110,
    formatter: (row) => row._id ? row._id.substring(0, 8) : '-'
  },
  {
    prop: 'title',
    label: '活动名称',
    minWidth: 200,
    slot: 'title'
  },
  {
    prop: 'event_time',
    label: '活动时间',
    minWidth: 280,
    slot: 'event_time'
  },
  {
    prop: 'location',
    label: '地点',
    width: 140,
    slot: 'location'
  },

  {
    prop: 'enrollment',
    label: '报名情况',
    width: 140,
    slot: 'enrollment'
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    slot: 'status'
  }
])

// 过滤后的活动列表
const filteredEvents = computed(() => {
  let events = allEvents.value

  // 在"全部"标签页时应用特殊排序规则
  if (activeTab.value === 'all') {
    const now = Date.now()
    const notEnded = []
    const ended = []

    // 分组：未结束 vs 已结束
    events.forEach(e => {
      const status = getComputedStatus(e)
      if (status === 'ended') {
        ended.push(e)
      } else {
        notEnded.push(e)
      }
    })

    // 未结束活动按时间升序（最近的在前）
    notEnded.sort((a, b) => {
      const timeA = a.event_time ? new Date(a.event_time).getTime() : 0
      const timeB = b.event_time ? new Date(b.event_time).getTime() : 0
      return timeA - timeB
    })

    // 已结束活动按时间降序（最近的在前）
    ended.sort((a, b) => {
      const timeA = a.event_end_time ? new Date(a.event_end_time).getTime() : 0
      const timeB = b.event_end_time ? new Date(b.event_end_time).getTime() : 0
      return timeB - timeA
    })

    // 未结束在前，已结束在后
    return [...notEnded, ...ended]
  }

  // 其他标签页保持原有过滤逻辑
  return events.filter(e => getComputedStatus(e) === activeTab.value)
})

// 切换 Tab
function switchTab(key) {
  activeTab.value = key
}

// 获取状态类型
function getStatusType(status) {
  const types = {
    published: 'success',
    draft: 'info',
    ended: 'info'
  }
  return types[status] || 'info'
}

// 获取 Tab 徽章类型
function getTabBadgeType(key) {
  const types = {
    all: 'info',
    published: 'success',
    draft: 'warning',
    ended: 'info'
  }
  return types[key] || 'info'
}

// 获取状态标签
function getStatusLabel(status) {
  if (!status) return '未知'
  const labels = {
    published: '已发布',
    draft: '草稿',
    ended: '已结束'
  }
  return labels[status] || '未知'
}

// 获取报名模式类型
function getModeType(evt) {
  if (evt.registration_mode === 'free') return 'success'
  if (evt.registration_mode === 'points_only') return 'warning'
  return 'danger'
}

// 获取报名模式标签
function getModeLabel(evt) {
  if (evt.registration_mode === 'points_only') return '积分'
  if (evt.registration_mode === 'paid') return `付费 ${formatMoney(evt.price)}`
  return '免费'
}

// 计算报名进度百分比
function calculateProgress(evt) {
  const percentage = Math.round(
    ((evt.enrolled_count || 0) / (evt.quota || 1)) * 100
  )
  return Math.min(100, percentage)
}

// 获取进度颜色
function getProgressColor(evt) {
  const pct = (evt.enrolled_count || 0) / (evt.quota || 1)
  if (pct >= 1) return '#ef4444'
  if (pct >= 0.8) return '#f59e0b'
  return '#14b8a6'
}

// 加载活动列表
async function loadEvents() {
  loading.value = true
  try {
    const res = await callFunction('admin', {
      action: 'getEvents',
      pageSize: 100
    })
    allEvents.value = res.data.list || []
  } catch (err) {
    ElMessage.error(err.message || '加载活动失败')
  } finally {
    loading.value = false
  }
}

// 打开创建活动
function openCreate() {
  selectedEvent.value = undefined
  drawerVisible.value = true
}

// 数据修复: 为历史活动回填结束时间
async function runDataMigration() {
  try {
    loading.value = true
    let totalFixed = 0
    let page = 1
    const pageSize = 50
    let hasMore = true
    
    while(hasMore) {
      const res = await callFunction('admin', {
        action: 'getEvents',
        page,
        pageSize
      })
      const events = res.data.list || []
      hasMore = res.data.hasMore
      
      for (const evt of events) {
        if (!evt.event_end_time && evt.event_time) {
          const startDate = new Date(evt.event_time)
          const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
          const pad = (n) => n < 10 ? '0' + n : n
          const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())} ${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`
          
          await callFunction('admin', {
            action: 'manageEvent',
            method: 'update',
            eventId: evt._id,
            data: {
              ...evt,
              event_end_time: endStr
            }
          })
          totalFixed++
        }
      }
      page++
    }
    ElMessage.success(`修复完成，共更新 ${totalFixed} 条数据！`)
    loadEvents()
  } catch (err) {
    ElMessage.error(err.message || '修复失败')
  } finally {
    loading.value = false
  }
}


// 打开编辑活动
function openEdit(evt) {
  selectedEvent.value = evt
  drawerVisible.value = true
}

// 打开报名名单
function openRegistration(evt) {
  selectedEvent.value = evt
  regVisible.value = true
}

// 处理抽屉提交
async function onDrawerSubmit(data) {
  try {
    const method = data._id ? 'update' : 'create'
    const params = {
      action: 'manageEvent',
      method,
      data
    }
    if (data._id) {
      params.eventId = data._id
    }
    await callFunction('admin', params)
    ElMessage.success('活动已保存')
    drawerVisible.value = false
    selectedEvent.value = undefined  // 清理选中状态
    loadEvents()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

// 处理删除
async function onDelete(evt) {
  try {
    const res = await callFunction('admin', {
      action: 'manageEvent',
      method: 'delete',
      eventId: evt._id
    })
    ElMessage.success(res.message || '操作成功')
    loadEvents()
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
}

// 获取删除按钮类型
function getDeleteButtonType(row) {
  // 有报名记录的已发布活动用警告色
  if (row.status === 'published' && (row.enrolled_count || 0) > 0) {
    return 'warning'
  }
  return 'danger'
}

// 获取删除按钮图标
function getDeleteButtonIcon(row) {
  if (row.status === 'published' && (row.enrolled_count || 0) > 0) {
    return 'fa-solid fa-arrow-down-from-line'
  }
  return 'fa-solid fa-trash'
}

// 获取删除按钮文字
function getDeleteButtonText(row) {
  if (row.status === 'draft') {
    return '删除'
  }
  if ((row.enrolled_count || 0) > 0) {
    return '下架'
  }
  return '删除'
}

// 获取删除确认标题
function getDeleteConfirmTitle(row) {
  if (row.status === 'draft') {
    return `确认删除草稿「${row.title}」？删除后无法恢复。`
  }
  if ((row.enrolled_count || 0) > 0) {
    return `活动「${row.title}」已有 ${row.enrolled_count} 人报名，确认下架？下架后转为草稿，报名记录保留。`
  }
  return `确认删除活动「${row.title}」？删除后无法恢复。`
}

onMounted(loadEvents)
</script>

<style scoped>
.events-page {
  max-width: var(--container-max-width);
  margin: 0 auto;
}

/* 顶部操作栏 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-5);
  flex-wrap: wrap;
  gap: var(--sp-3);
}

/* Tab 样式 */
.tabs-wrapper {
  flex: 1;
  min-width: 0;
}

.tabs-container {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.tab-item:hover {
  background: var(--color-fill-light);
  border-color: var(--color-border);
}

.tab-item.active {
  background: var(--color-primary);
  color: white;
  font-weight: 500;
  border-color: var(--color-primary);
}

.tab-label {
  white-space: nowrap;
}

/* 表格单元格样式 */
.event-title-cell {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  white-space: nowrap;
}

.event-title {
  font-weight: 500;
  color: var(--color-text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.enrollment-cell {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.enrollment-count {
  font-size: var(--fs-sm);
  color: var(--color-text-primary);
}

.enrollment-count b {
  font-weight: 600;
}

.text-muted {
  color: var(--color-text-tertiary);
}

/* 确保操作按钮不换行也不截断 */
:deep(.actions-column) .cell {
  overflow: visible !important;
  white-space: nowrap !important;
  display: flex !important;
  justify-content: center;
  gap: 8px;
}

/* 响应式调整 */
@media (max-width: 767px) {
  .top-bar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--sp-3);
  }

  .tabs-container {
    width: 100%;
    overflow-x: auto;
  }

  .tab-item {
    flex: 1 0 auto;
    justify-content: center;
    min-width: 80px;
  }
}
</style>
