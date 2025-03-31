class CommentUI{
    constructor(dataManager, statusUpdater){
        this.dataManager = dataManager;
        this.statusUpdater = statusUpdater;
    }

    setModules(exportManager, commentCollector, commentSummarizer, commentReplier){
        this.exportManager = exportManager;
        this.commentCollector = commentCollector;
        this.commentSummarizer = commentSummarizer;
        this.commentReplier = commentReplier;
    }

    // 监听页面变化，动态添加评论收集按钮
    observeSidebarChanges() {
        console.log("[DEBUG] observeSidebarChanges 被调用");
        const observer = new MutationObserver((mutations) => {
            this.createCommentCollectorButton();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 初始检查
        this.createCommentCollectorButton();
    }

    // 在原有树洞详情页后面添加新的函数
    createCommentCollectorButton() {
        console.log("[DEBUG] createCommentCollectorButton 被调用");
        // 检查当前是否在树洞详情页
        const sidebarTitle = document.querySelector('.sidebar-title.sidebar-top');
        if (!sidebarTitle) return;

        // 检查是否已经添加了按钮
        if (sidebarTitle.querySelector('.comment-collector-btn')) return;

        // 创建按钮
        const button = document.createElement('a');
        button.className = 'comment-collector-btn no-underline mr10 treehole-btn-hover';
        button.innerHTML = `<img src="${chrome.runtime.getURL('icon/icon48.png')}" alt="收集评论" style="width: 20px; height: 20px; vertical-align: middle;" class="collector-icon">`;
        button.style.cursor = 'pointer';
        button.title = '收集树洞评论';

        // 所需的CSS样式已经包含在外部style/content.css文件中

        // 将按钮添加到标题栏
        const titleActions = sidebarTitle.querySelector('div');
        if (titleActions) {
            titleActions.appendChild(button);
        }

        // 添加点击事件
            button.addEventListener('click', () => {
                this.showCommentCollectorDialog();
        });
    }

    // 创建评论收集对话框
    showCommentCollectorDialog() {
        console.log("[DEBUG] showCommentCollectorDialog 被调用");
        // 检查是否已存在对话框
        let dialog = document.getElementById('comment-collector-dialog');
        if (dialog) {
            // 使用flex而不是block来显示对话框，保持布局结构
            dialog.style.display = 'flex';
                
                // 将内容区域滚动到顶部
                const contentArea = document.getElementById('comment-dialog-content');
                if (contentArea) {
                    contentArea.scrollTop = 0;
                }
                
            return;
        }

        // 创建对话框
        dialog = document.createElement('div');
        dialog.id = 'comment-collector-dialog';
        dialog.style.position = 'fixed';
        dialog.style.left = '50%';
        dialog.style.top = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.width = '400px';
        dialog.style.height = '400px'; // 设置初始高度
        dialog.style.padding = '0';
        dialog.style.backgroundColor = 'white';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        dialog.style.zIndex = '10000';
        dialog.style.minWidth = '300px';
        dialog.style.minHeight = '200px';
        dialog.style.display = 'flex';
        dialog.style.flexDirection = 'column';
        dialog.style.overflow = 'hidden'; // 防止内容溢出
        dialog.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif';

        // 所需的按钮悬停效果CSS样式已经包含在外部style/content.css文件中

        dialog.innerHTML = `
            <div id="comment-dialog-header" style="display: flex; justify-content: space-between; align-items: center; background-color: #f5f5f5; padding: 10px 15px; border-radius: 8px 8px 0 0; cursor: move; user-select: none; flex-shrink: 0;">
                <h3 style="margin: 0; font-size: 16px; color: #333;">收集树洞评论</h3>
                <button id="close-comment-dialog" class="hover-effect" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #666;">&times;</button>
            </div>
            <div id="comment-dialog-content" style="padding: 15px; flex-grow: 1; overflow-y: auto;">
                <div id="comment-collector-controls" style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <button id="toggle-collect-comments" class="action-button hover-effect" style="background-color: #1a73e8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 14px; min-width: 100px;">开始收集</button>
                        <div style="display: flex; align-items: center;">
                            <input type="checkbox" id="auto-scroll-comments" style="margin-right: 5px;" checked>
                            <label for="auto-scroll-comments" style="cursor: pointer; font-size: 14px;">自动滚动</label>
                        </div>
                    </div>
                    
                    <div id="comment-stats" style="display: none; background-color: #f5f5f5; border-radius: 4px; padding: 10px; font-size: 13px; margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>已收集评论：</span>
                            <span id="comment-count">0</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>用时：</span>
                            <span id="collection-time">0秒</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>最晚评论时间：</span>
                            <span id="earliest-comment-time">-</span>
                        </div>
                        <!--div style="display: flex; justify-content: space-between;">
                            <span>最晚评论时间：</span>
                            <span id="latest-comment-time">-</span>
                        </div-->
                    </div>
                    
                    <div id="comment-filter" style="display: none; margin-top: 10px;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <label for="speaker-filter" style="margin-right: 8px; font-size: 13px;">只看：</label>
                            <select id="speaker-filter" style="flex-grow: 1; padding: 5px; border-radius: 4px; border: 1px solid #ddd; font-size: 13px;">
                                <option value="all">全部评论</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="export-controls" style="display: none; margin-top: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 13px;">导出评论：</span>
                            <div style="display: flex; gap: 8px;">
                                <button id="export-text" class="hover-effect" style="background-color: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">文本格式</button>
                                <button id="export-image" class="hover-effect" style="background-color: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">图片格式</button>
                            </div>
                        </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 13px;">AI功能：</span>
                                <div style="display: flex; gap: 8px;">
                                    <button id="summarize-treehole" class="hover-effect" style="background-color: #9C27B0; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">总结树洞</button>
                                    <button id="generate-reply" class="hover-effect" style="background-color: #FF5722; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">生成回复</button>
                                </div>
                            </div>
                        </div>
                        
                        <div id="reply-generation" style="display: none; margin-top: 10px; background-color: #FFF3E0; border-radius: 4px; padding: 10px;">
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <label for="reply-style" style="margin-right: 8px; font-size: 13px;">回复风格：</label>
                                <select id="reply-style" style="flex-grow: 1; padding: 5px; border-radius: 4px; border: 1px solid #ddd; font-size: 13px;">
                                    <option value="helpful">友好帮助</option>
                                    <option value="funny">幽默风趣</option>
                                    <option value="empathetic">刻薄嘲讽</option>
                                    <option value="direct">简洁直接</option>
                                    <option value="critical">理性分析</option>
                                </select>
                                <button id="refresh-reply" class="hover-effect" style="margin-left: 8px; background-color: #FF5722; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">刷新</button>
                            </div>
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <label for="reply-target" style="margin-right: 8px; font-size: 13px;">回复对象：</label>
                                <select id="reply-target" style="flex-grow: 1; padding: 5px; border-radius: 4px; border: 1px solid #ddd; font-size: 13px;">
                                    <option value="all">整体讨论</option>
                                    <option value="author">原帖作者</option>
                                </select>
                            </div>
                            <div id="generated-reply" style="margin-top: 5px; padding: 8px; background-color: white; border-radius: 4px; border: 1px solid #FFE0B2; font-size: 13px;">
                                点击"生成回复"按钮自动创建回复...
                            </div>
                            <div style="display: flex; justify-content: flex-end; margin-top: 5px;">
                                <button id="copy-reply" class="hover-effect" style="background-color: #4CAF50; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">复制回复</button>
                        </div>
                    </div>
                </div>
                
                <div id="comment-collector-status" style="padding: 8px; background-color: #f0f8ff; border-radius: 4px; margin-bottom: 15px; font-size: 13px;">准备开始收集评论...</div>
                
                <div id="comments-container" style="border: 1px solid #eee; border-radius: 4px; padding: 5px;">
                    <div style="padding: 10px; text-align: center; color: #666;">暂无评论数据</div>
                </div>
            </div>
            <div id="resize-handle" style="position: absolute; right: 0; bottom: 0; width: 15px; height: 15px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 0%, transparent 50%, #ccc 50%, #ccc 100%); border-radius: 0 0 8px 0;"></div>
        `;

        document.body.appendChild(dialog);

        // 添加关闭按钮事件
            document.getElementById('close-comment-dialog').addEventListener('click', () => {
            // 停止自动滚动
                this.commentCollector.stopCommentsAutoScroll(false);
            // 停止收集评论（如果正在进行）
                this.commentCollector.stopCollectComments();
            // 只隐藏对话框，不改变其布局属性
            dialog.style.display = 'none';
        });

        // 添加收集评论按钮事件
            document.getElementById('toggle-collect-comments').addEventListener('click', () => {
            const button = document.getElementById('toggle-collect-comments');
            if (button.textContent === '开始收集') {
                    this.commentCollector.startCollectComments();
                button.textContent = '停止收集';
                button.style.backgroundColor = '#e53935';

                // 显示统计区域
                document.getElementById('comment-stats').style.display = 'block';
            } else {
                    this.commentCollector.stopCollectComments();
                button.textContent = '开始收集';
                button.style.backgroundColor = '#1a73e8';
            }
        });

        // 添加自动滚动复选框事件
        const autoScrollCheckbox = document.getElementById('auto-scroll-comments');
            autoScrollCheckbox.addEventListener('change', () => {
            // 改为仅设置状态，不触发滚动
            console.log("[PKU TreeHole] 自动滚动设置: " + (autoScrollCheckbox.checked ? "开启" : "关闭"));
        });

        // 添加筛选下拉框事件（初始状态下隐藏）
        const speakerFilter = document.getElementById('speaker-filter');
        if (speakerFilter) {
                speakerFilter.addEventListener('change', () => this.commentCollector.filterAndDisplayComments());
        }

        // 添加导出按钮事件监听器
        const exportTextButton = document.getElementById('export-text');
        if (exportTextButton) {
                exportTextButton.addEventListener('click', () => this.exportManager.exportAsText());
        }

        const exportImageButton = document.getElementById('export-image');
        if (exportImageButton) {
                exportImageButton.addEventListener('click', () => this.exportManager.exportAsImage());
            }

            // 添加总结树洞按钮事件监听器
            const summarizeButton = document.getElementById('summarize-treehole');
            if (summarizeButton) {
                summarizeButton.addEventListener('click', () => this.commentSummarizer.summarizeTreehole());
            }
            
            // 添加生成回复按钮事件监听器
            const generateReplyButton = document.getElementById('generate-reply');
            const refreshReplyButton = document.getElementById('refresh-reply');
            const copyReplyButton = document.getElementById('copy-reply');
            
            if (generateReplyButton) {
                generateReplyButton.addEventListener('click', () => this.commentReplier.generateTreeholeReply());
            }
            
            if (refreshReplyButton) {
                refreshReplyButton.addEventListener('click', () => this.commentReplier.generateTreeholeReply());
            }
            
            if (copyReplyButton) {
                copyReplyButton.addEventListener('click', () => {
                    const replyText = document.getElementById('generated-reply').textContent;
                    if (replyText && replyText !== '点击"生成回复"按钮自动创建回复...' && replyText !== '生成回复时出错，请重试...') {
                        navigator.clipboard.writeText(replyText)
                            .then(() => {
                                const originalText = copyReplyButton.textContent;
                                copyReplyButton.textContent = '已复制!';
                                setTimeout(() => {
                                    copyReplyButton.textContent = originalText;
                                }, 1500);
                            })
                            .catch(err => {
                                console.error('复制失败:', err);
                                alert('复制回复失败，请手动复制');
                            });
                    }
                });
        }

        // 添加拖拽功能
        const dialogHeader = document.getElementById('comment-dialog-header');
        let isDragging = false;
        let offsetX, offsetY;

            dialogHeader.addEventListener('mousedown', (e) => {
            isDragging = true;

            // 获取鼠标在对话框中的位置
            const dialogRect = dialog.getBoundingClientRect();
            offsetX = e.clientX - dialogRect.left;
            offsetY = e.clientY - dialogRect.top;

            // 取消transform，使用left和top定位
            dialog.style.transform = 'none';
            dialog.style.left = dialogRect.left + 'px';
            dialog.style.top = dialogRect.top + 'px';

            // 设置样式
            dialog.style.transition = 'none';
            dialogHeader.style.cursor = 'grabbing';
        });

            document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            // 计算新位置
            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;

            // 应用新位置
            dialog.style.left = newLeft + 'px';
            dialog.style.top = newTop + 'px';
        });

            document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                dialogHeader.style.cursor = 'move';
            }
        });

        // 添加调整大小功能
        const resizeHandle = document.getElementById('resize-handle');
        let isResizing = false;
        let originalWidth, originalHeight, originalX, originalY;

            resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            e.preventDefault();

            // 获取对话框初始尺寸和鼠标位置
            const dialogRect = dialog.getBoundingClientRect();
            originalWidth = dialogRect.width;
            originalHeight = dialogRect.height;
            originalX = e.clientX;
            originalY = e.clientY;

            // 确保对话框使用绝对定位
            if (dialog.style.transform !== 'none') {
                dialog.style.transform = 'none';
                dialog.style.left = dialogRect.left + 'px';
                dialog.style.top = dialogRect.top + 'px';
            }
        });

            document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            // 计算宽度和高度的变化
            const deltaWidth = e.clientX - originalX;
            const deltaHeight = e.clientY - originalY;

            // 应用新尺寸（考虑最小尺寸限制）
            const newWidth = Math.max(300, originalWidth + deltaWidth);
            const newHeight = Math.max(200, originalHeight + deltaHeight);

            dialog.style.width = newWidth + 'px';
            dialog.style.height = newHeight + 'px';
        });

            document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
            }
        });
    }

    // 显示评论数据
    displayComments(comments, container) {
        console.log("[DEBUG] displayComments 被调用");
        if (!container) return;

            // 确保在显示评论前清空容器
            container.innerHTML = '';

        if (!comments || comments.length === 0) {
            container.innerHTML = '<div style="padding: 10px; text-align: center;">暂无评论数据</div>';
            return;
        }

        // 为不同发言人分配不同颜色
        const speakerColors = {};
        const predefinedColors = [
            '#e3f2fd', // 浅蓝色
            '#fff3e0', // 浅橙色
            '#f3e5f5', // 浅紫色
            '#e8eaf6', // 浅靛蓝色
            '#fce4ec', // 浅粉色
            '#fffde7', // 浅黄色
            '#e0f7fa', // 浅青色
            '#efebe9', // 浅棕色
            '#f1f8e9'  // 浅柠檬色
        ];

        // 收集所有发言人
        const speakers = [...new Set(comments.map(comment => comment.speaker))];

        // 分配颜色，洞主使用固定颜色
        speakers.forEach((speaker, index) => {
            if (speaker === '洞主') {
                speakerColors[speaker] = '#f5f5f5'; // 洞主使用浅灰色
            } else {
                speakerColors[speaker] = predefinedColors[index % predefinedColors.length];
            }
        });

        comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'collected-comment';
            commentDiv.style.padding = '15px';
            commentDiv.style.borderBottom = '1px solid #eee';
            commentDiv.style.marginBottom = '12px';
            commentDiv.style.borderRadius = '6px';
            commentDiv.style.transition = 'all 0.2s ease';
            
            // 为主贴设置特殊样式
            if (comment.isMainPost) {
                commentDiv.classList.add('is-main-post');
                commentDiv.style.backgroundColor = '#f9f9f9';
            } else {
                    commentDiv.style.backgroundColor = this.getColorForSpeaker(comment.speaker, speakerColors);
            }

            let html = '';
            
            // 特殊处理主贴
            if (comment.isMainPost) {
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center;">
                            <span style="font-size: 18px; font-weight: bold; color: #1a1a1a;">#${comment.id}</span>
                            <span class="main-post-label">树洞主贴</span>
                        </div>
                        <span style="color: #666; font-size: 13px;">${comment.publishTime}</span>
                    </div>
                    
                    <div style="font-size: 16px; line-height: 1.6; margin-bottom: 18px; color: #333; font-weight: 500;">${comment.content}</div>
                    
                    <div class="main-post-stats">
                        <div class="main-post-stat-item">
                            <div class="main-post-stat-icon" style="color: #ff9800;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                </svg>
                            </div>
                            <span style="font-weight: 500; color: #555;">${comment.stars || 0} 收藏</span>
                        </div>
                        <div class="main-post-stat-item">
                            <div class="main-post-stat-icon" style="color: #2196f3;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;">
                                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                </svg>
                            </div>
                            <span style="font-weight: 500; color: #555;">${comment.comments || 0} 评论</span>
                        </div>
                    </div>
                `;
            } else {
                // 普通评论的原有显示逻辑
                html += `
                    <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold;">${comment.speaker}</span>
                        <span style="color: #666; font-size: 12px;">${comment.publishTime}</span>
                    </div>
                `;

                if (comment.quote) {
                    html += `
                        <div style="background-color: rgba(0,0,0,0.05); padding: 8px; border-left: 3px solid #ccc; margin-bottom: 8px; font-size: 12px; color: #666; border-radius: 3px;">
                            ${comment.quote.person}：${comment.quote.content}
                        </div>
                    `;
                }

                html += `<div style="line-height: 1.5;">${comment.content}</div>`;
            }

            // 添加图片显示（如果存在）
            if (comment.images && comment.images.length > 0) {
                html += `<div class="comment-images" style="${comment.isMainPost ? 'margin-top: 15px;' : 'margin-top: 10px;'}">`;
                comment.images.forEach(imgSrc => {
                    html += `<img src="${imgSrc}" 
                        style="max-width: 100%; 
                        margin: 10px 0; 
                        border-radius: 6px; 
                        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                        ${comment.isMainPost ? 'max-height: 400px; object-fit: contain;' : ''}" />`;
                });
                html += '</div>';
            }

            commentDiv.innerHTML = html;
            container.appendChild(commentDiv);
        });
    }

    // 辅助函数：为发言人获取颜色
    getColorForSpeaker(speaker, colorMap) {
        console.log("[DEBUG] getColorForSpeaker 被调用");
        if (colorMap[speaker]) {
            return colorMap[speaker];
        }

        // 如果是洞主，使用灰色
        if (speaker === '洞主') {
            return '#f5f5f5';
        }

        // 如果没有分配颜色，根据名字生成颜色
        let hash = 0;
        for (let i = 0; i < speaker.length; i++) {
            hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
        }

        const color = `hsl(${hash % 360}, 70%, 95%)`;
        colorMap[speaker] = color;
        return color;
    }
}

export default CommentUI;
