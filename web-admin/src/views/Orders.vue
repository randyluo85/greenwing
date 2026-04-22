<template>
  <div class="orders-page">
    <!-- 状态 Tab -->
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
            :text="tab.count.toString()"
            size="small"
          />
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <FilterBar
      :filters="orderFilters"
      searchPlaceholder="搜索订单号"
      :showResultCount="true"
      :resultCount="total"
      @filter-change="handleFilterChange"
      @search="handleSearch"
      @clear-all="handleClearAll"
    >
      <template #extra-actions>
        <el-button
          @click="handleExport"
        >
          <i class="fa-solid fa-download"></i>
          导出
        </el-button>
      </template>
    </FilterBar>

    <!-- 订单表格 -->
    <BaseCard :shadow="'sm'">
      <BaseTable
        :data="orders"
        :columns="orderColumns"
        :loading="loading"
        :pagination="paginationConfig"
        :striped="true"
        :border="true"
        emptyText="暂无订单数据"
        :actionsWidth="180"
        @page-change="handlePageChange"
        @size-change="handleSizeChange"
      >
        <!-- 订单号列 -->
        <template #order_no="{ row }">
          <span class="order-no">{{ row.order_no }}</span>
        </template>



        <!-- 用户信息列 -->
        <template #user_info="{ row }">
          <div class="user-info">
            <div class="user-name">{{ row.user?.nickname || row.user?.real_name || '-' }}</div>
            <div class="real-name" v-if="row.user?.real_name && row.user?.real_name !== row.user?.nickname">
              真名：{{ row.user?.real_name }}
            </div>
          </div>
        </template>

        <!-- 手机号列 -->
        <template #phone="{ row }">
          <span class="phone">{{ row.user?.phone || '-' }}</span>
        </template>

        <!-- 活动列 -->
        <template #event="{ row }">
          <span class="event-title" :title="row.event?.title || '-'">{{ row.event?.title || '-' }}</span>
        </template>

        <!-- 金额列 -->
        <template #amount="{ row }">
          <span class="amount">{{ formatMoney(row.amount) }}</span>
        </template>

        <!-- 状态列 -->
        <template #status="{ row }">
          <StatusBadge
            :type="getStatusType(row.status)"
            :text="getStatusLabel(row.status)"
            size="small"
          />
        </template>

        <!-- 支付时间列 -->
        <template #pay_time="{ row }">
          <span class="time">{{ formatDateTime(row.pay_time) }}</span>
        </template>

        <!-- 操作列 -->
        <template #actions="{ row }">
          <el-button link @click="openDetail(row)">
            详情
          </el-button>
        </template>
      </BaseTable>
    </BaseCard>


    <!-- 订单详情对话框 -->
    <OrderDetailDialog
      v-model="detailVisible"
      :order="selectedOrder"
    />
  </div>
</template>

<script setup>
/**
 * Orders - 订单管理页面
 *
 * 功能特性：
 * - Tab 切换不同状态订单
 * - 订单列表展示
 * - 搜索和筛选
 * - 退款审批
 * - 导出功能
 */

import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import BaseCard from '@/components/BaseCard.vue'
import BaseTable from '@/components/BaseTable.vue'
import FilterBar from '@/components/FilterBar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import OrderDetailDialog from '@/components/OrderDetailDialog.vue'
import { callFunction } from '@/utils/cloud'
import { formatMoney, formatDateTime } from '@/utils/format'

// 状态管理
const loading = ref(false)
const orders = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// Tab 和筛选状态
const activeTab = ref('all')
const search = ref('')
const dateRange = ref(null)

// 对话框状态
const detailVisible = ref(false)
const selectedOrder = ref(null)

// Tab 配置
const tabs = computed(() => {
  const all = total.value
  const statusCounts = {
    pending: 0,
    paid: 0,
    refunding: 0,
    refunded: 0,
    closed: 0
  }

  orders.value.forEach(o => {
    if (statusCounts[o.status] !== undefined) {
      statusCounts[o.status]++
    }
  })

  return [
    { key: 'all', label: '全部', count: all },
    { key: 'pending', label: '待支付', count: statusCounts.pending },
    { key: 'paid', label: '已支付', count: statusCounts.paid },
    { key: 'refunded', label: '已退款', count: statusCounts.refunded },
    { key: 'closed', label: '已关闭', count: statusCounts.closed }
  ]
})

// 筛选器配置
const orderFilters = computed(() => [
  {
    key: 'dateRange',
    type: 'date',
    placeholder: '选择日期范围',
    defaultValue: dateRange.value
  }
])

// 表格列配置
const orderColumns = computed(() => [
  {
    prop: 'order_no',
    label: '订单号',
    width: 120,
    slot: 'order_no',
    sortable: true
  },
  {
    prop: 'user_info',
    label: '用户',
    minWidth: 120,
    slot: 'user_info'
  },
  {
    prop: 'phone',
    label: '手机号',
    width: 130,
    slot: 'phone'
  },
  {
    prop: 'event',
    label: '活动',
    minWidth: 160,
    slot: 'event'
  },
  {
    prop: 'amount',
    label: '金额',
    width: 120,
    slot: 'amount',
    sortable: true
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    slot: 'status',
    sortable: true
  },
  {
    prop: 'pay_time',
    label: '支付时间',
    width: 160,
    slot: 'pay_time',
    sortable: true
  }
])

// 分页配置
const paginationConfig = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  total: total.value,
  pageSizes: [10, 20, 50, 100]
}))

// 切换 Tab
function switchTab(key) {
  activeTab.value = key
  page.value = 1
  loadOrders()
}

// 加载订单列表
async function loadOrders() {
  loading.value = true
  try {
    const params = {
      action: 'getOrders',
      page: page.value,
      pageSize: pageSize.value
    }

    if (activeTab.value !== 'all') {
      params.status = activeTab.value
    }
    if (search.value) {
      params.keyword = search.value
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res = await callFunction('admin', params)
    orders.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (err) {
    ElMessage.error(err.message || '加载订单失败')
  } finally {
    loading.value = false
  }
}

// 处理搜索
function handleSearch(value) {
  search.value = value
  page.value = 1
  loadOrders()
}

// 处理筛选变化
function handleFilterChange({ key, value }) {
  if (key === 'dateRange') {
    dateRange.value = value
  }
  page.value = 1
  loadOrders()
}

// 处理清空所有筛选
function handleClearAll() {
  search.value = ''
  dateRange.value = null
  activeTab.value = 'all'
  page.value = 1
  loadOrders()
}

// 处理页码变化
function handlePageChange(newPage) {
  page.value = newPage
  loadOrders()
}

// 处理每页数量变化
function handleSizeChange(newSize) {
  pageSize.value = newSize
  page.value = 1
  loadOrders()
}

// 获取 Tab 徽章类型
function getTabBadgeType(key) {
  const types = {
    all: 'info',
    pending: 'warning',
    paid: 'success',
    refunding: 'danger',
    refunded: 'info',
    closed: 'info'
  }
  return types[key] || 'info'
}

// 获取状态类型
function getStatusType(status) {
  const types = {
    pending: 'warning',
    paid: 'success',
    refunding: 'danger',
    refunded: 'info',
    closed: 'info'
  }
  return types[status] || 'info'
}

// 获取状态标签
function getStatusLabel(status) {
  const labels = {
    pending: '待支付',
    paid: '已支付',
    refunding: '待退款',
    refunded: '已退款',
    closed: '已关闭'
  }
  if (!status) return '未知'
  return labels[status] || String(status)
}

// 掩盖用户 ID（只显示后6位）
function maskUserId(userId) {
  if (!userId) return '-'
  return userId.slice(-6)
}

// 打开订单详情对话框
function openDetail(order) {
  selectedOrder.value = order
  detailVisible.value = true
}

// 处理导出

function handleExport() {
  if (!orders.value.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const headers = ['订单号,用户ID,活动ID,金额(元),状态,创建时间']
  const rows = orders.value.map(o =>
    [o.order_no, o.user_id, o.event_id, (o.amount / 100).toFixed(2), o.status, o.created_at].join(',')
  )
  const csv = headers.concat(rows).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(loadOrders)
</script>

<style scoped>
.orders-page {
  max-width: var(--container-max-width);
  margin: 0 auto;
}

/* Tab 样式 */
.tabs-wrapper {
  margin-bottom: var(--sp-4);
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
.order-no {
  color: var(--color-primary);
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: var(--fs-xs); /* 缩小订单号字体 */
  white-space: nowrap;
}

/* 用户信息样式 */
.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.real-name {
  font-size: var(--fs-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.phone {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.event-title {
  font-size: var(--fs-sm);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 250px; /* 稍微放宽一点 */
  display: inline-block;
  vertical-align: middle;
}

.amount {
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.time {
  font-size: var(--fs-sm);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

/* 高亮退款中的行 */
:deep(.refund-row) {
  background: var(--color-warning-highlight) !important;
}

:deep(.refund-row td.el-table__cell) {
  background: inherit !important;
}

/* 响应式调整 */
@media (max-width: 767px) {
  .tabs-container {
    gap: var(--sp-1);
  }

  .tab-item {
    padding: var(--sp-2) var(--sp-3);
    font-size: var(--fs-xs);
  }

  .tab-label {
    font-size: var(--fs-xs);
  }

  .event-title {
    max-width: 120px;
  }
}
</style>
