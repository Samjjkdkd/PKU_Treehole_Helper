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
});

// 保存设置到Chrome Storage
function saveSettings() {
  const exportMode = document.getElementById('export-mode').value;
  
  chrome.storage.sync.set({
    exportMode: exportMode
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
    exportMode: 'both'
  }, function(items) {
    document.getElementById('export-mode').value = items.exportMode;
  });
} 