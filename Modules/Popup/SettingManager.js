// SettingManager.js - 处理插件设置的管理类

class SettingManager {
    constructor() {
        // 默认设置
        this.defaultSettings = {
            exportMode: 'both',
            aiPlatform: 'zhipu',
            subModel: 'glm-4',
            classifyAiPlatform: 'zhipu',  // 新增：分类专用AI平台
            classifySubModel: 'glm-4-flash', // 新增：分类专用子模型
            apiKeys: {}
        };
    }
    
    // 更新模型选择器的显示状态
    updateModelSelector(platform) {
        const deepseekModelContainer = document.getElementById('deepseek-model-container');
        const zhipuModelContainer = document.getElementById('zhipu-model-container');
        const deerapiModelContainer = document.getElementById('deerapi-model-container');
        
        // 隐藏所有模型选择器
        deepseekModelContainer.style.display = 'none';
        zhipuModelContainer.style.display = 'none';
        if (deerapiModelContainer) {
            deerapiModelContainer.style.display = 'none';
        }
        
        // 根据选择的平台显示对应的模型选择器
        if (platform === 'deepseek') {
            deepseekModelContainer.style.display = 'block';
        } else if (platform === 'zhipu') {
            zhipuModelContainer.style.display = 'block';
        } else if (platform === 'deerapi' && deerapiModelContainer) {
            deerapiModelContainer.style.display = 'block';
        }
    }
    
    // 更新分类模型选择器的显示状态
    updateClassifyModelSelector(platform) {
        const deepseekClassifyModelContainer = document.getElementById('deepseek-classify-model-container');
        const zhipuClassifyModelContainer = document.getElementById('zhipu-classify-model-container');
        const deerapiClassifyModelContainer = document.getElementById('deerapi-classify-model-container');
        
        // 检查元素是否存在，防止错误
        if (!deepseekClassifyModelContainer || !zhipuClassifyModelContainer) {
            console.error('分类模型容器元素不存在，无法更新显示状态');
            return;
        }
        
        // 隐藏所有分类模型选择器
        deepseekClassifyModelContainer.style.display = 'none';
        zhipuClassifyModelContainer.style.display = 'none';
        if (deerapiClassifyModelContainer) {
            deerapiClassifyModelContainer.style.display = 'none';
        }
        
        // 根据选择的平台显示对应的分类模型选择器
        if (platform === 'deepseek') {
            deepseekClassifyModelContainer.style.display = 'block';
        } else if (platform === 'zhipu') {
            zhipuClassifyModelContainer.style.display = 'block';
        } else if (platform === 'deerapi' && deerapiClassifyModelContainer) {
            deerapiClassifyModelContainer.style.display = 'block';
        }
    }
    
    // 保存设置到Chrome Storage
    saveSettings() {
        const exportMode = document.getElementById('export-mode').value;
        const aiPlatform = document.getElementById('ai-model').value;
        const apiKey = document.getElementById('api-key').value;
        
        // 获取分类专用AI平台和模型
        const classifyAiPlatform = document.getElementById('ai-classify-model')?.value || 'zhipu';
        
        // 获取对应平台下的模型选择
        let subModel = '';
        if (aiPlatform === 'deepseek') {
            subModel = document.getElementById('deepseek-model').value;
        } else if (aiPlatform === 'zhipu') {
            subModel = document.getElementById('zhipu-model').value;
        } else if (aiPlatform === 'deerapi') {
            const deerapiModelElement = document.getElementById('deerapi-model');
            if (deerapiModelElement) {
                subModel = deerapiModelElement.value;
            } else {
                subModel = 'gpt-4o'; // 默认使用gpt-4o
            }
        }
        
        // 获取分类专用的子模型
        let classifySubModel = '';
        if (classifyAiPlatform === 'deepseek') {
            classifySubModel = document.getElementById('deepseek-classify-model')?.value || 'deepseek-chat';
        } else if (classifyAiPlatform === 'zhipu') {
            classifySubModel = document.getElementById('zhipu-classify-model')?.value || 'glm-4-flash';
        } else if (classifyAiPlatform === 'deerapi') {
            const deerapiClassifyModelElement = document.getElementById('deerapi-classify-model');
            if (deerapiClassifyModelElement) {
                classifySubModel = deerapiClassifyModelElement.value;
            } else {
                classifySubModel = 'gpt-3.5-turbo'; // 分类用轻量模型
            }
        }
        
        // 先获取已保存的设置
        chrome.storage.sync.get(this.defaultSettings, (items) => {
            // 更新当前选择平台的API密钥
            const apiKeys = items.apiKeys || {};
            
            // 只有当密钥不为空时才保存，避免清空已保存的密钥
            if (apiKey) {
                apiKeys[aiPlatform] = apiKey;
                
                // 同时为分类平台保存相同的API Key（如果与主平台不同）
                if (classifyAiPlatform !== aiPlatform) {
                    apiKeys[classifyAiPlatform] = apiKey;
                }
            }
            
            // 保存设置
            chrome.storage.sync.set({
                exportMode: exportMode,
                aiPlatform: aiPlatform,
                subModel: subModel,
                classifyAiPlatform: classifyAiPlatform, // 保存分类专用的AI平台
                classifySubModel: classifySubModel,     // 保存分类专用的子模型
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
            } else if (items.aiPlatform === 'deerapi') {
                const deerapiModelElement = document.getElementById('deerapi-model');
                if (deerapiModelElement) {
                    deerapiModelElement.value = items.subModel || 'gpt-4o';
                }
            }
            
            // 加载分类专用的AI平台和模型设置
            const classifyModelElement = document.getElementById('ai-classify-model');
            if (classifyModelElement) {
                classifyModelElement.value = items.classifyAiPlatform || 'zhipu';
                
                // 更新分类模型选择器的显示状态
                this.updateClassifyModelSelector(items.classifyAiPlatform || 'zhipu');
                
                // 设置选中的分类子模型
                if (items.classifyAiPlatform === 'deepseek') {
                    const element = document.getElementById('deepseek-classify-model');
                    if (element) {
                        element.value = items.classifySubModel || 'deepseek-chat';
                    }
                } else if (items.classifyAiPlatform === 'zhipu') {
                    const element = document.getElementById('zhipu-classify-model');
                    if (element) {
                        element.value = items.classifySubModel || 'glm-4-flash';
                    }
                } else if (items.classifyAiPlatform === 'deerapi') {
                    const element = document.getElementById('deerapi-classify-model');
                    if (element) {
                        element.value = items.classifySubModel || 'gpt-3.5-turbo';
                    }
                }
            }
            
            // 加载对应平台的API密钥
            const apiKeys = items.apiKeys || {};
            document.getElementById('api-key').value = apiKeys[items.aiPlatform] || '';
        });
    }
}

// 导出SettingManager类，以便在其他文件中引用
export default SettingManager;
