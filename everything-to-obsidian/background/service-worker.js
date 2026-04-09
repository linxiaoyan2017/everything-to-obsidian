/**
 * service-worker.js — Background Service Worker (MV3)
 * 8.1 消息监听协调  8.2 保活策略  8.3 任务状态持久化
 */

// ─── 8.2 Service Worker 保活 ──────────────────────────────────
// MV3 Service Worker 不活跃时会被 Chrome 终止
// 使用 chrome.alarms 定期心跳保持活跃（批量任务期间）

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    // 心跳：检查是否有进行中的任务
    chrome.storage.session.get({ importProgress: null }, ({ importProgress }) => {
      if (!importProgress) {
        // 没有任务了，停止心跳
        chrome.alarms.clear('keepalive');
      }
      // 有任务则继续保活（什么都不做，onAlarm 触发本身就能唤醒 SW）
    });
  }
});

// ─── 8.1 消息监听 ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_IMPORT':
      // 批量导入开始：启动心跳保活
      startKeepalive();
      sendResponse({ ok: true });
      break;

    case 'STOP_IMPORT':
      // 批量导入结束：清除心跳
      stopKeepalive();
      sendResponse({ ok: true });
      break;

    case 'GET_PROGRESS':
      // Popup 重新打开时查询当前进度
      chrome.storage.session.get({ importProgress: null }, ({ importProgress }) => {
        sendResponse({ importProgress });
      });
      return true; // 保持消息通道开放（异步）

    default:
      sendResponse({ ok: false, error: 'Unknown message type' });
  }
});

// ─── 8.2 心跳控制 ─────────────────────────────────────────────

function startKeepalive() {
  // 每 25 秒触发一次（Chrome SW 默认 30s 无活动后终止）
  chrome.alarms.create('keepalive', { periodInMinutes: 0.4 });
}

function stopKeepalive() {
  chrome.alarms.clear('keepalive');
  // 8.3 清除任务状态
  chrome.storage.session.remove('importProgress');
}

// ─── 安装事件 ─────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // 首次安装：打开设置页引导用户授权目录
    chrome.runtime.openOptionsPage();
  }
});
