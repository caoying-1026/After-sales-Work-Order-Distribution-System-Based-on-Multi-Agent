<template>
  <div class="app-layout">
    <!-- ====== Sidebar ====== -->
    <aside :class="['sidebar', { collapsed: !sidebarOpen }]">
      <!-- New Chat -->
      <div class="sidebar-header">
        <button class="new-chat-btn" @click="startNewChat">
          <span class="icon">＋</span>
          <span>新建对话</span>
        </button>
      </div>

      <!-- Function Panels -->
      <div class="sidebar-panels">
        <button
          :class="['panel-item', { active: activePanel === 'knowledge' }]"
          @click="togglePanel('knowledge')"
        >
          <span class="icon">🔍</span>
          <span>知识库检索</span>
        </button>
        <button
          :class="['panel-item', { active: activePanel === 'skills' }]"
          @click="togglePanel('skills')"
        >
          <span class="icon">⚡</span>
          <span>技能注入</span>
          <span v-if="skillCount > 0" class="badge">{{ skillCount }}</span>
        </button>
      </div>

      <!-- Conversation History -->
      <div class="conversations">
        <div class="conversations-label">近期对话</div>
        <div v-if="conversations.length === 0" class="conv-empty">
          暂无历史对话
        </div>
        <button
          v-for="conv in conversations"
          :key="conv.id"
          :class="['conv-item', { active: conv.id === activeConvId }]"
          @click="switchConversation(conv)"
        >
          <span class="conv-title">{{ conv.title }}</span>
          <span class="conv-delete" @click.stop="removeConv(conv.id)">🗑</span>
        </button>
      </div>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="user-avatar">{{ settings.userId.slice(0, 2).toUpperCase() }}</div>
        <span class="user-name">{{ settings.userId }}</span>
      </div>
    </aside>

    <!-- ====== Main Area ====== -->
    <div class="main-area">
      <!-- Top Bar -->
      <div class="top-bar">
        <button class="toggle-sidebar" @click="sidebarOpen = !sidebarOpen">
          {{ sidebarOpen ? '☰' : '☰' }}
        </button>
        <span class="model-badge">
          售后工单分流 Agent
          <span :class="['status-dot', healthOk ? 'online' : 'offline']"></span>
        </span>
      </div>

      <!-- Chat Area -->
      <div class="chat-area" ref="chatArea">
        <!-- Welcome -->
        <div v-if="messages.length === 0" class="welcome">
          <div class="welcome-logo">🧠</div>
          <h2>售后工单分流多智能体系统</h2>
          <p>多 Agent 协作架构 · 知识库 RAG 检索 · 技能动态注入</p>
          <div class="welcome-suggestions">
            <button class="suggestion-card" @click="sendSuggestion('我想申请退款，订单号是 #12345')">
              💰 退款申请流程
            </button>
            <button class="suggestion-card" @click="sendSuggestion('你们的退款多久能到账？')">
              ⏱ 退款到账时效
            </button>
            <button class="suggestion-card" @click="sendSuggestion('我的账号无法登录，怎么办？')">
              🔐 账号登录问题
            </button>
            <button class="suggestion-card" @click="sendSuggestion('介绍一下系统的核心功能')">
              🤖 系统功能
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div class="messages" v-else>
          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="['message-row', msg.role]"
          >
            <div class="message-inner">
              <div :class="['message-avatar', msg.role === 'user' ? 'user-av' : 'bot-av']">
                {{ msg.role === 'user' ? settings.userId.slice(0, 2).toUpperCase() : 'AS' }}
              </div>
              <div>
                <div class="message-content">{{ msg.content }}</div>
                <div v-if="msg.meta" class="message-meta">{{ msg.meta }}</div>
              </div>
            </div>
          </div>
          <!-- Loading -->
          <div v-if="busy" class="message-row assistant">
            <div class="message-inner">
              <div class="message-avatar bot-av">AS</div>
              <div class="loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-inner">
          <div class="input-box">
            <textarea
              v-model="draft"
              @keydown.enter.exact.prevent="send"
              placeholder="输入消息..."
              rows="1"
              ref="inputEl"
              @input="autoResize"
            ></textarea>
            <button class="send-btn" :disabled="busy || !draft.trim()" @click="send">
              ↑
            </button>
          </div>
          <div class="input-disclaimer">系统由多 Agent 协作驱动，请核实重要信息</div>
        </div>
      </div>
    </div>

    <!-- ====== Knowledge Panel Overlay ====== -->
    <div v-if="activePanel === 'knowledge'" class="panel-overlay" @click.self="closePanel">
      <div class="panel-dialog">
        <div class="panel-dialog-header">
          <h3>🔍 知识库检索</h3>
          <button class="close-btn" @click="closePanel">×</button>
        </div>
        <div class="panel-dialog-body">
          <!-- Search -->
          <div class="section">
            <div class="section-label">语义搜索</div>
            <div class="search-row">
              <input v-model="searchQuery" placeholder="输入查询关键词..." @keydown.enter="doSearch" />
              <button :disabled="busy || !searchQuery.trim()" @click="doSearch">搜索</button>
            </div>
            <div class="result-list" v-if="searchResults.length">
              <div v-for="(r, i) in searchResults" :key="i" class="result-card">
                <div class="result-title">{{ r.title || '未命名结果' }}</div>
                <div class="result-score" v-if="r.score != null">相关度: {{ (r.score * 100).toFixed(0) }}%</div>
                <div class="result-text">{{ r.content || r.text || '' }}</div>
              </div>
            </div>
            <div v-if="searchDone && searchResults.length === 0" class="result-card" style="text-align:center;color:var(--text-muted)">
              未找到相关结果
            </div>
          </div>

          <!-- Add Knowledge -->
          <div class="section">
            <div class="section-label">添加知识</div>
            <div class="form-row">
              <input v-model="docTitle" placeholder="文档标题" />
            </div>
            <div class="form-row">
              <textarea v-model="docContent" placeholder="文档内容..."></textarea>
            </div>
            <button class="action-btn" :disabled="busy || !docTitle.trim() || !docContent.trim()" @click="submitKnowledge">
              添加文档
            </button>
            <label class="file-upload-label" style="margin-top:8px">
              📎 上传文件
              <input type="file" @change="handleUpload" />
            </label>
          </div>

          <!-- Stats -->
          <div class="section" v-if="knowledgeStats !== null">
            <div class="section-label">知识库统计</div>
            <div class="result-card">
              总文档片段: <strong>{{ knowledgeStats }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== Skills Panel Overlay ====== -->
    <div v-if="activePanel === 'skills'" class="panel-overlay" @click.self="closePanel">
      <div class="panel-dialog">
        <div class="panel-dialog-header">
          <h3>⚡ 技能注入 (Skills)</h3>
          <button class="close-btn" @click="closePanel">×</button>
        </div>
        <div class="panel-dialog-body">
          <div v-if="skills.length === 0" style="text-align:center;color:var(--text-muted);padding:20px">
            未加载到技能，请检查后端 skills 目录配置
          </div>
          <div v-for="(skill, i) in skills" :key="i" class="skill-card">
            <div class="skill-icon">📋</div>
            <div class="skill-info">
              <div class="skill-name">{{ skill.name || skill.id || '未命名技能' }}</div>
              <div class="skill-desc">{{ skill.description || '无描述' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import {
  createInitialSettings,
  saveSettings,
  checkHealth,
  sendChat,
  searchKnowledge,
  getKnowledgeStats,
  addKnowledge,
  uploadKnowledge,
  listSkills,
  loadConversations,
  createConversation,
  updateConversationTitle,
  deleteConversation,
} from "./lib/backends";

/* ---- State ---- */
const settings = reactive(createInitialSettings());
const messages = ref([]);
const draft = ref("");
const busy = ref(false);
const healthOk = ref(false);
const sidebarOpen = ref(true);

// Panels
const activePanel = ref(null); // 'knowledge' | 'skills' | null

// Knowledge
const searchQuery = ref("");
const searchResults = ref([]);
const searchDone = ref(false);
const docTitle = ref("");
const docContent = ref("");
const knowledgeStats = ref(null);

// Skills
const skills = ref([]);
const skillCount = ref(0);

// Conversations
const conversations = ref(loadConversations());
const activeConvId = ref("");

// Refs
const chatArea = ref(null);
const inputEl = ref(null);

/* ---- Init ---- */
onMounted(async () => {
  try {
    const data = await checkHealth(settings);
    healthOk.value = data.status === "ok";
  } catch {
    healthOk.value = false;
  }
  loadSkillsIfReady();
  loadKnowledgeStatsIfReady();
});

async function loadSkillsIfReady() {
  try {
    const data = await listSkills(settings);
    skills.value = Array.isArray(data) ? data : data.skills || [];
    skillCount.value = skills.value.length;
  } catch { /* ignore */ }
}

async function loadKnowledgeStatsIfReady() {
  try {
    const data = await getKnowledgeStats(settings);
    knowledgeStats.value = data.total_chunks ?? data.totalChunks ?? 0;
  } catch { /* ignore */ }
}

/* ---- Sidebar ---- */
function togglePanel(name) {
  activePanel.value = activePanel.value === name ? null : name;
  if (name === "skills") loadSkillsIfReady();
  if (name === "knowledge") loadKnowledgeStatsIfReady();
}

function closePanel() {
  activePanel.value = null;
}

/* ---- Conversations ---- */
function startNewChat() {
  messages.value = [];
  activeConvId.value = "";
  settings.conversationId = "";
  saveSettings(settings);
}

function switchConversation(conv) {
  activeConvId.value = conv.id;
  settings.conversationId = conv.id;
  saveSettings(settings);
  messages.value = [];
}

function removeConv(id) {
  conversations.value = deleteConversation(id);
  if (activeConvId.value === id) startNewChat();
}

/* ---- Chat ---- */
async function doSend(content) {
  if (!content.trim() || busy.value) return;
  messages.value.push({ role: "user", content });
  draft.value = "";
  busy.value = true;

  // Auto-create conversation
  if (!activeConvId.value) {
    const conv = createConversation(content.slice(0, 30));
    activeConvId.value = conv.id;
    settings.conversationId = conv.id;
    saveSettings(settings);
    conversations.value = loadConversations();
  }

  try {
    const res = await sendChat(settings, content, activeConvId.value);
    const meta = [res.intent, res.agentType, res.knowledgeUsed ? "RAG" : ""]
      .filter(Boolean)
      .join(" · ");
    messages.value.push({
      role: "assistant",
      content: res.response || "(无响应)",
      meta: meta || undefined,
    });
    // Update title
    if (messages.value.length <= 2) {
      updateConversationTitle(activeConvId.value, content.slice(0, 30));
      conversations.value = loadConversations();
    }
  } catch (err) {
    messages.value.push({
      role: "assistant",
      content: `❌ 请求失败: ${err.message}`,
      meta: "错误",
    });
  } finally {
    busy.value = false;
    await nextTick();
    scrollToBottom();
  }
}

function send() {
  doSend(draft.value);
}

function sendSuggestion(text) {
  doSend(text);
}

/* ---- Knowledge Panel ---- */
async function doSearch() {
  if (!searchQuery.value.trim()) return;
  busy.value = true;
  searchDone.value = false;
  try {
    const data = await searchKnowledge(settings, searchQuery.value, 5);
    searchResults.value = data.results || [];
    searchDone.value = true;
  } catch (err) {
    searchResults.value = [];
    searchDone.value = true;
  } finally {
    busy.value = false;
  }
}

async function submitKnowledge() {
  if (!docTitle.value.trim() || !docContent.value.trim()) return;
  busy.value = true;
  try {
    await addKnowledge(settings, [
      { title: docTitle.value.trim(), content: docContent.value.trim() },
    ]);
    docTitle.value = "";
    docContent.value = "";
    await loadKnowledgeStatsIfReady();
  } catch (err) {
    alert("添加失败: " + err.message);
  } finally {
    busy.value = false;
  }
}

async function handleUpload(e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  busy.value = true;
  try {
    await uploadKnowledge(settings, file);
    await loadKnowledgeStatsIfReady();
  } catch (err) {
    alert("上传失败: " + err.message);
  } finally {
    busy.value = false;
  }
}

/* ---- Helpers ---- */
function scrollToBottom() {
  const el = chatArea.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function autoResize() {
  const el = inputEl.value;
  if (el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }
}
</script>
