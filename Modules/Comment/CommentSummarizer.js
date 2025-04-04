class CommentSummarizer {
    static SUMMARIZE_PROMPT = `请你阅读以下PKU树洞帖子及其评论，然后提炼出主要内容和讨论的核心观点，生成一个200-300字的摘要，摘要需包含：

        1. 帖子的主题或问题
        2. 主要观点和讨论内容
        3. 不同立场的意见（如果有分歧）
        4. 主要有用的信息和建议（如果有）

        回复格式要求：
        - 使用简洁的语言整理，保留其中有价值的信息
        - 不要包含"根据提供的内容"等前置语
        - 采用客观的第三人称口吻，直接给出摘要内容

        以下是需要总结的内容：\n`;
    constructor(dataManager, statusUpdater) {
        this.dataManager = dataManager;
        this.statusUpdater = statusUpdater;
    }
    // 总结树洞内容
    async summarizeTreehole() {
        try {
            this.statusUpdater.updateCommentStatus('正在准备总结树洞内容...');
            
            // 检查是否有评论数据
            if (!this.dataManager.allCommentsData || this.dataManager.allCommentsData.length === 0) {
                this.statusUpdater.updateCommentStatus('没有可用的评论数据，请先收集评论', true);
                return;
            }
            
            // 获取API设置
            const apiSettings = await this.dataManager.getApiSettings();
            
            // 检查API设置有效性
            if (!apiSettings.apiKey) {
                this.statusUpdater.updateCommentStatus('请先在扩展设置中配置API KEY', true);
                return;
            }
            
            // 获取当前筛选条件
            const speakerFilter = document.getElementById('speaker-filter');
            const selectedSpeaker = speakerFilter ? speakerFilter.value : 'all';
            
            // 创建总结容器
            let summaryContainer = document.getElementById('summary-container');
            if (!summaryContainer) {
                summaryContainer = document.createElement('div');
                summaryContainer.id = 'summary-container';
                summaryContainer.style.padding = '15px';
                summaryContainer.style.marginBottom = '15px';
                summaryContainer.style.backgroundColor = '#f8f9fa';
                summaryContainer.style.borderRadius = '8px';
                summaryContainer.style.border = '1px solid #e9ecef';
                
                // 添加到评论容器之前（主贴上方）
                const commentsContainer = document.getElementById('comments-container');
                if (commentsContainer && commentsContainer.parentNode) {
                    commentsContainer.parentNode.insertBefore(summaryContainer, commentsContainer);
                }
            }
            
            // 显示正在生成总结的提示
            summaryContainer.innerHTML = `
                <h4 style="margin: 0 0 10px 0; display: flex; align-items: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#9C27B0" style="margin-right: 8px;">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    树洞内容总结 (${apiSettings.aiPlatform === 'deepseek' ? 'DeepSeek' : apiSettings.aiPlatform === 'deerapi' ? 'DeerAPI' : '智谱GLM-4'})
                    ${selectedSpeaker !== 'all' ? `<span style="font-size: 12px; color: #666; margin-left: 8px;">- 仅包含${selectedSpeaker}的评论</span>` : ''}
                </h4>
                <div style="padding: 10px; background-color: #fff; border-radius: 4px; border: 1px dashed #ccc;">
                    <p style="margin: 0; text-align: center;">正在生成总结，请稍候...</p>
                </div>
            `;
            
            // 准备树洞内容
            if (selectedSpeaker !== 'all') {
                this.statusUpdater.updateCommentStatus(`正在准备树洞内容（仅主贴和${selectedSpeaker}的评论）...`);
            } else {
                this.statusUpdater.updateCommentStatus('正在准备树洞内容...');
            }
            
            // 提取主贴
            const mainPost = this.dataManager.allCommentsData.find(comment => comment.isMainPost);
            
            // 筛选评论（根据发言人筛选）
            let filteredComments = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost);
            if (selectedSpeaker !== 'all') {
                filteredComments = filteredComments.filter(comment => comment.speaker === selectedSpeaker);
            }
            
            let content = '';
            
            // 添加主贴内容
            if (mainPost) {
                content += `【主贴】${mainPost.content}\n\n`;
            }
            
            // 添加筛选后的评论内容（最多添加50条，防止超出API限制）
            const maxComments = Math.min(filteredComments.length, 50);
            for (let i = 0; i < maxComments; i++) {
                content += `【${filteredComments[i].speaker}】${filteredComments[i].content}\n`;
            }
            
            // 准备好模型名称显示
            let modelDisplayName = "";
            if (apiSettings.aiPlatform === 'deepseek') {
                modelDisplayName = "DeepSeek";
            } else if (apiSettings.aiPlatform === 'deerapi') {
                modelDisplayName = "DeerAPI";
            } else {
                // 智谱GLM型号显示
                const modelMap = {
                    'glm-4-plus': 'GLM-4-Plus',
                    'glm-4-air': 'GLM-4-Air',
                    'glm-4-airx': 'GLM-4-AirX',
                    'glm-4-long': 'GLM-4-Long',
                    'glm-4-flashx': 'GLM-4-FlashX',
                    'glm-4-flash': 'GLM-4-Flash'
                };
                modelDisplayName = modelMap[apiSettings.subModel] || '智谱GLM';
            }
            
            this.statusUpdater.updateCommentStatus(`正在调用${modelDisplayName} API进行总结...`);
            
            // 根据当前选择的平台调用不同的API
            let summaryResult;
            if (apiSettings.aiPlatform === 'deepseek') {
                summaryResult = await this.generateSummaryWithDeepSeekAI(content, apiSettings.apiKey, apiSettings.subModel);
            } else if (apiSettings.aiPlatform === 'deerapi') {
                summaryResult = await this.generateSummaryWithDeerAPI(content, apiSettings.apiKey, apiSettings.subModel);
            } else { // 默认使用智谱AI
                summaryResult = await this.generateSummaryWithZhipuAI(content, apiSettings.apiKey, apiSettings.subModel);
            }
            
            // 更新总结内容
            summaryContainer.innerHTML = `
                <h4 style="margin: 0 0 10px 0; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#9C27B0" style="margin-right: 8px;">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                        </svg>
                        树洞内容总结 (${modelDisplayName})
                        ${selectedSpeaker !== 'all' ? `<span style="font-size: 12px; color: #666; margin-left: 8px;">- 仅包含${selectedSpeaker}的评论</span>` : ''}
                    </div>
                    <button id="copy-summary" class="hover-effect" style="background-color: #9C27B0; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">复制总结</button>
                </h4>
                <div style="padding: 10px; background-color: #fff; border-radius: 4px; border: 1px solid #e0e0e0; line-height: 1.6;">
                    ${summaryResult.replace(/\n/g, '<br>')}
                </div>
            `;
            
            // 添加复制总结按钮事件
            document.getElementById('copy-summary').addEventListener('click', () => {
                navigator.clipboard.writeText(summaryResult)
                    .then(() => {
                        this.statusUpdater.updateCommentStatus('总结已复制到剪贴板');
                    })
                    .catch(err => {
                        console.error('复制总结失败:', err);
                        this.statusUpdater.updateCommentStatus('复制总结失败', true);
                    });
            });
            
            this.statusUpdater.updateCommentStatus('树洞内容总结完成');
            
        } catch (error) {
            console.error('总结树洞失败:', error);
            this.statusUpdater.updateCommentStatus(`总结失败: ${error.message}`, true);
            
            // 更新总结容器显示错误
            const summaryContainer = document.getElementById('summary-container');
            if (summaryContainer) {
                summaryContainer.innerHTML = `
                    <h4 style="margin: 0 0 10px 0; display: flex; align-items: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#f44336" style="margin-right: 8px;">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        总结失败
                    </h4>
                    <div style="padding: 10px; background-color: #fff; border-radius: 4px; border: 1px solid #f44336; color: #f44336;">
                        ${error.message || '总结树洞内容时发生错误'}
                    </div>
                `;
            }
        }
    }

    // 调用智谱GLM-4 API进行树洞总结
    async generateSummaryWithZhipuAI(content, apiKey, model = 'glm-4-flash') {
        try {
            const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            
            const prompt = `${CommentSummarizer.SUMMARIZE_PROMPT}\n${content}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices[0].message.content || '无法获取总结结果';
        } catch (error) {
            console.error('调用智谱GLM-4 API失败:', error);
            throw error;
        }
    }

    // 调用DeepSeek API进行树洞总结
    async generateSummaryWithDeepSeekAI(content, apiKey, model = 'deepseek-chat') {
        try {
            const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
            
            const prompt = `${CommentSummarizer.SUMMARIZE_PROMPT}\n${content}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });
            
            if (!response.ok) {
                if (response.status === 402) {
                    throw new Error('DeepSeek API余额不足或API Key无效，请检查API Key或账户余额');
                } else if (response.status === 401) {
                    throw new Error('DeepSeek API认证失败，请检查API Key是否正确');
                } else if (response.status === 429) {
                    throw new Error('DeepSeek API请求频率超限，请稍后再试');
                } else {
                    throw new Error(`API请求失败: ${response.status}`);
                }
            }
            
            const data = await response.json();
            return data.choices[0].message.content || '无法获取总结结果';
        } catch (error) {
            console.error('调用DeepSeek API失败:', error);
            throw error;
        }
    }

    // 使用DeerAPI生成摘要
    async generateSummaryWithDeerAPI(content, apiKey, model = 'gpt-4o') {
        try {
            const apiUrl = 'https://api.deerapi.com/v1/chat/completions';
            
            const prompt = `${CommentSummarizer.SUMMARIZE_PROMPT}\n${content}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content || '无法生成摘要';
        } catch (error) {
            console.error('调用DeerAPI失败:', error);
            throw error;
        }
    }
}

// 导出CommentSummarizer类
export default CommentSummarizer;
