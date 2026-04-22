<template>
  <div class="guide-page">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="never" class="welcome-card">
          <div class="welcome-header">
            <div class="welcome-text">
              <h2>📖 系统使用指南</h2>
              <p>欢迎使用青翼读书会管理后台。本指南将帮助您快速了解系统功能及操作流程。</p>
            </div>
            <el-icon class="welcome-icon" :size="60"><Reading /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab" class="guide-tabs">
      <el-tab-pane label="角色与权限" name="roles">
        <div class="tab-content">
          <h3>👥 角色定义</h3>
          <el-table :data="roleData" border stripe style="width: 100%">
            <el-table-column prop="role" label="角色名称" width="120" />
            <el-table-column prop="desc" label="功能描述" />
            <el-table-column prop="platform" label="主要操作端" width="150" />
          </el-table>

          <div class="tip-box">
            <el-alert title="如何设置角色？" type="info" :closable="false" show-icon>
              <div class="alert-content">
                <p>在 <strong>用户管理</strong> 页面，点击用户右侧的 <strong>编辑</strong> 按钮，在弹窗中选择对应的角色并保存即可。</p>
              </div>
            </el-alert>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Web 后台指南" name="web">
        <div class="tab-content">
          <div class="guide-image-container">
            <img src="/guide/dashboard.png" alt="系统概览" class="guide-image" />
          </div>
          <el-collapse v-model="activeCollapse">
            <el-collapse-item title="1. 活动管理 (Events)" name="1">
              <div class="guide-image-container">
                <img src="/guide/events.png" alt="活动管理" class="guide-image" />
              </div>
              <ul>
                <li><strong>发布活动</strong>：点击“新增活动”，填写标题、封面、详情（支持富文本）、时间、地点、费用等。</li>
                <li><strong>费用类型</strong>：
                  <ul>
                    <li>免费：直接报名。</li>
                    <li>积分：消耗用户积分报名。</li>
                    <li>付费：通过微信支付报名（需配置支付参数）。</li>
                  </ul>
                </li>
                <li><strong>报名管理</strong>：在活动列表中点击“报名列表”可查看所有报名者，并执行退款或核销操作。</li>
              </ul>
            </el-collapse-item>
            <el-collapse-item title="2. 用户与积分 (Users & Points)" name="2">
              <div class="guide-image-container">
                <img src="/guide/users.png" alt="用户管理" class="guide-image" />
              </div>
              <ul>
                <li><strong>积分调整</strong>：在用户管理页点击“积分”，可手动增加或扣除用户积分（需填写原因）。</li>
                <li><strong>等级制度</strong>：用户等级根据累计积分自动划分，管理员也可手动调整。不同等级可享受不同的特权。</li>
              </ul>
            </el-collapse-item>
            <el-collapse-item title="3. 订单管理 (Orders)" name="3">
              <div class="guide-image-container">
                <img src="/guide/orders.png" alt="订单管理" class="guide-image" />
              </div>
              <ul>
                <li><strong>订单查询</strong>：查看所有报名的订单明细、支付状态（待支付、已支付、已完成等）。</li>
                <li><strong>退款流水</strong>：查看已处理的退款记录及金额，核对财务数据。</li>
                <li><strong>注意</strong>：Web 后台仅提供订单查询和对账，<strong>退款审批</strong> 请在管理员手机端小程序操作。</li>
              </ul>
            </el-collapse-item>
            <el-collapse-item title="4. 系统设置 (Settings)" name="4">
              <div class="guide-image-container">
                <img src="/guide/settings.png" alt="系统设置" class="guide-image" />
              </div>
              <ul>
                <li><strong>积分规则</strong>：设置注册赠送积分、签到积分、订单抵扣比例等。</li>
                <li><strong>会员配置</strong>：定义白银、黄金等会员等级所需的积分门槛。</li>
              </ul>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-tab-pane>

      <el-tab-pane label="小程序管理指南" name="miniprogram">
        <div class="tab-content">
          <h3>📲 管理员/核销员手机端操作</h3>
          
          <div class="operation-section">
            <h4>1. 活动扫码核销</h4>
            <el-steps direction="vertical" :active="4" style="padding-left: 20px;">
              <el-step title="进入个人中心" description="找到“扫码核销”入口（仅工作人员可见）。" />
              <el-step title="扫描核销码" description="扫描用户出示的活动入场二维码。" />
              <el-step title="确认信息" description="系统将显示该用户的报名信息及支付状态。" />
              <el-step title="完成核销" description="点击“确认核销”即可完成签到。" />
            </el-steps>
          </div>

          <div class="operation-section" style="margin-top: 30px;">
            <h4>2. 退款审批管理</h4>
            <p style="padding-left: 20px; color: #4b5563;">当用户发起退款申请时，管理员需在手机端进行审批：</p>
            <ul style="padding-left: 40px;">
              <li><strong>入口</strong>：个人中心 -> 退款管理。</li>
              <li><strong>操作</strong>：查看退款原因、订单金额，点击“同意退款”或“拒绝”。</li>
              <li><strong>原路退回</strong>：审批通过后，款项将通过微信支付自动原路退回用户账户。</li>
            </ul>
          </div>
          

        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Reading } from '@element-plus/icons-vue'

const activeTab = ref('roles')
const activeCollapse = ref(['1'])

const roleData = [
  { role: '管理员 (Admin)', desc: '拥有系统所有权限，包括用户管理、活动发布、退款审批（小程序端）、系统设置等。', platform: 'Web 后台 + 小程序' },
  { role: '核销员 (Verifier)', desc: '专门负责活动现场入场核销，无后台管理权限。', platform: '小程序端' },
  { role: '普通用户 (User)', desc: '可以浏览活动、报名、签到、获取积分等。', platform: '小程序端' }
]
</script>

<style scoped>
.guide-page {
  max-width: 1000px;
  margin: 0 auto;
}

.welcome-card {
  margin-bottom: 20px;
  border-left: 5px solid #00695C;
  background: linear-gradient(to right, #f0fdfa, #ffffff);
}

.welcome-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text h2 {
  margin: 0 0 10px 0;
  color: #1f2937;
}

.welcome-text p {
  margin: 0;
  color: #4b5563;
  font-size: 15px;
}

.welcome-icon {
  color: #00695C;
  opacity: 0.8;
}

.guide-tabs {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.tab-content {
  padding: 10px 0;
}

.tab-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 10px;
}

.tip-box {
  margin-top: 30px;
}

.alert-content p {
  margin: 8px 0 0 0;
}



.guide-image-container {
  margin: 10px 0 20px 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.guide-image {
  width: 100%;
  display: block;
}

:deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 15px;
}

ul {
  padding-left: 20px;
  line-height: 1.8;
}

li {
  margin-bottom: 10px;
  color: #374151;
}

strong {
  color: #111827;
}
</style>
