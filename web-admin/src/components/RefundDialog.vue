<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="退款审批" width="480px">
    <el-descriptions :column="2" border size="small" style="margin-bottom:16px;">
      <el-descriptions-item label="订单号">{{ order?.order_no }}</el-descriptions-item>
      <el-descriptions-item label="用户">{{ order?.user_name }}</el-descriptions-item>
      <el-descriptions-item label="活动">{{ order?.event_title }}</el-descriptions-item>
      <el-descriptions-item label="支付时间">{{ formatDateTime(order?.pay_time) }}</el-descriptions-item>
      <el-descriptions-item label="退款金额">
        <span style="color:#EF5350;font-weight:600;">{{ formatMoney(order?.amount) }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="支付方式">微信支付</el-descriptions-item>
    </el-descriptions>
    <div class="refund-reason">
      <div class="reason-label">用户退款原因</div>
      <div class="reason-text">{{ order?.refund_reason }}</div>
    </div>
    <div class="refund-policy">
      该活动退款政策: 活动开始前 24 小时可全额退款
    </div>
    <div style="margin-bottom:16px;">
      <label class="field-label">审批备注</label>
      <el-input type="textarea" v-model="note" placeholder="填写审批备注（可选）" :rows="3" />
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="danger" plain @click="handleAction('reject')">驳回</el-button>
      <el-button type="primary" @click="handleAction('approve')">同意退款</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { formatMoney, formatDateTime } from '../utils/format'

defineProps({ modelValue: Boolean, order: Object })
const emit = defineEmits(['update:modelValue', 'action'])
const note = ref('')

function handleAction(action) {
  emit('action', { action, note: note.value })
  emit('update:modelValue', false)
  note.value = ''
}
</script>

<style scoped>
.refund-reason { background: #FFF8E1; border-left: 3px solid #F9A825; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; }
.reason-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
.reason-text { color: #374151; font-size: 12px; }
.refund-policy { background: #e0f2f1; border-radius: 6px; padding: 10px 12px; font-size: 11px; color: #00695C; margin-bottom: 16px; }
.field-label { display: block; color: #374151; font-size: 12px; margin-bottom: 6px; font-weight: 500; }
</style>
