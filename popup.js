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
  
  // AI模型选择变化事件
  document.getElementById('ai-model').addEventListener('change', function() {
    updateSecretKeyVisibility(this.value);
  });
});

// 保存设置到Chrome Storage
function saveSettings() {
  const exportMode = document.getElementById('export-mode').value;
  const aiModel = document.getElementById('ai-model').value;
  const apiKey = document.getElementById('api-key').value;
  const apiSecret = document.getElementById('api-secret').value;
  
  chrome.storage.sync.set({
    exportMode: exportMode,
    aiModel: aiModel,
    apiKey: apiKey,
    apiSecret: apiSecret
  }, function() {
    // 显示保存成功消息
    const successMessage = document.getElementById('save-success');
    successMessage.style.display = 'block';
    
    // 3秒后隐藏消息
    setTimeout(function() {
      successMessage.style.display = 'none';
    }, 3000);
  });
}

// 从Chrome Storage加载设置
function loadSettings() {
  chrome.storage.sync.get({
    // 默认值
    exportMode: 'both',
    aiModel: 'baidu',
    apiKey: '',
    apiSecret: ''
  }, function(items) {
    document.getElementById('export-mode').value = items.exportMode;
    document.getElementById('ai-model').value = items.aiModel;
    document.getElementById('api-key').value = items.apiKey;
    document.getElementById('api-secret').value = items.apiSecret;
    
    // 根据选择的AI模型显示或隐藏Secret Key
    updateSecretKeyVisibility(items.aiModel);
  });
}

// 根据AI模型类型显示或隐藏Secret Key输入框
function updateSecretKeyVisibility(model) {
  const secretKeyContainer = document.getElementById('secret-key-container');
  if (model === 'zhipu') {
    secretKeyContainer.style.display = 'none';
  } else {
    secretKeyContainer.style.display = 'block';
  }
} 