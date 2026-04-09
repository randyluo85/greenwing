<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="订单详情" width="520px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
      <el-tag :type="statusType(order?.status)">{{ statusLabel(order?.status) }}</el-tag>
      <span style="color: var(--color-text-tertiary);font-size: var(--fs-sm);">{{ order?.order_no }}</span>
    </div>
    <el-descriptions :column="2" border size="small" style="margin-bottom:20px;">
      <el-descriptions-item label="用户">{{ order?.user_name }}</el-descriptions-item>
      <el-descriptions-item label="活动">{{ order?.event_title }}</el-descriptions-item>
      <el-descriptions-item label="支付金额"><span style="font-weight:600;">{{ formatMoney(order?.amount) }}</span></el-descriptions-item>
      <el-descriptions-item label="微信交易号"><span style="font-size:11px;">{{ order?.transaction_id }}</span></el-descriptions-item>
      <el-descriptions-item label="支付时间">{{ formatDateTime(order?.pay_time) }}</el-descriptions-item>
      <el-descriptions-item label="订单过期">{{ formatDateTime(order?.expire_at) }}</el-descriptions-item>
    </el-descriptions>
    <div style="border-top:1px solid var(--color-border-light);padding-top:16px;">
      <div style="color: var(--color-text-primary);font-weight:500;font-size: var(--fs-base);margin-bottom:12px;">操作记录</div>
      <el-timeline>
        <el-timeline-item v-for="(log, i) in (order?.logs || [])" :key="i" color="#00897B" :timestamp="formatDateTime(log.time)" placement="top">
          {{ log.action }}
        </el-timeline-item>
      </el-timeline>
    </div>
  </el-dialog>
</template>

<script setup>
import { formatMoney, formatDateTime } from '../utils/format'

defineProps({ modelValue: Boolean, order: Object })
defineEmits(['update:modelValue'])

function statusType(s) { return { paid: 'success', refund_pending: 'warning', refunded: 'info', closed: 'info' }[s] || 'info' }
function statusLabel(s) { return { paid: '已支付', refund_pending: '待退款', refunded: '已退款', closed: '已关闭' }[s] || s }
</script>
