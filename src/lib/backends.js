/* ===== AfterSales Multi-Agent System Frontend — API Layer ===== */

const SETTINGS_KEY = "aftersales.v2.settings";

/* ---------- settings ---------- */
export function createInitialSettings() {
  const saved = readSettings();
  return {
    backend: saved.backend || "python",
    userId: saved.userId || "u1001",
    conversationId: saved.conversationId || "",
    endpoint: saved.endpoint || "/api/python",
  };
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function baseUrl(settings) {
  return String(settings.endpoint || "/api/python").replace(/\/+$/, "");
}

/* ---------- HTTP ---------- */
async function requestJson(base, path, options = {}) {
  const url = `${base}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return data;
}

/* ---------- Health ---------- */
export function checkHealth(settings) {
  return requestJson(baseUrl(settings), "/health");
}

/* ---------- Chat ---------- */
export function sendChat(settings, message, convId) {
  const payload = {
    message,
    user_id: settings.userId || "anonymous",
    conv_id: convId || settings.conversationId || undefined,
  };
  return requestJson(baseUrl(settings), "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* ---------- Search ---------- */
export function searchKnowledge(settings, query, topK = 5) {
  const params = new URLSearchParams({ query, topK: String(topK) });
  return requestJson(baseUrl(settings), `/search?${params}`, { method: "POST" });
}

/* ---------- Knowledge ---------- */
export function getKnowledgeStats(settings) {
  return requestJson(baseUrl(settings), "/knowledge/stats");
}

export function addKnowledge(settings, documents) {
  return requestJson(baseUrl(settings), "/knowledge/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documents }),
  });
}

export function uploadKnowledge(settings, file) {
  const form = new FormData();
  form.append("file", file);
  return requestJson(baseUrl(settings), "/knowledge/upload", {
    method: "POST",
    body: form,
  });
}

/* ---------- Skills ---------- */
export function listSkills(settings) {
  return requestJson(baseUrl(settings), "/skills");
}

/* ---------- Monitor ---------- */
export function getMonitor(settings) {
  return requestJson(baseUrl(settings), "/monitor");
}

/* ---------- Local Conversations (localStorage) ---------- */
const CONVS_KEY = "aftersales.v2.conversations";

export function loadConversations() {
  try {
    return JSON.parse(localStorage.getItem(CONVS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveConversations(convs) {
  localStorage.setItem(CONVS_KEY, JSON.stringify(convs));
}

export function createConversation(title) {
  const convs = loadConversations();
  const now = Date.now();
  const conv = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || "新对话",
    createdAt: now,
    updatedAt: now,
  };
  convs.unshift(conv);
  saveConversations(convs);
  return conv;
}

export function updateConversationTitle(id, title) {
  const convs = loadConversations();
  const conv = convs.find((c) => c.id === id);
  if (conv) {
    conv.title = title;
    conv.updatedAt = Date.now();
    saveConversations(convs);
  }
}

export function deleteConversation(id) {
  const convs = loadConversations().filter((c) => c.id !== id);
  saveConversations(convs);
  return convs;
}
