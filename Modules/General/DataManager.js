class DataManager {
    constructor() {
        this.holesData = [];
        this.allCommentsData = [];
    }

    
    // 获取导出设置
    getExportSettings() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.sync.get({
                    // 默认值
                    exportMode: 'both'
                }, function(items) {
                    resolve(items.exportMode);
                });
            } else {
                // 如果无法访问chrome.storage，使用默认值
                resolve('both');
            }
        });
    }
    
    // 获取API设置
    getApiSettings() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.sync.get({
                    // 默认值
                    aiPlatform: 'deepseek',
                    subModel: 'deepseek-chat',
                    apiKeys: {},
                }, function(items) {
                    const currentPlatform = items.aiPlatform;
                    const currentSubModel = items.subModel;
                    const apiKeys = items.apiKeys || {};
                    
                    resolve({
                        aiPlatform: currentPlatform,
                        subModel: currentSubModel,
                        apiKey: apiKeys[currentPlatform] || '',
                    });
                });
            } else {
                // 如果无法访问chrome.storage，返回空值
                resolve({
                    aiPlatform: 'deepseek',
                    subModel: 'deepseek-chat',
                    apiKey: '',
                });
            }
        });
    }
    
    // 获取分类专用的API设置
    getClassifyApiSettings() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.sync.get({
                    // 默认值
                    aiPlatform: 'deepseek',  // 用于回溯兼容
                    classifyAiPlatform: 'zhipu',
                    classifySubModel: 'glm-4-flash',
                    apiKeys: {},
                }, function(items) {
                    const classifyPlatform = items.classifyAiPlatform || 'zhipu';
                    const classifySubModel = items.classifySubModel || 'glm-4-flash';
                    const apiKeys = items.apiKeys || {};
                    
                    resolve({
                        aiPlatform: classifyPlatform,
                        subModel: classifySubModel,
                        apiKey: apiKeys[classifyPlatform] || '',
                    });
                });
            } else {
                // 如果无法访问chrome.storage，返回空值
                resolve({
                    aiPlatform: 'zhipu',
                    subModel: 'glm-4-flash',
                    apiKey: '',
                });
            }
        });
    }
}

export default DataManager;
