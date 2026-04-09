<template>
  <div>
    <!-- 筛选栏 -->
    <div class="card filter-bar">
      <el-input v-model="search" placeholder="搜索会员号 / 昵称 / 手机号" style="width:180px;" clearable />
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
      <el-date-picker v-model="dateRange" type="daterange" start-placeholder="注册开始" end-placeholder="注册结束" style="width:240px;" value-format="YYYY-MM-DD" />
      <el-button type="primary" style="margin-left:auto;">搜索</el-button>
      <el-button @click="search='';levelFilter='';roleFilter='';dateRange=null">重置</el-button>
    </div>
    <!-- 用户表格 -->
    <div class="card" style="padding:0;">
      <el-table :data="filteredUsers" stripe>
        <el-table-column label="会员号" prop="member_no" width="100">
          <template #default="{ row }">
            <span style="color:#00897B;font-weight:500;">{{ row.member_no }}</span>
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
        <span style="color:#6b7280;font-size:11px;">共 {{ filteredUsers.length }} 条</span>
        <el-pagination small layout="prev,pager,next" :total="filteredUsers.length" :page-size="20" />
      </div>
    </div>
    <PointsDialog v-model="pointsVisible" :user="selectedUser" @confirm="onPointsConfirm" />
    <UserEditDialog v-model="editVisible" :user="selectedUser" @confirm="onEditConfirm" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { mockUsers } from '../mock/users'
import { maskPhone, formatDate } from '../utils/format'
import PointsDialog from '../components/PointsDialog.vue'
import UserEditDialog from '../components/UserEditDialog.vue'

const search = ref('')
const levelFilter = ref('')
const roleFilter = ref('')
const dateRange = ref(null)
const pointsVisible = ref(false)
const editVisible = ref(false)
const selectedUser = ref(null)

const filteredUsers = computed(() => {
  return mockUsers.filter(u => {
    if (search.value) {
      const s = search.value.toLowerCase()
      if (!u.member_no.toLowerCase().includes(s) && !u.nickname.includes(s) && !u.phone.includes(s)) return false
    }
    if (levelFilter.value && u.level !== levelFilter.value) return false
    if (roleFilter.value && u.role !== roleFilter.value) return false
    return true
  })
})

function levelType(l) { return { bronze: 'warning', silver: 'info', gold: 'success' }[l] || 'info' }
function levelLabel(l) { return { bronze: '青铜', silver: '白银', gold: '黄金' }[l] || l }
function roleType(r) { return { admin: 'success', verifier: 'danger', user: 'info' }[r] || 'info' }
function roleLabel(r) { return { admin: '管理员', verifier: '核销员', user: '普通用户' }[r] || r }

function openPoints(user) { selectedUser.value = user; pointsVisible.value = true }
function openEdit(user) { selectedUser.value = user; editVisible.value = true }
function onPointsConfirm() {}
function onEditConfirm() {}
</script>

<style scoped>
.filter-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.avatar-circle { width: 28px; height: 28px; background: #e0f2f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #00897B; }
.pagination { padding: 12px 16px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
</style>
