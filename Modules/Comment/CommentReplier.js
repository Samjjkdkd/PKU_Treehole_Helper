class CommentReplier {
    constructor(dataManager, statusUpdater) {
        this.dataManager = dataManager;
        this.statusUpdater = statusUpdater;
    }
    // 自动生成对树洞的回复
    async generateTreeholeReply() {
        console.log("[DEBUG] generateTreeholeReply 被调用");
        try {
            this.statusUpdater.updateCommentStatus("正在生成回复...");
            document.getElementById('generate-reply').disabled = true;
            document.getElementById('refresh-reply').disabled = true;
            
            // 显示生成区域
            document.getElementById('reply-generation').style.display = 'block';
            
            // 获取主贴内容
            const mainPost = this.dataManager.allCommentsData.find(comment => comment.isMainPost);
            const mainPostContent = mainPost ? mainPost.content : '';
            
            // 获取回复对象
            const replyTarget = document.getElementById('reply-target')?.value || 'all';
            
            // 获取回复风格
            const replyStyle = document.getElementById('reply-style').value;
            
            let contentToProcess;
            let promptPrefix = '';
            
            if (replyTarget === 'all') {
                // 获取当前筛选条件
                const speakerFilter = document.getElementById('speaker-filter');
                const selectedSpeaker = speakerFilter ? speakerFilter.value : 'all';
                
                // 筛选评论（不包括主贴）
                let filteredComments = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost);
                
                // 根据发言者筛选普通评论
                if (selectedSpeaker !== 'all') {
                    filteredComments = filteredComments.filter(comment => 
                        comment.speaker === selectedSpeaker);
                }
                
                // 将评论格式化为字符串
                const visibleComments = filteredComments.map(comment => 
                    `${comment.speaker || '匿名'}: ${comment.content || ''}`
                ).join('\n');
                
                contentToProcess = `树洞内容: ${mainPostContent}\n\n评论区:\n${visibleComments}`;
                promptPrefix = '请根据整体讨论内容生成一条适合发布在评论区的回复。';
            } 
            else if (replyTarget === 'author') {
                // 回复洞主：只包含主贴
                contentToProcess = `树洞内容: ${mainPostContent}`;
                promptPrefix = `请生成一条回复洞主的评论。`;
            } 
            else {
                // 回复特定用户：筛选该用户的所有评论
                const targetComments = this.dataManager.allCommentsData.filter(comment => 
                    !comment.isMainPost && comment.speaker === replyTarget
                ).map(comment => `${comment.speaker}: ${comment.content}`).join('\n');
                
                if (!targetComments) {
                    throw new Error(`未找到用户 "${replyTarget}" 的评论`);
                }
                
                contentToProcess = `树洞内容: ${mainPostContent}\n\n${replyTarget}的评论:\n${targetComments}`;
                promptPrefix = `请针对用户"${replyTarget}"的评论生成一条回复。`;
            }
            
            // 获取API设置
            const apiSettings = await this.dataManager.getApiSettings();
            if (!apiSettings.apiKey) {
                throw new Error("请先在设置中配置API Key");
            }
            
            // 根据当前选择的平台调用不同的API
            let result;
            if (apiSettings.aiPlatform === 'deepseek') {
                result = await this.generateReplyWithDeepSeekAI(contentToProcess, apiSettings.apiKey, replyStyle, apiSettings.subModel, promptPrefix);
            } else { // 默认使用智谱AI
                result = await this.generateReplyWithZhipuAI(contentToProcess, apiSettings.apiKey, replyStyle, apiSettings.subModel, promptPrefix);
            }
            
            // 显示结果
            document.getElementById('generated-reply').textContent = result;
            this.statusUpdater.updateCommentStatus("回复生成完成！");
        } catch (error) {
            console.error("生成回复失败:", error);
            this.statusUpdater.updateCommentStatus(`生成回复失败: ${error.message}`, true);
            document.getElementById('generated-reply').textContent = "生成回复时出错，请重试...";
        } finally {
            document.getElementById('generate-reply').disabled = false;
            document.getElementById('refresh-reply').disabled = false;
        }
    }

    // 使用DeepSeek AI生成回复
    async generateReplyWithDeepSeekAI(content, apiKey, style, model = 'deepseek-chat', promptPrefix = '') {
        console.log("[DEBUG] generateReplyWithDeepSeekAI 被调用");
        try {
            const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
            
            // 根据不同风格设置不同的prompt
            let styleInstruction;
            switch (style) {
                case 'funny':
                    styleInstruction = '以幽默风趣的方式';
                    break;
                case 'empathetic':
                    styleInstruction = '以刻薄嘲讽的方式';
                    break;
                case 'direct':
                    styleInstruction = '以简洁直接的方式';
                    break;
                case 'critical':
                    styleInstruction = '以理性分析问题的方式';
                    break;
                case 'helpful':
                default:
                    styleInstruction = '以友好帮助的方式';
                    break;
            }
            
            const prompt = `${promptPrefix}\n请你阅读以下PKU树洞内容及其评论，
            然后${styleInstruction}生成一句发布在评论区的回复。
            回复需要自然、合理、针对性强，不要太短，最好在50字以上。\n\n
            注意：请直接给出回复内容，回复中不要出现如"洞主"、"Alice"等用户的名字。\n\n${content}`;
            
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
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content || '无法生成回复';
        } catch (error) {
            console.error('调用DeepSeek API失败:', error);
            throw error;
        }
    }

    // 使用智谱AI生成回复
    async generateReplyWithZhipuAI(content, apiKey, style, model = 'glm-4-flash', promptPrefix = '') {
        console.log("[DEBUG] generateReplyWithZhipuAI 被调用");
        try {
            // 根据不同风格设置不同的prompt
            let styleInstruction;
            switch (style) {
                case 'funny':
                    styleInstruction = '以幽默风趣的方式';
                    break;
                case 'empathetic':
                    styleInstruction = '以刻薄嘲讽的方式';
                    break;
                case 'direct':
                    styleInstruction = '以简洁直接的方式';
                    break;
                case 'critical':
                    styleInstruction = '以理性分析问题的方式';
                    break;
                case 'helpful':
                default:
                    styleInstruction = '以友好帮助的方式';
                    break;
            }
            
            const prompt = `${promptPrefix}\n请你阅读以下PKU树洞内容及其评论，
            然后${styleInstruction}生成一句发布在评论区的回复。
            回复需要自然、合理、针对性强，不要太短，最好在50字以上。\n\n
            注意：请直接给出回复内容，回复中不要出现如"洞主"、"Alice"等用户的名字。\n\n${content}`;
            
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
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
                    top_p: 0.8,
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content || '无法生成回复';
        } catch (error) {
            console.error('调用智谱API失败:', error);
            throw error;
        }
    }
}

// 导出CommentReplier类
export default CommentReplier;


