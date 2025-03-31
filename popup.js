
async function initializePopup(){
  try {
    // 动态导入SettingManager模块
    const SettingUIModule = await import('./Modules/Popup/SettingUI.js');
    const SettingManagerModule = await import('./Modules/Popup/SettingManager.js');
    const SettingManager = SettingManagerModule.default;
    const SettingUI = SettingUIModule.default;

    const settingManager = new SettingManager();
    const settingUI = new SettingUI(settingManager);
    settingUI.init();
  } catch (error) {
    console.error("[PKU TreeHole] 模块加载失败:", error);
  }
}

initializePopup();
/*
document.addEventListener('DOMContentLoaded', function() {
  // 标签切换逻辑
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // 移除所有标签的active类
      tabs.forEach(t => t.classList.remove('active'));
      
      // 给当前点击的标签添加active类
      this.classList.add('active');
      
      // 获取当前标签对应的内容id
      const tabId = this.getAttribute('data-tab');
      
      // 隐藏所有内容
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // 显示当前标签对应的内容
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // 加载保存的设置
  loadSettings();
  
  // 保存设置按钮事件
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  
  // AI平台选择变化事件
  document.getElementById('ai-model').addEventListener('change', function() {
    // 当选择的平台改变时，显示对应的二级模型选择
    const selectedPlatform = this.value;
    updateModelSelector(selectedPlatform);
    
    // 加载平台对应的API密钥
    chrome.storage.sync.get({
      apiKeys: {},
    }, function(items) {
      const apiKeys = items.apiKeys || {};
      
      document.getElementById('api-key').value = apiKeys[selectedPlatform] || '';
    });
  });
});

// 更新模型选择器的显示状态
function updateModelSelector(platform) {
  const deepseekModelContainer = document.getElementById('deepseek-model-container');
  const zhipuModelContainer = document.getElementById('zhipu-model-container');
  
  // 根据选择的平台显示对应的模型选择器
  if (platform === 'deepseek') {
    deepseekModelContainer.style.display = 'block';
    zhipuModelContainer.style.display = 'none';
  } else if (platform === 'zhipu') {
    deepseekModelContainer.style.display = 'none';
    zhipuModelContainer.style.display = 'block';
  }
}

// 保存设置到Chrome Storage
function saveSettings() {
  const exportMode = document.getElementById('export-mode').value;
  const aiPlatform = document.getElementById('ai-model').value;
  const apiKey = document.getElementById('api-key').value;
  
  // 获取对应平台下的模型选择
  let subModel = '';
  if (aiPlatform === 'deepseek') {
    subModel = document.getElementById('deepseek-model').value;
  } else if (aiPlatform === 'zhipu') {
    subModel = document.getElementById('zhipu-model').value;
  }
  
  // 先获取已保存的设置
  chrome.storage.sync.get({
    // 默认值
    exportMode: 'both',
    aiPlatform: 'deepseek',
    subModel: 'deepseek-chat',
    apiKeys: {}, // 存储不同平台的API Keys
  }, function(items) {
    // 更新当前选择平台的API密钥
    const apiKeys = items.apiKeys || {};
    
    // 只有当密钥不为空时才保存，避免清空已保存的密钥
    if (apiKey) {
      apiKeys[aiPlatform] = apiKey;
    }
    
    // 保存设置
    chrome.storage.sync.set({
      exportMode: exportMode,
      aiPlatform: aiPlatform,
      subModel: subModel,
      apiKeys: apiKeys,
    }, function() {
      // 显示保存成功消息
      const successMessage = document.getElementById('save-success');
      successMessage.style.display = 'block';
      
      // 3秒后隐藏消息
      setTimeout(function() {
        successMessage.style.display = 'none';
      }, 3000);
    });
  });
}

// 从Chrome Storage加载设置
function loadSettings() {
  chrome.storage.sync.get({
    // 默认值
    exportMode: 'both',
    aiPlatform: 'deepseek',
    subModel: 'deepseek-chat',
    apiKeys: {},
  }, function(items) {
    document.getElementById('export-mode').value = items.exportMode;
    document.getElementById('ai-model').value = items.aiPlatform;
    
    // 显示对应的二级模型选择器
    updateModelSelector(items.aiPlatform);
    
    // 设置选中的子模型
    if (items.aiPlatform === 'deepseek') {
      document.getElementById('deepseek-model').value = items.subModel || 'deepseek-chat';
    } else if (items.aiPlatform === 'zhipu') {
      document.getElementById('zhipu-model').value = items.subModel || 'glm-4';
    }
    
    // 加载对应平台的API密钥
    const apiKeys = items.apiKeys || {};
    document.getElementById('api-key').value = apiKeys[items.aiPlatform] || '';
  });
} */