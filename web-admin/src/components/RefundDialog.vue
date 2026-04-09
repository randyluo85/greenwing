<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="退款审批" width="480px">
    <el-descriptions :column="2" border size="small" style="margin-bottom:16px;">
      <el-descriptions-item label="订单号">{{ order?.order_no }}</el-descriptions-item>
      <el-descriptions-item label="用户">{{ order?.user_name }}</el-descriptions-item>
      <el-descriptions-item label="活动">{{ order?.event_title }}</el-descriptions-item>
      <el-descriptions-item label="支付时间">{{ formatDateTime(order?.pay_time) }}</el-descriptions-item>
      <el-descriptions-item label="退款金额">
        <span style="color: var(--color-danger);font-weight:600;">{{ formatMoney(order?.amount) }}</span>
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
      <el-popconfirm title="确认驳回该退款申请？" confirm-button-text="确认驳回" cancel-button-text="取消" @confirm="handleAction('reject')">
        <template #reference>
          <el-button type="danger" plain>驳回</el-button>
        </template>
      </el-popconfirm>
      <el-popconfirm title="确认同意退款？退款将原路返回用户微信" confirm-button-text="同意退款" cancel-button-text="取消" @confirm="handleAction('approve')">
        <template #reference>
          <el-button type="primary">同意退款</el-button>
        </template>
      </el-popconfirm>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { formatMoney, formatDateTime } from '../utils/format'

defineProps({ modelValue: Boolean, order: Object })
const emit = defineEmits(['update:modelValue', 'action'])
const note = ref('')

function handleAction(action) {
  emit('action', { action, note: note.value })
  ElMessage.success(action === 'approve' ? '已同意退款，款项将原路返回' : '已驳回退款申请')
  emit('update:modelValue', false)
  note.value = ''
}
</script>

<style scoped>
/* field-label inherited from theme.css */
.refund-reason { background: var(--color-warning-highlight); border-left: 3px solid #F9A825; border-radius: var(--radius-md); padding: 10px var(--sp-3); margin-bottom: var(--sp-3); }
.reason-label { font-size: var(--fs-sm); color: var(--color-text-secondary); margin-bottom: var(--sp-1); }
.reason-text { color: var(--color-text-primary); font-size: var(--fs-base); }
.refund-policy { background: var(--color-primary-light); border-radius: var(--radius-md); padding: 10px var(--sp-3); font-size: var(--fs-sm); color: var(--color-primary-dark); margin-bottom: var(--sp-4); }
</style>
