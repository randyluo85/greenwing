<template>
  <div>
    <!-- 状态 Tab -->
    <div class="tabs-row">
      <div style="display:flex;gap:8px;">
        <div v-for="tab in tabs" :key="tab.key" :class="['tab-btn', { active: activeTab === tab.key }]" @click="activeTab = tab.key">
          {{ tab.label }} ({{ tab.count }})
          <span v-if="tab.key === 'refund_pending' && tab.count > 0" class="badge">{{ tab.count }}</span>
        </div>
      </div>
    </div>
    <!-- 筛选栏 -->
    <div class="card filter-bar">
      <el-input v-model="search" placeholder="搜索订单号 / 用户名" style="width:160px;" clearable />
      <el-select v-model="eventFilter" placeholder="全部活动" clearable style="width:180px;">
        <el-option v-for="e in eventOptions" :key="e" :label="e" :value="e" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" start-placeholder="开始" end-placeholder="结束" style="width:240px;" value-format="YYYY-MM-DD" />
      <el-button type="primary">搜索</el-button>
      <el-button style="margin-left:auto;" @click="handleExport">导出</el-button>
    </div>
    <!-- 订单表格 -->
    <div class="card" style="padding:0;">
      <el-table :data="filteredOrders" stripe :row-class-name="rowClass">
        <template #empty>
          <div style="padding:20px;text-align:center;">
            <div style="font-size:13px;color: var(--color-text-secondary);">暂无订单数据</div>
            <div style="font-size:11px;color: var(--color-text-tertiary);margin-top:4px;">试试调整筛选条件</div>
          </div>
        </template>
        <el-table-column label="订单号" width="160">
          <template #default="{ row }"><span style="color: var(--color-primary);font-weight:500;font-size: var(--fs-sm);">{{ row.order_no }}</span></template>
        </el-table-column>
        <el-table-column label="用户" prop="user_name" width="90" />
        <el-table-column label="活动" prop="event_title" min-width="160" />
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
            <el-button v-if="row.status === 'refund_pending'" link type="primary" @click="openRefund(row)">审批</el-button>
            <el-button link @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <span style="color: var(--color-text-secondary);font-size: var(--fs-sm);">共 {{ filteredOrders.length }} 条</span>
        <el-pagination small layout="prev,pager,next" :total="filteredOrders.length" :page-size="20" />
      </div>
    </div>
    <RefundDialog v-model="refundVisible" :order="selectedOrder" @action="onRefundAction" />
    <OrderDetailDialog v-model="detailVisible" :order="selectedOrder" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { mockOrders } from '../mock/orders'
import { formatMoney, formatDateTime } from '../utils/format'
import RefundDialog from '../components/RefundDialog.vue'
import OrderDetailDialog from '../components/OrderDetailDialog.vue'

const activeTab = ref('all')
const search = ref('')
const eventFilter = ref('')
const dateRange = ref(null)
const refundVisible = ref(false)
const detailVisible = ref(false)
const selectedOrder = ref(null)

const tabs = computed(() => [
  { key: 'all', label: '全部', count: mockOrders.length },
  { key: 'paid', label: '已支付', count: mockOrders.filter(o => o.status === 'paid').length },
  { key: 'refund_pending', label: '待退款', count: mockOrders.filter(o => o.status === 'refund_pending').length },
  { key: 'refunded', label: '已退款', count: mockOrders.filter(o => o.status === 'refunded').length },
  { key: 'closed', label: '已关闭', count: mockOrders.filter(o => o.status === 'closed').length }
])

const eventOptions = [...new Set(mockOrders.map(o => o.event_title))]

const filteredOrders = computed(() => {
  return mockOrders.filter(o => {
    if (activeTab.value !== 'all' && o.status !== activeTab.value) return false
    if (search.value) {
      const s = search.value.toLowerCase()
      if (!o.order_no.toLowerCase().includes(s) && !o.user_name.includes(s)) return false
    }
    if (eventFilter.value && o.event_title !== eventFilter.value) return false
    return true
  })
})

function statusType(s) { return { paid: 'success', refund_pending: 'warning', refunded: 'info', closed: 'info' }[s] || 'info' }
function statusLabel(s) { return { paid: '已支付', refund_pending: '待退款', refunded: '已退款', closed: '已关闭' }[s] || s }
function rowClass({ row }) { return row.status === 'refund_pending' ? 'refund-row' : '' }

function openRefund(order) { selectedOrder.value = order; refundVisible.value = true }
function openDetail(order) { selectedOrder.value = order; detailVisible.value = true }
function onRefundAction() {}
function handleExport() { ElMessage.success('导出文件已生成') }
</script>

<style scoped>
/* tab-btn, filter-bar, pagination inherited from theme.css */
.tabs-row { display: flex; justify-content: space-between; margin-bottom: var(--sp-4); }
.badge { position: absolute; top: -4px; right: -4px; background: var(--color-danger); color: white; border-radius: 10px; padding: 0 6px; font-size: var(--fs-xs); }
:deep(.refund-row) { background: var(--color-warning-highlight) !important; }
:deep(.refund-row td.el-table__cell) { background: inherit !important; }
</style>
