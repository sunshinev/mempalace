// MemPalace i18n - Chinese/English switching
const I18N = {
  en: {
    // Nav
    "nav.dashboard": "Dashboard",
    "nav.palace": "Palace",
    "nav.kg": "Knowledge Graph",
    "nav.search": "Search",
    "nav.diary": "Diary",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.total_drawers": "Total Drawers",
    "dashboard.wings": "Wings",
    "dashboard.rooms": "Rooms",
    "dashboard.kg_entities": "KG Entities",
    "dashboard.kg_triples": "KG Triples",
    "dashboard.wing_distribution": "Wing Distribution",
    "dashboard.no_data": "No data yet",

    // Search
    "search.title": "Search",
    "search.placeholder": "Search memories...",
    "search.all_wings": "All Wings",
    "search.all_rooms": "All Rooms",
    "search.btn": "Search",
    "search.enter_query": "Enter a search query",
    "search.searching": "Searching...",
    "search.no_results": "No results found.",
    "search.failed": "Search failed",
    "search.results": "Results",

    // Drawer
    "drawer.add_title": "Add New Drawer",
    "drawer.wing": "Wing",
    "drawer.room": "Room",
    "drawer.source": "Source File (optional)",
    "drawer.content": "Drawer content...",
    "drawer.add_btn": "Add Drawer",
    "drawer.added": "Drawer added successfully",
    "drawer.add_failed": "Failed to add drawer",
    "drawer.required": "Wing, room, and content are required",
    "drawer.deleted": "Drawer deleted",
    "drawer.delete_failed": "Failed to delete drawer",
    "drawer.confirm_delete": "Delete this drawer?",
    "drawer.delete_btn": "Delete",
    "drawer.drawers": "drawer(s)",

    // Palace
    "palace.title": "Palace Architecture",
    "palace.total_drawers": "total drawers",
    "palace.loading": "Loading drawers...",
    "palace.no_data": "No data in palace yet. Add some drawers to see the graph.",
    "palace.error": "Failed to load palace data",

    // KG
    "kg.title": "Knowledge Graph",
    "kg.search_entity": "Search entity...",
    "kg.load": "Load",
    "kg.load_all": "Load All",
    "kg.add_fact": "Add Fact",
    "kg.subject": "Subject",
    "kg.predicate": "Predicate",
    "kg.object": "Object",
    "kg.valid_from": "Valid From",
    "kg.facts": "fact(s)",
    "kg.no_facts": "No facts in knowledge graph yet.",
    "kg.no_facts_for": "No facts found for this entity.",
    "kg.error": "Failed to load knowledge graph",
    "kg.fact_added": "Fact added",
    "kg.fact_add_failed": "Failed to add fact",
    "kg.fact_required": "Subject, predicate, and object are required",
    "kg.invalidated": "Fact invalidated",
    "kg.invalidate_failed": "Failed to invalidate fact",
    "kg.invalidate_confirm": "Invalidate this fact?",
    "kg.connections": "Connections",

    // Diary
    "diary.title": "Diary",
    "diary.agent_name": "Agent name...",
    "diary.load_btn": "Load Entries",
    "diary.no_entries": "No diary entries found for this agent.",
    "diary.load_failed": "Failed to load diary entries",
    "diary.enter_agent": "Enter an agent name",
    "diary.new_entry": "New Entry",
    "diary.agent_write": "Agent name",
    "diary.topic": "Topic (optional)",
    "diary.entry_placeholder": "Write diary entry...",
    "diary.write_btn": "Write Entry",
    "diary.written": "Diary entry written",
    "diary.write_failed": "Failed to write diary entry",
    "diary.agent_required": "Agent name and entry are required",

    // Common
    "common.type": "Type",
    "common.wing": "Wing",
    "common.loading": "Loading...",
    "common.failed_load": "Failed to load",

    // Language
    "lang.switch": "EN / 中文"
  },

  zh: {
    // Nav
    "nav.dashboard": "仪表盘",
    "nav.palace": "宫殿",
    "nav.kg": "知识图谱",
    "nav.search": "搜索",
    "nav.diary": "日记",

    // Dashboard
    "dashboard.title": "仪表盘",
    "dashboard.total_drawers": "总抽屉数",
    "dashboard.wings": "翼区",
    "dashboard.rooms": "房间",
    "dashboard.kg_entities": "知识图谱实体",
    "dashboard.kg_triples": "知识图谱三元组",
    "dashboard.wing_distribution": "翼区分布",
    "dashboard.no_data": "暂无数据",

    // Search
    "search.title": "搜索",
    "search.placeholder": "搜索记忆...",
    "search.all_wings": "所有翼区",
    "search.all_rooms": "所有房间",
    "search.btn": "搜索",
    "search.enter_query": "请输入搜索内容",
    "search.searching": "搜索中...",
    "search.no_results": "未找到结果。",
    "search.failed": "搜索失败",
    "search.results": "结果",

    // Drawer
    "drawer.add_title": "添加新抽屉",
    "drawer.wing": "翼区",
    "drawer.room": "房间",
    "drawer.source": "来源文件（可选）",
    "drawer.content": "抽屉内容...",
    "drawer.add_btn": "添加抽屉",
    "drawer.added": "抽屉添加成功",
    "drawer.add_failed": "添加抽屉失败",
    "drawer.required": "翼区、房间和内容为必填项",
    "drawer.deleted": "抽屉已删除",
    "drawer.delete_failed": "删除抽屉失败",
    "drawer.confirm_delete": "确定删除此抽屉？",
    "drawer.delete_btn": "删除",
    "drawer.drawers": "个抽屉",

    // Palace
    "palace.title": "宫殿架构",
    "palace.total_drawers": "个抽屉",
    "palace.loading": "加载抽屉中...",
    "palace.no_data": "宫殿中暂无数据。添加抽屉后可查看图谱。",
    "palace.error": "加载宫殿数据失败",

    // KG
    "kg.title": "知识图谱",
    "kg.search_entity": "搜索实体...",
    "kg.load": "加载",
    "kg.load_all": "加载全部",
    "kg.add_fact": "添加事实",
    "kg.subject": "主语",
    "kg.predicate": "谓语",
    "kg.object": "宾语",
    "kg.valid_from": "生效日期",
    "kg.facts": "条事实",
    "kg.no_facts": "知识图谱中暂无事实。",
    "kg.no_facts_for": "未找到该实体的事实。",
    "kg.error": "加载知识图谱失败",
    "kg.fact_added": "事实添加成功",
    "kg.fact_add_failed": "添加事实失败",
    "kg.fact_required": "主语、谓语和宾语为必填项",
    "kg.invalidated": "事实已失效",
    "kg.invalidate_failed": "标记失效失败",
    "kg.invalidate_confirm": "确定标记此事实为失效？",
    "kg.connections": "个连接",

    // Diary
    "diary.title": "日记",
    "diary.agent_name": "代理名称...",
    "diary.load_btn": "加载条目",
    "diary.no_entries": "未找到该代理的日记条目。",
    "diary.load_failed": "加载日记条目失败",
    "diary.enter_agent": "请输入代理名称",
    "diary.new_entry": "新条目",
    "diary.agent_write": "代理名称",
    "diary.topic": "主题（可选）",
    "diary.entry_placeholder": "写日记...",
    "diary.write_btn": "写入条目",
    "diary.written": "日记已写入",
    "diary.write_failed": "写入日记失败",
    "diary.agent_required": "代理名称和内容为必填项",

    // Common
    "common.type": "类型",
    "common.wing": "翼区",
    "common.loading": "加载中...",
    "common.failed_load": "加载失败",

    // Language
    "lang.switch": "中文 / EN"
  }
};

const LANG_STORAGE_KEY = "mempalace_lang";

function getLang() {
  return localStorage.getItem(LANG_STORAGE_KEY) || "en";
}

function setLang(lang) {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyI18n();
}

function t(key) {
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || key;
}

function toggleLang() {
  const current = getLang();
  setLang(current === "en" ? "zh" : "en");
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    const key = el.getAttribute("data-i18n");
    const translated = t(key);
    const tag = el.tagName.toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA") {
      el.placeholder = translated;
    } else {
      el.textContent = translated;
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  applyI18n();
});

// ── Theme (Dark / Light) ──────────────────────────────────
const THEME_STORAGE_KEY = "mempalace_theme";

function getTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || "dark";
}

function setTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme();
}

function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

function applyTheme() {
  const theme = getTheme();
  if (theme === "light") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }
  const btn = document.getElementById("theme-switch");
  if (btn) btn.textContent = theme === "dark" ? "Dark / Light" : "Light / Dark";
}

// Apply theme immediately on script load (before DOMContentLoaded)
applyTheme();
