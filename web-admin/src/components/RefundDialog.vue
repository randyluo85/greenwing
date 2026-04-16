<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="dialogTitle"
    width="480px"
  >
    <el-descriptions :column="2" border size="small" style="margin-bottom:16px;">
      <el-descriptions-item label="订单号">{{ order?.order_no }}</el-descriptions-item>
      <el-descriptions-item label="用户">{{ order?.user?.nickname || order?.user?.real_name || '-' }}</el-descriptions-item>
      <el-descriptions-item label="活动">{{ order?.event?.title || '-' }}</el-descriptions-item>
      <el-descriptions-item label="支付时间">{{ formatDateTime(order?.pay_time) }}</el-descriptions-item>
      <el-descriptions-item label="退款金额">
        <span style="color: var(--color-danger);font-weight:600;">{{ formatMoney(order?.amount) }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="支付方式">微信支付</el-descriptions-item>
    </el-descriptions>

    <!-- 用户申请的原因（仅审批模式显示） -->
    <div class="refund-reason" v-if="mode === 'approve' && order?.refund_reason">
      <div class="reason-label">用户退款原因</div>
      <div class="reason-text">{{ order?.refund_reason }}</div>
    </div>

    <!-- 主动退款提示 -->
    <div class="refund-policy" v-if="mode === 'admin'">
      <i class="fa-solid fa-circle-exclamation" style="margin-right:6px;"></i>
      退款将原路退回用户微信钱包，完成后订单不可恢复。请确认无误后再操作。
    </div>
    <div class="refund-policy" v-else>
      该活动退款政策: 活动开始前 24 小时可全额退款
    </div>

    <div style="margin-bottom:16px;">
      <label class="field-label">{{ mode === 'admin' ? '退款原因（可选）' : '审批备注（可选）' }}</label>
      <el-input type="textarea" v-model="note" :placeholder="mode === 'admin' ? '填写退款原因（可选）' : '填写审批备注（可选）'" :rows="3" />
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>

      <!-- 审批模式：驳回 + 同意 -->
      <template v-if="mode === 'approve'">
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

      <!-- 主动退款模式：仅有确认退款按钮 -->
      <template v-else>
        <el-popconfirm title="确认对该订单发起退款？此操作不可撤销" confirm-button-text="确认退款" cancel-button-text="取消" @confirm="handleAction('approve')">
          <template #reference>
            <el-button type="danger">发起退款</el-button>
          </template>
        </el-popconfirm>
      </template>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatMoney, formatDateTime } from '../utils/format'

const props = defineProps({
  modelValue: Boolean,
  order: Object,
  // 'approve': 用户申请 -> 管理员审批（有同意/驳回）
  // 'admin': 管理员主动对 paid 订单退款（只有确认退款）
  mode: {
    type: String,
    default: 'approve'
  }
})
const emit = defineEmits(['update:modelValue', 'action'])
const note = ref('')

const dialogTitle = computed(() =>
  props.mode === 'admin' ? '发起退款' : '退款审批'
)

function handleAction(action) {
  emit('action', { action, note: note.value })
  emit('update:modelValue', false)
  note.value = ''
}
</script>

<style scoped>
/* field-label inherited from theme.css */
.refund-reason {
  background: var(--color-warning-highlight);
  border-left: 3px solid #F9A825;
  border-radius: var(--radius-md);
  padding: 10px var(--sp-3);
  margin-bottom: var(--sp-3);
}
.reason-label {
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--sp-1);
}
.reason-text { color: var(--color-text-primary); font-size: var(--fs-base); }
.refund-policy {
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  padding: 10px var(--sp-3);
  font-size: var(--fs-sm);
  color: var(--color-primary-dark);
  margin-bottom: var(--sp-4);
}
</style>
