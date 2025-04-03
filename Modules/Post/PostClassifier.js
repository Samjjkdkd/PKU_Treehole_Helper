class PostClassifier{
    // 定义分类提示词模板
    static CLASSIFY_PROMPT_TEMPLATE = `请判断以下树洞内容属于哪个类别，只需回复类别名称，不要解释：
        类别选项：{categories}

        树洞内容：{content}`;

    // 定义分类类别
    static CATEGORIES = [
        "popi", "交友", "求助", "提问", "情感", "学习", "生活", "其他"
    ];

    // 定义类别颜色映射
    static CATEGORY_COLORS = {
        '交友': '#E91E63', // 粉色
        '聊天': '#E91E63', // 粉色
        '求助': '#2196F3', // 蓝色
        '提问': '#2196F3', // 蓝色
        '情感': '#F44336', // 红色
        '学习': '#4CAF50', // 绿色
        '生活': '#FF9800', // 橙色
        '其他': '#9E9E9E', // 灰色
        'popi': '#E91E63'  // 粉色
    };

    // 定义类别图标映射
    static CATEGORY_ICONS = {
        '脱单': '❤️',
        '交友': '👋',
        '聊天': '👋',
        '求助': '🆘',
        '提问': '❓',
        '情感': '😊',
        '学习': '📚',
        '生活': '🏠',
        '其他': '📌',
        'popi': '👋'
    };

    constructor(dataManager, statusUpdater, postUI){
        this.dataManager = dataManager;
        this.statusUpdater = statusUpdater;
        this.postUI = postUI;

        this.isClassifying = false;
        this.classifiedCount = 0;
        this.totalClassifiedCount = 0;
        this.classifyInterval = null; // 分类的间隔定时器
    }

    // 获取分类颜色的方法
    getCategoryColor(category) {
        return PostClassifier.CATEGORY_COLORS[category] || '#9C27B0'; // 默认紫色
    }

    // 获取分类图标的方法
    getCategoryIcon(category) {
        return PostClassifier.CATEGORY_ICONS[category] || '📌'; // 默认图标
    }

    // 开始分类的方法
    startClassifying(batchClassifyBtn, panel) {
        if (this.isClassifying) return;
        
        this.isClassifying = true;
        this.classifiedCount = 0;
        
        // 更改按钮文本
        if (batchClassifyBtn) {
            batchClassifyBtn.textContent = '停止分类';
            batchClassifyBtn.style.backgroundColor = '#d32f2f';
        }
        
        // 获取当前排序方式下的树洞顺序
        const sortMethod = panel ? panel.querySelector('#sort-method').value : 'comprehensive';
        const sortedHoles = this.postUI.sortHolesByMethod(this.dataManager.holesData, sortMethod);
        
        // 优化的分类处理逻辑
        let currentIndex = 0;
        
        // 处理下一个树洞的函数
        const processNextHole = async () => {
            // 检查是否需要停止
            if (!this.isClassifying || currentIndex >= sortedHoles.length) {
                if (this.isClassifying) {
                    this.stopClassifying(batchClassifyBtn, true);
                }
                return;
            }
            
            // 获取当前树洞
            const hole = sortedHoles[currentIndex++];
            const holeElement = document.querySelector(`[data-hole-id="${hole.id}"]`);
            
            if (holeElement) {
                const categoryLabel = holeElement.querySelector('.category-tag');
                
                // 检查是否已经分类
                if (hole.category) {
                    // 已经分类，立即跳过并处理下一条
                    this.statusUpdater.updatePostStatus(`正在批量分类...已处理 ${currentIndex}/${sortedHoles.length} 条，跳过已分类树洞 #${hole.id}`);
                    processNextHole(); // 立即处理下一条
                    return;
                }
                
                try {
                    // 执行分类 (这里会等待API响应)
                    let category = await this.classifyTreehole(hole.content);
                    
                    if(category === 'popi'||category === '交友'){
                        category = '聊天';
                    }
                    if(category === '求助'||category === '提问'){
                        category = '求助';
                    }

                    // 更新数据中的分类信息
                    hole.category = category;
                    
                    // 更新分类标签
                    if (categoryLabel) {
                        categoryLabel.innerHTML = `${this.getCategoryIcon(category)} ${category}`;
                        categoryLabel.style.backgroundColor = this.getCategoryColor(category);
                    } else {
                        // 创建新的分类标签
                        const headerDiv = holeElement.querySelector('div:first-child');
                        if (headerDiv) {
                            const newCategoryTag = document.createElement('span');
                            newCategoryTag.className = 'category-tag';
                            newCategoryTag.style.cssText = `display: inline-flex; align-items: center; padding: 2px 5px; border-radius: 4px; margin-right: 5px; font-size: 12px; background-color: ${this.getCategoryColor(category)}; color: white;`;
                            newCategoryTag.innerHTML = `${this.getCategoryIcon(category)} ${category}`;
                            
                            // 找到树洞ID元素
                            const holeIdElement = headerDiv.querySelector('.hole-id');
                            if (holeIdElement) {
                                // 插入到树洞ID前面
                                headerDiv.insertBefore(newCategoryTag, holeIdElement);
                            } else {
                                // 如果找不到，就添加到最前面
                                headerDiv.insertBefore(newCategoryTag, headerDiv.firstChild);
                            }
                        }
                    }
                    
                    this.classifiedCount++;
                    this.totalClassifiedCount++;
                    
                    // 更新状态
                    this.statusUpdater.updatePostStatus(`正在批量分类...已分类 ${this.classifiedCount} 条（总计 ${this.totalClassifiedCount} 条），当前处理 #${hole.id}`);
                    
                    // 延迟1秒后处理下一条，避免API请求过于频繁
                    setTimeout(() => processNextHole(), 1000);
                } catch (error) {
                    console.error(`分类失败 (ID: ${hole.id}):`, error);
                    this.statusUpdater.updatePostStatus(`分类树洞 #${hole.id} 失败: ${error.message}`, true);
                    
                    // 延迟1秒后处理下一条，即使失败也要继续
                    setTimeout(() => processNextHole(), 1000);
                }
    } else {
                // 找不到元素，立即处理下一条
                processNextHole();
            }
        }
        
        // 开始处理
        processNextHole();
    }
    
    // 停止分类的方法
    stopClassifying(batchClassifyBtn, completed = false) {
        if (!this.isClassifying) return;
        
        this.isClassifying = false;
        
        // 清除定时器
        if (this.classifyInterval) {
            clearInterval(this.classifyInterval);
            this.classifyInterval = null;
        }
        
        // 恢复按钮状态
        if (batchClassifyBtn) {
            batchClassifyBtn.textContent = '批量分类';
            batchClassifyBtn.style.backgroundColor = '#9C27B0';
        }
        
        // 更新状态
        if (completed) {
            this.statusUpdater.updatePostStatus(`批量分类完成，本次共分类 ${this.classifiedCount} 条树洞`);
        } else {
            this.statusUpdater.updatePostStatus(`批量分类已停止，本次已分类 ${this.classifiedCount} 条树洞`);
        }
    }

    async classifyTreehole(content) {
        try {
            // 使用类常量获取类别
            const categories = PostClassifier.CATEGORIES;
            
            // 使用类常量获取提示词模板并替换变量
            const prompt = PostClassifier.CLASSIFY_PROMPT_TEMPLATE
                .replace('{categories}', categories.join("、"))
                .replace('{content}', content);

            // 先获取分类专用的API设置
            const apiSettings = await this.dataManager.getClassifyApiSettings();
            
            // 如果没有传入API Key，则使用设置中的API Key
            const actualApiKey = apiSettings.apiKey;
            if (!actualApiKey) {
                throw new Error('未配置API Key，请在设置中配置');
            }
            
            let response;
            
            console.log(apiSettings.aiPlatform);
            console.log(apiSettings.subModel);
            console.log(actualApiKey);
            if (apiSettings.aiPlatform === 'deerapi') {
                // 使用DeerAPI
                response = await fetch('https://api.deerapi.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${actualApiKey}`
                    },
                    body: JSON.stringify({
                        model: apiSettings.subModel, // 分类用快速模型
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.1
                    })
                });
            } else if (apiSettings.aiPlatform === 'deepseek') {
                // 使用DeepSeek API
                response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${actualApiKey}`
                    },
                    body: JSON.stringify({
                        model: apiSettings.subModel,
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.1
                    })
                });
            } else {
                // 默认使用智谱AI
                response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${actualApiKey}`
                    },
                    body: JSON.stringify({
                        model: apiSettings.subModel,
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.1
                    })
                });
            }

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const classification = data.choices[0].message.content.trim();
            
            // 验证返回的分类是否在预定义类别中
            if (!categories.includes(classification)) {
                return "其他";
            }
            
            return classification;
        } catch (error) {
            console.error('分类失败:', error);
            throw error;
        }
    }
}

export default PostClassifier;