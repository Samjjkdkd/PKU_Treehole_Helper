class SettingUI {
    constructor(settingManager) {
        this.settingManager = settingManager;
    }

    // 初始化设置管理器
    init() {
        this.initTabSwitching();
        this.settingManager.loadSettings();
        this.setupEventListeners();
    }
    
    // 初始化标签切换逻辑
    initTabSwitching() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 移除所有标签的active类
                tabs.forEach(t => t.classList.remove('active'));
                
                // 给当前点击的标签添加active类
                tab.classList.add('active');
                
                // 获取当前标签对应的内容id
                const tabId = tab.getAttribute('data-tab');
                
                // 隐藏所有内容
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // 显示当前标签对应的内容
                document.getElementById(tabId).classList.add('active');
            });
        });
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 保存设置按钮事件
        document.getElementById('save-settings').addEventListener('click', () => this.settingManager.saveSettings());
        
        // AI平台选择变化事件
        document.getElementById('ai-model').addEventListener('change', (event) => {
            // 当选择的平台改变时，显示对应的二级模型选择
            const selectedPlatform = event.target.value;
            this.settingManager.updateModelSelector(selectedPlatform);
            
            // 加载平台对应的API密钥
            chrome.storage.sync.get({
                apiKeys: {},
            }, (items) => {
                const apiKeys = items.apiKeys || {};
                document.getElementById('api-key').value = apiKeys[selectedPlatform] || '';
            });
        });
    }
}

// 导出SettingUI类
export default SettingUI;
