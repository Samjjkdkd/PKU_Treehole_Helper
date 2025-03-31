// SettingManager.js - 处理插件设置的管理类

class SettingManager {
    constructor() {
        // 默认设置
        this.defaultSettings = {
            exportMode: 'both',
            aiPlatform: 'zhipu',
            subModel: 'glm-4',
            apiKeys: {}
        };
    }
    
    // 更新模型选择器的显示状态
    updateModelSelector(platform) {
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
    saveSettings() {
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
        chrome.storage.sync.get(this.defaultSettings, (items) => {
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
            }, () => {
                // 显示保存成功消息
                const successMessage = document.getElementById('save-success');
                successMessage.style.display = 'block';
                
                // 3秒后隐藏消息
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
            });
        });
    }
    
    // 从Chrome Storage加载设置
    loadSettings() {
        chrome.storage.sync.get(this.defaultSettings, (items) => {
            document.getElementById('export-mode').value = items.exportMode;
            document.getElementById('ai-model').value = items.aiPlatform;
            
            // 显示对应的二级模型选择器
            this.updateModelSelector(items.aiPlatform);
            
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
    }
}

// 导出SettingManager类，以便在其他文件中引用
export default SettingManager;
