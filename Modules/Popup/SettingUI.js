class SettingUI {
    constructor(settingManager) {
        this.settingManager = settingManager;
    }

    // 初始化设置管理器
    init() {
        this.initTabSwitching();
        this.settingManager.loadSettings();
        this.setupEventListeners();
        
        // 添加密码显示/隐藏功能
        this.setupPasswordToggle();
    
        // 从manifest.json获取版本号并显示
        this.loadExtensionVersion();
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
        
        // 分类平台选择变化事件
        const classifyModelElement = document.getElementById('ai-classify-model');
        if (classifyModelElement) {
            classifyModelElement.addEventListener('change', (event) => {
                // 当选择的分类平台改变时，显示对应的二级模型选择
                const selectedPlatform = event.target.value;
                this.settingManager.updateClassifyModelSelector(selectedPlatform);
            });
        }
    }

    
    // 从manifest.json获取版本号
    loadExtensionVersion() {
        const versionElement = document.getElementById('extension-version');
        if (!versionElement) return;
        
        try {
            // 使用chrome.runtime.getManifest()获取清单信息
            const manifest = chrome.runtime.getManifest();
            versionElement.textContent = manifest.version;
        } catch (error) {
            console.error("[PKU TreeHole] 获取版本号失败:", error);
            versionElement.textContent = "获取失败";
        }
    }
    
    // 设置密码显示/隐藏功能
    setupPasswordToggle() {
        const toggleButton = document.getElementById('toggle-password');
        const passwordInput = document.getElementById('api-key');
        
        if (toggleButton && passwordInput) {
        toggleButton.addEventListener('click', function() {
            // 切换密码的显示类型
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // 更改眼睛图标
            if (type === 'password') {
            // 闭眼状态
            this.textContent = '👁️';
            } else {
            // 开眼状态
            this.textContent = '👁️‍🗨️';
            }
        });
        }
    }
}

// 导出SettingUI类
export default SettingUI;
