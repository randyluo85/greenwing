<template>
  <div class="users-page">
    <!-- 筛选栏 -->
    <FilterBar
      :filters="userFilters"
      searchPlaceholder="搜索会员号 / 昵称 / 手机号"
      :showResultCount="true"
      :resultCount="total"
      :search-value="search"
      @filter-change="handleFilterChange"
      @search="handleSearch"
      @clear-all="handleClearAll"
    >
      <template #extra-actions>
        <el-button type="primary">
          <i class="fa-solid fa-plus"></i>
          新增用户
        </el-button>
      </template>
    </FilterBar>

    <!-- 用户表格 -->
    <BaseCard :shadow="'sm'">
      <BaseTable
        :data="users"
        :columns="userColumns"
        :loading="loading"
        :pagination="paginationConfig"
        :striped="true"
        :border="true"
        emptyText="暂无用户数据"
        :selectable="true"
        :actionsWidth="200"
        @page-change="handlePageChange"
        @size-change="handleSizeChange"
        @selection-change="handleSelectionChange"
      >
        <!-- 会员号列 -->
        <template #member_no="{ row }">
          <span class="member-no">{{ row.member_no }}</span>
        </template>

        <!-- 用户列 -->
        <template #user="{ row }">
          <div class="user-cell">
            <div class="user-avatar">{{ row.nickname?.[0] || '?' }}</div>
            <div class="user-info">
              <div class="user-name">{{ row.nickname || '未设置' }}</div>
            </div>
          </div>
        </template>

        <!-- 姓名列 -->
        <template #real_name="{ row }">
          <span class="real-name">{{ row.real_name || '-' }}</span>
        </template>

        <!-- 手机号列 -->
        <template #phone="{ row }">
          <span class="phone">{{ maskPhone(row.phone) }}</span>
        </template>

        <!-- 等级列 -->
        <template #level="{ row }">
          <StatusBadge
            :type="getLevelType(row.level)"
            :text="getLevelLabel(row.level)"
            size="small"
          />
        </template>

        <!-- 积分列 -->
        <template #points="{ row }">
          <span class="points">{{ row.current_points }}</span>
        </template>

        <!-- 角色列 -->
        <template #role="{ row }">
          <StatusBadge
            :type="getRoleType(row.role)"
            :text="getRoleLabel(row.role)"
            size="small"
          />
        </template>

        <!-- 注册时间列 -->
        <template #created_at="{ row }">
          <span class="date">{{ formatDate(row.created_at) }}</span>
        </template>

        <!-- 操作列 -->
        <template #actions="{ row }">
          <el-button
            link
            type="primary"
            @click="openPoints(row)"
          >
            <i class="fa-solid fa-coins"></i>
            积分
          </el-button>
          <el-button
            link
            type="primary"
            @click="openEdit(row)"
          >
            <i class="fa-solid fa-pen"></i>
            编辑
          </el-button>
        </template>
      </BaseTable>
    </BaseCard>

    <!-- 批量操作栏 -->
    <div v-if="selectedUsers.length > 0" class="bulk-actions">
      <div class="bulk-actions__info">
        已选择 <strong>{{ selectedUsers.length }}</strong> 位用户
      </div>
      <div class="bulk-actions__buttons">
        <el-button
          size="small"
          @click="handleExport"
        >
          <i class="fa-solid fa-download"></i>
          导出
        </el-button>
        <el-button
          size="small"
          type="danger"
          @click="handleBatchDelete"
        >
          <i class="fa-solid fa-trash"></i>
          批量删除
        </el-button>
      </div>
    </div>

    <!-- 积分调整对话框 -->
    <PointsDialog
      v-model="pointsVisible"
      :user="selectedUser"
      @confirm="onPointsConfirm"
    />

    <!-- 用户编辑对话框 -->
    <UserEditDialog
      v-model="editVisible"
      :user="selectedUser"
      @confirm="onEditConfirm"
    />
  </div>
</template>

<script setup>
/**
 * Users - 用户管理页面
 *
 * 功能特性：
 * - 用户列表展示
 * - 筛选和搜索
 * - 积分调整
 * - 用户信息编辑
 * - 批量操作
 */

import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import BaseCard from '@/components/BaseCard.vue'
import BaseTable from '@/components/BaseTable.vue'
import FilterBar from '@/components/FilterBar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import PointsDialog from '@/components/PointsDialog.vue'
import UserEditDialog from '@/components/UserEditDialog.vue'
import { callFunction } from '@/utils/cloud'
import { maskPhone, formatDate } from '@/utils/format'

// 状态管理
const loading = ref(false)
const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 筛选状态
const search = ref('')
const levelFilter = ref(null)
const roleFilter = ref(null)

// 对话框状态
const pointsVisible = ref(false)
const editVisible = ref(false)
const selectedUser = ref(null)

// 选中的用户
const selectedUsers = ref([])

// 筛选器配置
const userFilters = computed(() => [
  {
    key: 'level',
    type: 'select',
    placeholder: '全部等级',
    options: [
      { label: '青铜会员', value: 'bronze' },
      { label: '白银会员', value: 'silver' },
      { label: '黄金会员', value: 'gold' }
    ],
    defaultValue: levelFilter.value
  },
  {
    key: 'role',
    type: 'select',
    placeholder: '全部角色',
    options: [
      { label: '普通用户', value: 'user' },
      { label: '管理员', value: 'admin' },
      { label: '核销员', value: 'verifier' }
    ],
    defaultValue: roleFilter.value
  }
])

// 表格列配置
const userColumns = computed(() => [
  {
    prop: 'member_no',
    label: '会员号',
    width: 160,
    slot: 'member_no',
    sortable: true
  },
  {
    prop: 'user',
    label: '用户',
    minWidth: 120,
    slot: 'user'
  },
  {
    prop: 'real_name',
    label: '姓名',
    width: 100,
    slot: 'real_name'
  },
  {
    prop: 'phone',
    label: '手机号',
    width: 150,
    slot: 'phone'
  },
  {
    prop: 'level',
    label: '等级',
    width: 100,
    slot: 'level',
    sortable: true
  },
  {
    prop: 'current_points',
    label: '积分',
    width: 110,
    slot: 'points',
    sortable: true
  },
  {
    prop: 'role',
    label: '角色',
    width: 100,
    slot: 'role',
    sortable: true
  },
  {
    prop: 'created_at',
    label: '注册时间',
    width: 180,
    slot: 'created_at',
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

// 加载用户列表
async function loadUsers() {
  loading.value = true
  try {
    const params = {
      action: 'getUsers',
      page: page.value,
      pageSize: pageSize.value
    }

    if (search.value) params.keyword = search.value
    if (levelFilter.value) params.level = levelFilter.value
    if (roleFilter.value) params.role = roleFilter.value

    const res = await callFunction('admin', params)
    users.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (err) {
    ElMessage.error(err.message || '加载用户失败')
  } finally {
    loading.value = false
  }
}

// 处理搜索
function handleSearch(value) {
  search.value = value
  page.value = 1
  loadUsers()
}

// 处理筛选变化
function handleFilterChange({ key, value }) {
  if (key === 'level') {
    levelFilter.value = value
  } else if (key === 'role') {
    roleFilter.value = value
  }
  page.value = 1
  loadUsers()
}

// 处理清空所有筛选
function handleClearAll() {
  search.value = ''
  levelFilter.value = null
  roleFilter.value = null
  page.value = 1
  loadUsers()
}

// 处理页码变化
function handlePageChange(newPage) {
  page.value = newPage
  loadUsers()
}

// 处理每页数量变化
function handleSizeChange(newSize) {
  pageSize.value = newSize
  page.value = 1
  loadUsers()
}

// 处理选择变化
function handleSelectionChange(selection) {
  selectedUsers.value = selection
}

// 获取等级类型
function getLevelType(level) {
  const types = {
    bronze: 'warning',
    silver: 'info',
    gold: 'success'
  }
  return types[level] || 'info'
}

// 获取等级标签
function getLevelLabel(level) {
  const labels = {
    bronze: '青铜',
    silver: '白银',
    gold: '黄金'
  }
  if (!level) return '未知'
  return labels[level] || String(level)
}

// 获取角色类型
function getRoleType(role) {
  const types = {
    admin: 'success',
    verifier: 'danger',
    user: 'info'
  }
  return types[role] || 'info'
}

// 获取角色标签
function getRoleLabel(role) {
  const labels = {
    admin: '管理员',
    verifier: '核销员',
    user: '普通用户'
  }
  if (!role) return '未知'
  return labels[role] || String(role)
}

// 打开积分调整对话框
function openPoints(user) {
  selectedUser.value = user
  pointsVisible.value = true
}

// 打开编辑对话框
function openEdit(user) {
  selectedUser.value = user
  editVisible.value = true
}

// 处理积分调整确认
async function onPointsConfirm({ userId, amount, reason }) {
  try {
    await callFunction('admin', {
      action: 'adjustPoints',
      userId,
      amount,
      reason
    })
    ElMessage.success('积分调整成功')
    pointsVisible.value = false
    loadUsers()
  } catch (err) {
    ElMessage.error(err.message || '积分调整失败')
  }
}

// 处理编辑确认
async function onEditConfirm({ userId, data }) {
  try {
    await callFunction('admin', {
      action: 'updateUser',
      userId,
      data
    })
    ElMessage.success('用户信息已更新')
    editVisible.value = false
    loadUsers()
  } catch (err) {
    ElMessage.error(err.message || '更新失败')
  }
}

// 处理导出
async function handleExport() {
  try {
    // 调用导出接口
    ElMessage.info('导出功能开发中...')
  } catch (err) {
    ElMessage.error('导出失败')
  }
}

// 处理批量删除
async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedUsers.value.length} 位用户吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    ElMessage.info('批量删除功能开发中...')
  } catch (err) {
    // 用户取消
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.users-page {
  max-width: var(--container-max-width);
  margin: 0 auto;
}

/* 用户单元格样式 */
.user-cell {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: var(--fs-sm);
  font-weight: 600;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.real-name {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--color-primary);
}

/* 其他单元格样式 */
.member-no {
  color: var(--color-primary);
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  white-space: nowrap;
}

.phone {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.points {
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.date {
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* 批量操作栏 */
.bulk-actions {
  position: fixed;
  bottom: var(--sp-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-fixed);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
  animation: slideUp var(--transition-base);
}

.bulk-actions__info {
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.bulk-actions__info strong {
  color: var(--color-primary);
  font-weight: 600;
}

.bulk-actions__buttons {
  display: flex;
  gap: var(--sp-2);
}

/* 动画 */
@keyframes slideUp {
  from {
    transform: translate(-50%, 100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

/* 响应式调整 */
@media (max-width: 767px) {
  .bulk-actions {
    left: var(--sp-4);
    right: var(--sp-4);
    transform: none;
    flex-direction: column;
    gap: var(--sp-3);
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .bulk-actions__buttons {
    width: 100%;
  }

  .bulk-actions__buttons .el-button {
    flex: 1;
  }
}
</style>
