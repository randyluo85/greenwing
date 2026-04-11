<template>
  <div>
    <!-- 筛选栏 -->
    <div class="card filter-bar">
      <el-input v-model="search" label="搜索会员号" placeholder="搜索会员号 / 昵称 / 手机号" style="width:180px;" clearable @clear="loadUsers" />
      <el-select v-model="levelFilter" placeholder="全部等级" clearable style="width:120px;">
        <el-option label="青铜" value="bronze" />
        <el-option label="白银" value="silver" />
        <el-option label="黄金" value="gold" />
      </el-select>
      <el-select v-model="roleFilter" placeholder="全部角色" clearable style="width:120px;">
        <el-option label="普通用户" value="user" />
        <el-option label="管理员" value="admin" />
        <el-option label="核销员" value="verifier" />
      </el-select>
      <el-button type="primary" @click="loadUsers">搜索</el-button>
      <el-button @click="search='';levelFilter='';roleFilter='';loadUsers()">重置</el-button>
    </div>
    <!-- 用户表格 -->
    <div class="card" style="padding:0;" v-loading="loading">
      <el-table :data="users" stripe>
        <template #empty>
          <div style="padding:20px;text-align:center;">
            <div style="font-size:13px;color: var(--color-text-secondary);">暂无用户数据</div>
          </div>
        </template>
        <el-table-column label="会员号" prop="member_no" width="120">
          <template #default="{ row }">
            <span style="color: var(--color-primary);font-weight:500;">{{ row.member_no }}</span>
          </template>
        </el-table-column>
        <el-table-column label="用户" min-width="120">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="avatar-circle">{{ row.nickname?.[0] }}</div>
              <span>{{ row.nickname }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="手机号" width="130">
          <template #default="{ row }">{{ maskPhone(row.phone) }}</template>
        </el-table-column>
        <el-table-column label="等级" width="90">
          <template #default="{ row }">
            <el-tag :type="levelType(row.level)" size="small">{{ levelLabel(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="积分" prop="current_points" width="90">
          <template #default="{ row }"><span style="font-weight:500;">{{ row.current_points }}</span></template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="roleType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="120">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openPoints(row)">调整积分</el-button>
            <el-button link @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <span style="color: var(--color-text-secondary);font-size: var(--fs-sm);">共 {{ total }} 条</span>
        <el-pagination size="small" layout="prev,pager,next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="loadUsers" />
      </div>
    </div>
    <PointsDialog v-model="pointsVisible" :user="selectedUser" @confirm="onPointsConfirm" />
    <UserEditDialog v-model="editVisible" :user="selectedUser" @confirm="onEditConfirm" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { callFunction } from '../utils/cloud'
import { maskPhone, formatDate } from '../utils/format'
import PointsDialog from '../components/PointsDialog.vue'
import UserEditDialog from '../components/UserEditDialog.vue'

const loading = ref(false)
const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const search = ref('')
const levelFilter = ref('')
const roleFilter = ref('')
const pointsVisible = ref(false)
const editVisible = ref(false)
const selectedUser = ref(null)

async function loadUsers() {
  loading.value = true
  try {
    const params = { action: 'getUsers', page: page.value, pageSize }
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

function levelType(l) { return { bronze: 'warning', silver: 'info', gold: 'success' }[l] || 'info' }
function levelLabel(l) { return { bronze: '青铜', silver: '白银', gold: '黄金' }[l] || l }
function roleType(r) { return { admin: 'success', verifier: 'danger', user: 'info' }[r] || 'info' }
function roleLabel(r) { return { admin: '管理员', verifier: '核销员', user: '普通用户' }[r] || r }

function openPoints(user) { selectedUser.value = user; pointsVisible.value = true }
function openEdit(user) { selectedUser.value = user; editVisible.value = true }

async function onPointsConfirm({ userId, amount, reason }) {
  try {
    await callFunction('admin', { action: 'adjustPoints', userId, amount, reason })
    ElMessage.success('积分调整成功')
    pointsVisible.value = false
    loadUsers()
  } catch (err) {
    ElMessage.error(err.message || '积分调整失败')
  }
}

async function onEditConfirm({ userId, data }) {
  try {
    await callFunction('admin', { action: 'updateUser', userId, data })
    ElMessage.success('用户信息已更新')
    editVisible.value = false
    loadUsers()
  } catch (err) {
    ElMessage.error(err.message || '更新失败')
  }
}

onMounted(loadUsers)
</script>

<style scoped>
</style>
