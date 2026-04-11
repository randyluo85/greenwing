<template>
  <div>
    <!-- 状态 Tab -->
    <div class="tabs-row">
      <div style="display:flex;gap:8px;">
        <div v-for="tab in tabs" :key="tab.key" :class="['tab-btn', { active: activeTab === tab.key }]" @click="switchTab(tab.key)">
          {{ tab.label }} ({{ tab.count }})
        </div>
      </div>
    </div>
    <!-- 筛选栏 -->
    <div class="card filter-bar">
      <el-input v-model="search" label="搜索订单号" placeholder="搜索订单号" style="width:160px;" clearable @clear="loadOrders" />
      <el-date-picker v-model="dateRange" type="daterange" start-placeholder="开始" end-placeholder="结束" style="width:240px;" value-format="YYYY-MM-DD" />
      <el-button type="primary" @click="loadOrders">搜索</el-button>
      <el-button style="margin-left:auto;" @click="handleExport">导出</el-button>
    </div>
    <!-- 订单表格 -->
    <div class="card" style="padding:0;" v-loading="loading">
      <el-table :data="orders" stripe :row-class-name="rowClass">
        <template #empty>
          <div style="padding:20px;text-align:center;">
            <div style="font-size:13px;color: var(--color-text-secondary);">暂无订单数据</div>
          </div>
        </template>
        <el-table-column label="订单号" width="180">
          <template #default="{ row }"><span style="color: var(--color-primary);font-weight:500;font-size: var(--fs-sm);">{{ row.order_no }}</span></template>
        </el-table-column>
        <el-table-column label="用户" width="90">
          <template #default="{ row }">{{ row.user_id?.slice(-6) || '-' }}</template>
        </el-table-column>
        <el-table-column label="活动" min-width="160">
          <template #default="{ row }">{{ row.event?.title || row.event_id || '-' }}</template>
        </el-table-column>
        <el-table-column label="金额" width="90">
          <template #default="{ row }"><span style="font-weight:500;">{{ formatMoney(row.amount) }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支付时间" width="120">
          <template #default="{ row }"><span style="color: var(--color-text-tertiary);">{{ formatDateTime(row.pay_time) }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'refunding'" link type="primary" @click="openRefund(row)">审批</el-button>
            <el-button link @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <span style="color: var(--color-text-secondary);font-size: var(--fs-sm);">共 {{ total }} 条</span>
        <el-pagination size="small" layout="prev,pager,next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="loadOrders" />
      </div>
    </div>
    <RefundDialog v-model="refundVisible" :order="selectedOrder" @action="onRefundAction" />
    <OrderDetailDialog v-model="detailVisible" :order="selectedOrder" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { callFunction } from '../utils/cloud'
import { formatMoney, formatDateTime } from '../utils/format'
import RefundDialog from '../components/RefundDialog.vue'
import OrderDetailDialog from '../components/OrderDetailDialog.vue'

const loading = ref(false)
const orders = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const activeTab = ref('all')
const search = ref('')
const dateRange = ref(null)
const refundVisible = ref(false)
const detailVisible = ref(false)
const selectedOrder = ref(null)

const tabs = computed(() => {
  const all = total.value
  const statusCounts = { paid: 0, refunding: 0, refunded: 0, closed: 0 }
  orders.value.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++ })
  return [
    { key: 'all', label: '全部', count: all },
    { key: 'paid', label: '已支付', count: statusCounts.paid },
    { key: 'refunding', label: '待退款', count: statusCounts.refunding },
    { key: 'refunded', label: '已退款', count: statusCounts.refunded },
    { key: 'closed', label: '已关闭', count: statusCounts.closed }
  ]
})

function switchTab(key) { activeTab.value = key; page.value = 1; loadOrders() }

async function loadOrders() {
  loading.value = true
  try {
    const params = { action: 'getOrders', page: page.value, pageSize }
    if (activeTab.value !== 'all') params.status = activeTab.value
    if (search.value) params.keyword = search.value
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

function statusType(s) { return { paid: 'success', refunding: 'warning', refunded: 'info', closed: 'info', pending: 'warning' }[s] || 'info' }
function statusLabel(s) { return { paid: '已支付', refunding: '待退款', refunded: '已退款', closed: '已关闭', pending: '待支付' }[s] || s }
function rowClass({ row }) { return row.status === 'refunding' ? 'refund-row' : '' }

function openRefund(order) { selectedOrder.value = order; refundVisible.value = true }
function openDetail(order) { selectedOrder.value = order; detailVisible.value = true }

async function onRefundAction({ action, note }) {
  try {
    const approved = action === 'approve'
    await callFunction('admin', { action: 'approveRefund', orderId: selectedOrder.value._id, approved, reason: note })
    ElMessage.success(approved ? '退款已发起' : '退款已拒绝')
    refundVisible.value = false
    loadOrders()
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
}

function handleExport() {
  if (!orders.value.length) { ElMessage.warning('暂无数据可导出'); return }
  const headers = ['订单号,用户ID,活动ID,金额(分),状态,创建时间']
  const rows = orders.value.map(o => [o.order_no, o.user_id, o.event_id, o.amount, o.status, o.created_at].join(','))
  const csv = headers.concat(rows).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

onMounted(loadOrders)
</script>

<style scoped>
.tabs-row { display: flex; justify-content: space-between; margin-bottom: var(--sp-4); }
:deep(.refund-row) { background: var(--color-warning-highlight) !important; }
:deep(.refund-row td.el-table__cell) { background: inherit !important; }
</style>
