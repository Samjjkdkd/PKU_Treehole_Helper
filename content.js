//content.js
//post collection and comments collection

// 使用动态导入替代静态导入
let PostUI;
let StatusUpdater;
// 存储帖子数据
class TreeholeHelper {
    constructor(){
        this.holesData = [];
        this.isCollecting = false;
        this.timeLimit = null;
        this.postsLimit = null;
        this.startTime = null;
        this.checkInterval = null;
        this.scrollInterval = null;
        this.isScrolling = false;
        this.endTime = null;
        this.timeReachLimited = false; // 标记是否因为达到发布时间限制而停止收集
        this.postsReachLimited = false; // 标记是否因为达到帖子数量限制而停止收集
        this.allCommentsData = []; // 存储所有评论数据
        this.speakerList = new Set(); // 存储所有发言人列表

        // 评论自动滚动相关变量
        this.commentsScrollInterval = null;
        this.isCommentsScrolling = false;

        // 评论收集相关变量
        this.isCollectingComments = false;
        this.commentCollectionStartTime = 0;
        this.commentCollectionTimer = null;
        this.collectedCommentIds = new Set();
        this.earliestCommentTime = null;
        this.latestCommentTime = null; // 新增：用于记录最晚评论时间
        this.totalExpectedComments = 0; // 预期的总评论数量

        // 分类相关变量
        this.isClassifying = false; // 标记是否正在进行分类
        this.classifyInterval = null; // 分类的间隔定时器
        this.classifiedCount = 0; // 已分类的数量
        this.totalClassifiedCount = 0; // 总共分类的数量（包括此次和之前的）
        // 移除不再需要的displayHolesFunction
        this.mutationObserver = null;
    }
    
    setModules(postUI, statusUpdater){
        this.postUI = postUI;
        this.statusUpdater = statusUpdater;
    }
    /*************************************post collection*************************************/ 
    
    // 获取分类颜色的方法
    getCategoryColor(category) {
        console.log("[DEBUG] getCategoryColor 被调用");
        const colorMap = {
            '交友': '#E91E63', // 粉色
            '求助': '#2196F3', // 蓝色
            '情感': '#F44336', // 红色
            '学习': '#4CAF50', // 绿色
            '生活': '#FF9800', // 橙色
            '其他': '#9E9E9E'  // 灰色
        };
        
        return colorMap[category] || '#9C27B0'; // 默认紫色
    }

    // 获取分类图标的方法
    getCategoryIcon(category) {
        console.log("[DEBUG] getCategoryIcon 被调用");
        const iconMap = {
            '脱单': '❤️',
            '交友': '👋',
            '情感': '😊',
            '学习': '📚',
            '生活': '🏠',
            '其他': '📌'
        };
        
        return iconMap[category] || '📌'; // 默认图标
    }
    
    // 开始分类的方法
    startClassifying(apiKey, batchClassifyBtn, panel) {
        console.log("[DEBUG] startClassifying 被调用");
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
        const sortedHoles = this.sortHolesByMethod(this.holesData, sortMethod);
        
        // 优化的分类处理逻辑
        let currentIndex = 0;
        
        // 处理下一个树洞的函数
        const processNextHole = async () => {
            console.log("[DEBUG] processNextHole 被调用");
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
                    let category = await this.classifyTreehole(hole.content, apiKey);
                    
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
        console.log("[DEBUG] stopClassifying 被调用");
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

// 自动滚动函数
    autoScroll() {
        console.log("[DEBUG] autoScroll 被调用");
        if (this.isScrolling) return;

        this.isScrolling = true;

    // 使用用户提供的滚动容器
    const scrollContainer = document.querySelector(".left-container");
    if (!scrollContainer) {
        console.error("[PKU TreeHole] 无法找到滚动容器");
            this.isScrolling = false;
        return;
    }

    console.log("[PKU TreeHole] 开始自动滚动...");

    let scrollCount = 0;
    const maxScrolls = 200; // 防止无限滚动

    // 清除可能存在的上一个滚动计时器
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
    }

        this.scrollInterval = setInterval(() => {
        // 滚动页面
        scrollContainer.scrollBy(0, 5000);
        scrollCount++;

        // 检查是否需要停止滚动
            const timeExpired = this.timeLimit && (Date.now() - this.startTime > this.timeLimit);
            const reachedLimit = this.postsLimit && this.holesData.length >= this.postsLimit;

        if (timeExpired || reachedLimit || scrollCount > maxScrolls) {
                clearInterval(this.scrollInterval);
                this.scrollInterval = null;
                this.isScrolling = false;

            if (timeExpired || reachedLimit) {
                    let reason = '';
                    if (timeExpired) {
                        reason = '达到时间限制';
                    } else if (reachedLimit) {
                        reason = '达到数量限制';
                    }
                    this.stopCollection(true, reason);
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                console.log("[PKU TreeHole] 达到限制条件，停止滚动");
            } else {
                console.log("[PKU TreeHole] 滚动次数达到上限，短暂暂停后继续");
                // 短暂暂停后继续滚动
                    setTimeout(() => this.autoScroll(), 2000);
            }
        }
    }, 500); // 每500毫秒滚动一次
}

// 处理帖子数据
    processHoles() {
        console.log("[DEBUG] processHoles 被调用");
        
        // 如果已经停止收集，直接返回
        if (!this.isCollecting) {
            console.log("[PKU TreeHole] 已停止收集，忽略 processHoles 调用");
            return;
        }
        
    const holes = document.querySelectorAll('.flow-item-row');
    let newHolesCount = 0;
    let reachedTimeLimit = false;

    holes.forEach(hole => {
            // 如果已停止收集，跳过处理
            if (!this.isCollecting || hole.dataset.processed) return;

        const likeNum = hole.querySelector('.box-header-badge.likenum');
        const replyElement = hole.querySelector('.box-header-badge .icon-reply');
        const idElement = hole.querySelector('.box-id');
        const contentElement = hole.querySelector('.box-content');
        const headerElement = hole.querySelector('.box-header');
        const hasImage = hole.querySelector('.box-content img') !== null;

        if (likeNum && idElement && contentElement && headerElement) {
            const count = parseInt(likeNum.textContent.trim());
            const replies = replyElement ? parseInt(replyElement.parentElement.textContent.trim()) : 0;
            const id = idElement.textContent.trim().replace('#', '').trim();
            const content = contentElement.textContent.trim();

            // 获取发布时间
            const headerText = headerElement.textContent;
            const timeMatch = headerText.match(/\d{2}-\d{2} \d{2}:\d{2}/);
            const publishTime = timeMatch ? timeMatch[0] : '';

                // 检查是否达到时间限制 (只有在仍在收集时才检查)
                if (this.isCollecting && publishTime && this.endTime) {
                const currentYear = new Date().getFullYear();
                    const postTime = new Date(currentYear + '-' + publishTime.replace(' ', 'T'));
                    
                    console.log("[PKU TreeHole] 检查帖子时间:", postTime, "是否早于或等于截止时间:", this.endTime);
                    
                    // 注意：这里的逻辑是，如果帖子时间早于或等于截止时间，则停止收集
                    if (postTime <= this.endTime) {
                        console.log("[PKU TreeHole] 达到时间限制，发现早于截止时间的帖子:", id, "发布时间:", publishTime);
                    reachedTimeLimit = true;
                        this.stopCollection(true, '达到发布时间限制');
                    return;
                }
            }

            // 存储数据
            const holeData = {
                id: id,
                    content,
                likeCount: count,
                replyCount: replies,
                publishTime: publishTime,
                hasImage: hasImage
            };

            // 检查是否已存在该帖子
                const existingIndex = this.holesData.findIndex(h => h.id === id);
            if (existingIndex === -1) {
                    this.holesData.push(holeData);
                newHolesCount++;
            } else {
                    this.holesData[existingIndex] = holeData;
            }
        }

        hole.dataset.processed = 'true';
    });

    if (newHolesCount > 0) {
            console.log(`[PKU TreeHole] 新增 ${newHolesCount} 条帖子，总计 ${this.holesData.length} 条`);
    }

    // 检查是否需要停止收集
        if (this.isCollecting) {
        const currentTime = Date.now();
            const timeExpired = this.timeLimit && (currentTime - this.startTime > this.timeLimit);
            const reachedLimit = this.postsLimit && this.holesData.length >= this.postsLimit;

        if (timeExpired || reachedLimit || reachedTimeLimit) {
                let reason = '';
                if (timeExpired) {
                    reason = '达到搜寻时间限制';
                } else if (reachedLimit) {
                    reason = '达到帖子数量限制';
                } else if (reachedTimeLimit) {
                    reason = '达到发布时间限制';
                }
                this.stopCollection(true, reason);
            }
        }
    }

// 初始化页面监视器
    initPageObserver() {
        console.log("[DEBUG] initPageObserver 被调用");
    // 监听整个页面的变化
        this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log("[PKU TreeHole] 已初始化页面监视器");
}

// 加载初始数据
    loadInitialData() {
        console.log("[DEBUG] loadInitialData 被调用");
        this.processHoles();
    console.log("[PKU TreeHole] 已处理初始可见帖子");
}

// 开始收集数据
    startCollection(options) {
        console.log("[DEBUG] startCollection 被调用");
    console.log("[PKU TreeHole] 开始收集数据，时间限制:", options.timeLimit / 1000, "秒，数量限制:", options.postsLimit);

    // 如果正在收集中，先停止当前收集
        if (this.isCollecting) {
        console.log("[PKU TreeHole] 已有收集任务正在进行，重新开始...");
            this.stopCollection(false);
    }

    // 设置新的收集参数（不清空已有数据）
        this.isCollecting = true;
        this.timeLimit = options.timeLimit;
        this.postsLimit = options.postsLimit;
        this.startTime = Date.now();
        this.endTime = options.endTime || null;  // 确保设置endTime全局变量

        console.log("[PKU TreeHole] 设置参数: 时间限制", this.timeLimit, "毫秒, 数量限制", this.postsLimit, "帖子, 截止时间", this.endTime);

    // 初始化页面监视
        this.initPageObserver();

    // 处理当前可见帖子
        this.loadInitialData();

    // 启动定期检查
        if (!this.checkInterval) {
            this.checkInterval = setInterval(() => this.processHoles(), 2000); // 每2秒检查一次新数据
    }

    // 根据选项决定是否开始自动滚动
    if (options.autoScroll) {
        console.log("[PKU TreeHole] 启用自动滚动");
            this.autoScroll();
    } else {
        console.log("[PKU TreeHole] 禁用自动滚动");
    }

    // 返回当前已有的数据数量
        return this.holesData.length;
}

// 停止收集数据
    stopCollection(updateUI = false, reason = '') {
        console.log("[DEBUG] stopCollection 被调用");
        
        // 防止重复调用
        if (!this.isCollecting) {
            console.log("[PKU TreeHole] 已经停止收集，忽略重复调用");
            return;
        }
        
        console.log("[PKU TreeHole] 停止收集，共收集到", this.holesData.length, "条帖子", reason ? `，原因: ${reason}` : '');

        // 检查是否因为发布时间限制而停止
        if (reason === '达到发布时间限制') {
            this.timeReachLimited = true;
            console.log("[PKU TreeHole] 已达到发布时间限制，标记已设置");
        }
        
        // 检查是否因为达到帖子数量限制而停止
        if (reason === '达到帖子数量限制') {
            this.postsReachLimited = true;
            console.log("[PKU TreeHole] 已达到帖子数量限制，标记已设置");
        }

        this.isCollecting = false;
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }
        this.isScrolling = false;
        
        // 添加更新UI的逻辑
        if (updateUI) {
            console.log("[PKU TreeHole] 正在更新UI...");
            
            // 获取面板元素
            const panel = document.getElementById('pku-treehole-panel');
            if (panel) {
                console.log("[PKU TreeHole] 找到面板元素");
                
                // 获取按钮和加载指示器
                const startBtn = panel.querySelector('#start-btn');
                const stopBtn = panel.querySelector('#stop-btn');
                const loadingDiv = panel.querySelector('.loading');
                const holesContainer = panel.querySelector('#holes-container');
                
                // 更新按钮状态
                if (startBtn) {
                    startBtn.style.display = 'inline-block';
                    console.log("[PKU TreeHole] 显示开始按钮");
                }
                if (stopBtn) {
                    stopBtn.style.display = 'none';
                    console.log("[PKU TreeHole] 隐藏停止按钮");
                }
                if (loadingDiv) {
                    loadingDiv.style.display = 'none';
                    console.log("[PKU TreeHole] 隐藏加载指示器");
                }
                
                // 获取最后一条帖子的发布时间
                const lastTime = this.holesData.length > 0 ? this.holesData[this.holesData.length - 1].publishTime : '';
                
                // 构建状态消息
                let statusMessage = `收集完成，共 ${this.holesData.length} 条数据`;
                if (lastTime) {
                    statusMessage += `，最后帖子发布于 ${lastTime}`;
                }
                if (reason) {
                    statusMessage += `（${reason}）`;
                }
                
                try {
                    console.log("[PKU TreeHole] 调用statusUpdater.updatePostStatus函数");
                    this.statusUpdater.updatePostStatus(statusMessage);
                    
                    // 使用延时来避免可能的递归调用
                    setTimeout(() => {
                        this.postUI.displayHoles(this.holesData, panel, holesContainer, false);
                    }, 0);
                } catch (error) {
                    console.error("[PKU TreeHole] 更新状态时出错:", error);
                    // 尝试直接更新DOM
                    const statusText = panel.querySelector('#status-text');
                    if (statusText) {
                        statusText.textContent = statusMessage;
                        statusText.style.background = '#e8f5e9';
                        statusText.style.display = 'block';
                    }
                }
        } else {
                console.log("[PKU TreeHole] 未找到面板元素");
                // 使用全局状态更新
                this.statusUpdater.updatePostStatus(`收集完成，共 ${this.holesData.length} 条数据${reason ? ` (${reason})` : ''}`);
                
                // 即使找不到面板也尝试调用displayHoles
                this.postUI.displayHoles(this.holesData, null, null, false);
            }
        }
    }

    // 添加排序函数
    sortHolesByMethod(holes, method) {
        console.log("[DEBUG] sortHolesByMethod 被调用");
        const sortedHoles = [...holes];
        switch (method) {
            case 'like':
                sortedHoles.sort((a, b) => b.likeCount - a.likeCount);
                break;
            case 'reply':
                sortedHoles.sort((a, b) => b.replyCount - a.replyCount);
                break;
            case 'time':
                sortedHoles.sort((a, b) => {
                    const timeA = a.publishTime.split(' ').reverse().join(' ');
                    const timeB = b.publishTime.split(' ').reverse().join(' ');
                    return timeB.localeCompare(timeA);
                });
                break;
            case 'comprehensive':
                sortedHoles.sort((a, b) => {
                    const scoreA = a.likeCount * a.replyCount;
                    const scoreB = b.likeCount * b.replyCount;
                    return scoreB - scoreA;
                });
                break;
        }
        return sortedHoles;
    }

    /*************************************comments collection*************************************/
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

    // 添加样式标签，使图标有更明显的放大效果和过渡动画
    const iconStyle = document.createElement('style');
    iconStyle.textContent = `
        .collector-icon {
            transition: transform 0.2s ease !important;
        }
        .comment-collector-btn:hover .collector-icon {
            transform: scale(1.2) !important;
        }
    `;
    document.head.appendChild(iconStyle);

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

    // 按钮的通用悬浮效果样式
    const buttonHoverStyles = `
        .hover-effect {
            transition: transform 0.2s ease, background-color 0.2s ease, opacity 0.2s ease;
        }
        .hover-effect:hover {
            transform: scale(1.05);
        }
        /* 特定按钮颜色变化 */
        #close-comment-dialog:hover {
            color: #ff0000 !important;
            transform: scale(1.2) !important;
        }
        #toggle-collect-comments:hover {
            filter: brightness(1.1);
        }
            #export-text:hover, #export-image:hover, #summarize-treehole:hover {
            filter: brightness(1.1);
        }
    `;

    // 创建样式元素
    const style = document.createElement('style');
    style.textContent = buttonHoverStyles;
    document.head.appendChild(style);

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
            this.stopCommentsAutoScroll(false);
        // 停止收集评论（如果正在进行）
            this.stopCollectComments();
        // 只隐藏对话框，不改变其布局属性
        dialog.style.display = 'none';
    });

    // 添加收集评论按钮事件
        document.getElementById('toggle-collect-comments').addEventListener('click', () => {
        const button = document.getElementById('toggle-collect-comments');
        if (button.textContent === '开始收集') {
                this.startCollectComments();
            button.textContent = '停止收集';
            button.style.backgroundColor = '#e53935';

            // 显示统计区域
            document.getElementById('comment-stats').style.display = 'block';
        } else {
                this.stopCollectComments();
            button.textContent = '开始收集';
            button.style.backgroundColor = '#1a73e8';
        }
    });

    // 添加自动滚动复选框事件
    const autoScrollCheckbox = document.getElementById('auto-scroll-comments');
        autoScrollCheckbox.addEventListener('change', () => {
        // 改为仅设置状态，不触发滚动
        console.log("[PKU TreeHole] 自动滚动设置: " + (this.checked ? "开启" : "关闭"));
    });

    // 添加筛选下拉框事件（初始状态下隐藏）
    const speakerFilter = document.getElementById('speaker-filter');
    if (speakerFilter) {
            speakerFilter.addEventListener('change', () => this.filterAndDisplayComments());
    }

    // 添加导出按钮事件监听器
    const exportTextButton = document.getElementById('export-text');
    if (exportTextButton) {
            exportTextButton.addEventListener('click', () => this.exportAsText());
    }

    const exportImageButton = document.getElementById('export-image');
    if (exportImageButton) {
            exportImageButton.addEventListener('click', () => this.exportAsImage());
        }

        // 添加总结树洞按钮事件监听器
        const summarizeButton = document.getElementById('summarize-treehole');
        if (summarizeButton) {
            summarizeButton.addEventListener('click', () => this.summarizeTreehole());
        }
        
        // 添加生成回复按钮事件监听器
        const generateReplyButton = document.getElementById('generate-reply');
        const refreshReplyButton = document.getElementById('refresh-reply');
        const copyReplyButton = document.getElementById('copy-reply');
        
        if (generateReplyButton) {
            generateReplyButton.addEventListener('click', () => this.generateTreeholeReply());
        }
        
        if (refreshReplyButton) {
            refreshReplyButton.addEventListener('click', () => this.generateTreeholeReply());
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

// 收集评论
    collectComments(isInitialCollection = false) {
        console.log("[DEBUG] collectComments 被调用");
    // 获取评论容器
    const commentsContainer = document.querySelector(".sidebar-content");
    if (!commentsContainer) {
            this.statusUpdater.updateCommentStatus("无法找到评论容器", true);
        return;
    }

    // 获取所有评论元素
    const commentElements = commentsContainer.querySelectorAll(".box:not(.box-tip):not(.box33)");
    if (!commentElements || commentElements.length === 0) {
            this.statusUpdater.updateCommentStatus("未找到评论", true);
        return;
    }

        this.statusUpdater.updateCommentStatus(`找到 ${commentElements.length} 条评论，正在处理...`);

    // 收集评论数据
    const comments = [];
    const processedIds = new Set(); // 用于跟踪已处理的评论ID
    
    // 标记是否找到了主贴
    let foundMainPost = false;
    let mainPostData = null;
    
    // 记录这次处理的非主贴评论
    const nonMainPostComments = [];

    // 处理评论元素
    commentElements.forEach((element, index) => {
        // 提取评论ID
        const idElement = element.querySelector(".box-id");
        if (!idElement) return;

        const commentId = idElement.textContent.trim();

        // 跳过已处理的评论
        if (processedIds.has(commentId)) return;
        
        // 获取发布时间
        const headerElement = element.querySelector(".box-header");
        let publishTime = null;
        if (headerElement) {
            const timeMatch = headerElement.textContent.match(/(\d{2}-\d{2} \d{2}:\d{2})/);
            if (timeMatch && timeMatch[1]) {
                publishTime = timeMatch[1];
                
                // 更新最早评论时间
                    if (!this.earliestCommentTime || publishTime < this.earliestCommentTime) {
                        this.earliestCommentTime = publishTime;
                }
                
                // 更新最晚评论时间
                    if (!this.latestCommentTime || publishTime > this.latestCommentTime) {
                        this.latestCommentTime = publishTime;
                }
            }
        }
        
        let commentData;
        
        // 检查是否为主贴
        // 策略1：第一条评论总是尝试作为主贴处理
        // 策略2：检查是否有收藏按钮/数量来判断是否为主贴
        const isLikelyMainPost = index === 0 || 
                                element.querySelector('.box-header-badge .icon-star') || 
                                element.querySelector('.box-header-badge .icon-star-ok');
        
        if (isLikelyMainPost) {
            // 尝试提取为主贴
                commentData = this.extractMainPostData(element);
            
            // 如果成功提取为主贴且包含必要数据，标记为找到主贴
            if (commentData && (commentData.stars > 0 || commentData.comments > 0)) {
                foundMainPost = true;
                mainPostData = commentData;
            } else if (commentData) {
                // 即使没有收藏数/评论数，如果是第一条也视为主贴
                if (index === 0) {
                    foundMainPost = true;
                    mainPostData = commentData;
                } else {
                    // 否则按普通评论处理
                        commentData = this.extractCommentData(element);
                    if (commentData) {
                        nonMainPostComments.push(commentData);
                    }
                }
            }
        } else {
            // 处理普通评论
                commentData = this.extractCommentData(element);
            if (commentData) {
                nonMainPostComments.push(commentData);
            }
        }
        
        if (commentData) {
            if (publishTime) {
                commentData.publishTime = publishTime;
            }
            comments.push(commentData);
            processedIds.add(commentId);
            
            // 将收集到的评论ID添加到全局集合
                this.collectedCommentIds.add(commentId);
            
            // 如果不是主贴，将发言人添加到全局集合
            if (!commentData.isMainPost && commentData.speaker) {
                    this.speakerList.add(commentData.speaker);
            }
        }
    });
    
    // 将非主贴评论添加到全局数组
    // 使用Set去重，避免重复添加同一条评论
    if (foundMainPost && mainPostData 
            && !this.allCommentsData.find(comment => comment.isMainPost)) {
            this.allCommentsData.push(mainPostData);
    }

    nonMainPostComments.forEach(comment => {
        // 检查评论是否已经存在于allCommentsData中
            const isDuplicate = this.allCommentsData.some(existingComment => 
            existingComment.id === comment.id);
        
        if (!isDuplicate) {
                this.allCommentsData.push(comment);
        }
    });
    
    // 如果找到了主贴，更新全局统计信息
    if (foundMainPost && mainPostData) {
        // 更新全局统计信息
            this.totalExpectedComments = mainPostData.comments || 0;
        
        // 根据是否有评论显示不同的信息
            if (this.totalExpectedComments > 0) {
                this.statusUpdater.updateCommentStatus(`开始收集评论 (共 ${this.totalExpectedComments} 条)`);
        } else {
                this.statusUpdater.updateCommentStatus(`开始收集评论 (暂无其他评论)`);
        }
    }

    // 显示收集到的评论
    const dialogCommentsContainer = document.getElementById("comments-container");
    if (dialogCommentsContainer) {
            // 不再需要在这里清空容器，因为displayComments函数已经会清空容器
        // 显示评论
            this.displayComments(comments, dialogCommentsContainer);

        // 更新状态信息（包括主贴中的总数信息）
            const collectedCount = this.allCommentsData.filter(comment => !comment.isMainPost).length; // 使用非主贴评论的数量
        let statusMessage = '';
        
            if (this.totalExpectedComments > 0) {
                const progressInfo = this.totalExpectedComments ? 
                    ` (${Math.round((collectedCount / this.totalExpectedComments) * 100)}%)` : "";
                statusMessage = `已收集 ${collectedCount}/${this.totalExpectedComments} 条评论${progressInfo}`;
        } else {
            statusMessage = `已收集 ${collectedCount} 条评论`;
        }
        
            this.statusUpdater.updateCommentStatus(statusMessage);
        
        // 更新评论统计数据
            this.updateCommentStats(
            collectedCount,
                Math.floor((Date.now() - this.commentCollectionStartTime) / 1000),
                this.latestCommentTime || '未知'
        );
        
        // 检查进度是否到达100%，如果是则自动停止收集
            if (this.totalExpectedComments > 0 && collectedCount >= this.totalExpectedComments) {
                this.statusUpdater.updateCommentStatus("已收集全部评论，自动停止收集");
            // 使用setTimeout来避免在collectComments函数执行过程中直接调用stopCollectComments
            setTimeout(() => {
                    if (this.isCollectingComments) {
                        this.stopCollectComments();
                }
            }, 500);
        }
    }
    
    return comments;
}

// 专门处理第一条帖子（树洞主贴）的函数
    extractMainPostData(postElement) {
        console.log("[DEBUG] extractMainPostData 被调用");
    try {
        // 获取帖子ID
        const idElement = postElement.querySelector('.box-id');
        const id = idElement ? idElement.textContent.trim().replace('#', '') : '';

        // 获取帖子内容
        const contentElement = postElement.querySelector('.box-content');
        if (!contentElement) return null;
        
        // 获取主贴内容文本
        const content = contentElement.innerText.trim();
        
        // 提取收藏数和评论数
        const headerElement = postElement.querySelector('.box-header');
        let stars = 0;
        let comments = 0;
        let publishTime = '';
        
        if (headerElement) {
            // 提取收藏数 (检查两种可能的图标类名)
            const starBadge = headerElement.querySelector('.box-header-badge .icon-star-ok') || 
                            headerElement.querySelector('.box-header-badge .icon-star');
            
            if (starBadge && starBadge.parentElement) {
                const starText = starBadge.parentElement.textContent.trim();
                stars = parseInt(starText) || 0;
            }
            
            // 提取评论数 (可能不存在)
            const replyBadge = headerElement.querySelector('.box-header-badge .icon-reply');
            if (replyBadge && replyBadge.parentElement) {
                const replyText = replyBadge.parentElement.textContent.trim();
                comments = parseInt(replyText) || 0;
            }
            
            // 提取发布时间 (格式：刚刚&nbsp;03-04 21:35 或 2分钟前&nbsp;03-04 21:35)
            // 我们优先使用日期部分 (xx-xx xx:xx)
            const dateTimeMatch = headerElement.textContent.match(/(\d{2}-\d{2} \d{2}:\d{2})/);
            if (dateTimeMatch) {
                publishTime = dateTimeMatch[1];
            } else {
                // 如果没有匹配到日期格式，尝试提取整个时间信息
                const timeText = headerElement.textContent.trim().split('        ')[1];
                if (timeText) {
                    publishTime = timeText.trim();
                }
            }
        }
        
        // 提取图片元素
        const images = [];
        const imgElements = contentElement.querySelectorAll('img');
        imgElements.forEach(img => {
            if (img.src) {
                images.push(img.src);
            }
        });
        
        console.log('提取主贴数据:', { id, stars, comments, publishTime });
        
        return {
            id,
            speaker: '洞主',  // 主贴发言人一定是洞主
            content,
            publishTime: publishTime || '',
            images,
            isMainPost: true,  // 标记为主贴
            stars,            // 收藏数
            comments          // 评论数
        };
    } catch (error) {
        console.error('[PKU TreeHole] 提取主贴数据出错:', error);
        return null;
    }
}

// 提取评论数据
    extractCommentData(commentElement) {
        console.log("[DEBUG] extractCommentData 被调用");
    try {
        // 获取评论ID
        const idElement = commentElement.querySelector('.box-id');
        const id = idElement ? idElement.textContent.trim().replace('#', '') : '';

        // 获取说话内容和说话人
        const contentElement = commentElement.querySelector('.box-content');
        if (!contentElement) return null;

        let speaker = '洞主'; // 默认为洞主
        let content = '';

        // 检查是否有引用
        const quoteElement = contentElement.querySelector('.quote');
        let quote = null;

        if (quoteElement) {
            // 有引用的情况

            // 1. 提取引用内容
            const quoteText = quoteElement.textContent.trim();
            const firstSpaceIndex = quoteText.indexOf(' ');

            if (firstSpaceIndex > 0) {
                const quotedPerson = quoteText.substring(0, firstSpaceIndex).trim();
                const quotedContent = quoteText.substring(firstSpaceIndex).trim();

                quote = {
                    person: quotedPerson,
                    content: quotedContent
                };
            }

            // 2. 获取评论者（第一个带背景色的元素）
            const speakerElements = contentElement.querySelectorAll('[style*="background-color"]');
            if (speakerElements && speakerElements.length > 0) {
                speaker = speakerElements[0].textContent.trim();
            }

            // 3. 获取评论内容
            // 获取所有文本行
            const textLines = contentElement.innerText.split('\n');
            // 最后一行通常是评论内容
            if (textLines.length > 1) {
                const lastLine = textLines[textLines.length - 1].trim();
                if (lastLine) {
                    content = lastLine.replace(/^.*?:\s*/, ''); // 移除冒号前的内容
                }
            }
        } else {
            // 没有引用的情况

            // 1. 获取评论者（通常是带背景色的元素）
            const speakerElements = contentElement.querySelectorAll('[style*="background-color"]');
            if (speakerElements && speakerElements.length > 0) {
                speaker = speakerElements[0].textContent.trim();
            }

            // 2. 获取评论内容（通常是没有引用时的文本内容）
            content = contentElement.textContent.trim();

            // 3. 去除前缀 [xxx]
            content = content.replace(/\[.*?\](\s*Re\s*)?/g, '').trim();
        }

        // 获取发布时间
        const headerElement = commentElement.querySelector('.box-header');
        const timeMatch = headerElement ? headerElement.textContent.match(/(\d{2}-\d{2} \d{2}:\d{2})/) : null;
        const publishTime = timeMatch ? timeMatch[1] : '';

        // 提取图片元素
        const images = [];
        const imgElements = contentElement.querySelectorAll('img');
        imgElements.forEach(img => {
            if (img.src) {
                images.push(img.src);
            }
        });

        return {
            id,
            speaker,
            content,
            quote,
            publishTime,
            images,  // 添加图片数组到返回数据中
        };
    } catch (error) {
        console.error('[PKU TreeHole] 提取评论数据出错:', error);
        return null;
    }
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

// 添加样式
    addCommentCollectorStyles() {
        console.log("[DEBUG] addCommentCollectorStyles 被调用");
    const style = document.createElement('style');
    style.textContent = `
        .comment-collector-btn:hover {
            opacity: 0.8;
        }
        #start-collect-comments:hover {
            background-color: #1557b0;
        }
        .comment-images {
            margin-top: 10px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        .comment-images img {
            max-width: 100%;
            margin: 5px 0;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            transition: all 0.3s ease;
        }
        .comment-images img:hover {
            transform: scale(1.02);
            box-shadow: 0 3px 10px rgba(0,0,0,0.15);
        }
        .collected-comment.is-main-post {
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            border: 1px solid #e0e0e0;
            transition: all 0.3s ease;
        }
        .collected-comment.is-main-post:hover {
            box-shadow: 0 4px 15px rgba(0,0,0,0.12);
        }
        .main-post-label {
            background-color: #e0e0e0;
            color: #555;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            margin-left: 8px;
        }
        .main-post-stats {
            display: flex;
            margin-top: 15px;
            background-color: rgba(0,0,0,0.03);
            padding: 10px;
            border-radius: 4px;
        }
        .main-post-stat-item {
            display: flex;
            align-items: center;
            margin-right: 20px;
        }
        .main-post-stat-icon {
            margin-right: 5px;
        }
    `;
    document.head.appendChild(style);
}

// 开始自动滚动评论页面
    startCommentsAutoScroll() {
        console.log("[DEBUG] startCommentsAutoScroll 被调用");
        if (this.isCommentsScrolling) return;

        this.isCommentsScrolling = true;

    // 获取评论容器
    const scrollContainer = document.querySelector(".sidebar-content");
    if (!scrollContainer) {
        console.error("[PKU TreeHole] 无法找到评论滚动容器");
            this.isCommentsScrolling = false;
        return;
    }

    console.log("[PKU TreeHole] 开始自动滚动评论...");

    // 清除可能存在的上一个滚动计时器
        if (this.commentsScrollInterval) {
            clearInterval(this.commentsScrollInterval);
    }

    // 记录上次评论数量，用于检测是否还在加载新评论
    let lastCommentCount = 0;
    let stableCount = 0;

    // 设置滚动间隔
        this.commentsScrollInterval = setInterval(() => {
        // 如果已不再收集评论，停止滚动
            if (!this.isCollectingComments) {
                this.stopCommentsAutoScroll(false);
            return;
        }

        // 滚动到页面底部以加载更多评论
        scrollContainer.scrollBy({
            top: 3000,
            behavior: 'smooth'
        });

        // 更新评论收集状态
            this.statusUpdater.updateCommentStatus("正在自动滚动加载评论...");

        // 收集当前可见的评论
            this.collectComments();

        // 检查是否已加载完全部评论（到达底部且评论数量不再增加）
            const currentCommentCount = this.collectedCommentIds.size;
            const isAtBottom = this.isScrolledToBottom(scrollContainer);

        // 检查进度是否达到100%
            const nonMainPostCount = this.allCommentsData.filter(comment => !comment.isMainPost).length;
            const progressReached100 = this.totalExpectedComments > 0 && nonMainPostCount >= this.totalExpectedComments;
        
        // 如果进度达到100%，停止滚动和收集
        if (progressReached100) {
                this.statusUpdater.updateCommentStatus("已收集全部评论，自动停止收集");
                this.stopCollectComments(); // 停止收集评论（也会停止滚动）
            return;
        }

        if (isAtBottom) {
            // 如果评论数量与上次相同，累加稳定计数
            if (currentCommentCount === lastCommentCount) {
                stableCount++;

                // 如果连续3次检测到评论数量不变且在底部，认为已收集完成
                if (stableCount >= 3) {
                        this.collectComments(); // 最后再收集一次
                        this.statusUpdater.updateCommentStatus("已滚动到底部，评论加载完成，停止收集");
                        this.stopCollectComments(); // 停止收集评论（也会停止滚动）
                    return;
                }
            } else {
                // 评论数量有变化，重置稳定计数
                stableCount = 0;
            }
        } else {
            // 不在底部，重置稳定计数
            stableCount = 0;
        }

        // 更新上次评论数量
        lastCommentCount = currentCommentCount;

    }, 1500);
}

// 停止自动滚动评论页面
    stopCommentsAutoScroll(updateCheckbox = true) {
        console.log("[DEBUG] stopCommentsAutoScroll 被调用");
        if (this.commentsScrollInterval) {
            clearInterval(this.commentsScrollInterval);
            this.commentsScrollInterval = null;
        }
        this.isCommentsScrolling = false;

    // 根据参数决定是否更新复选框状态
    if (updateCheckbox) {
        const autoScrollCheckbox = document.getElementById('auto-scroll-comments');
        if (autoScrollCheckbox) {
            autoScrollCheckbox.checked = false;
        }
    }

    console.log("[PKU TreeHole] 停止自动滚动评论");
}

// 检查是否已滚动到容器底部
    isScrolledToBottom(element) {
        console.log("[DEBUG] isScrolledToBottom 被调用");
    // 当滚动位置 + 可视高度 >= 总滚动高度 - 5像素（容差）时，认为已滚动到底部
    return element.scrollTop + element.clientHeight >= element.scrollHeight - 5;
}

// 开始收集评论
    startCollectComments() {
        console.log("[DEBUG] startCollectComments 被调用");
        if (this.isCollectingComments) return;

    // 重置变量
        this.isCollectingComments = true;
        this.commentCollectionStartTime = Date.now();
        this.collectedCommentIds.clear();
        this.earliestCommentTime = null;
        this.latestCommentTime = null; // 新增：用于记录最晚评论时间
        this.allCommentsData = []; // 清空所有评论数据
        this.speakerList.clear(); // 清空发言人列表

        // 删除总结容器（如果存在）
        const summaryContainer = document.getElementById('summary-container');
        if (summaryContainer) {
            summaryContainer.remove();
        }

    // 清空评论容器
    const commentsContainer = document.getElementById('comments-container');
    if (commentsContainer) {
        commentsContainer.innerHTML = '';
    }

    // 隐藏筛选控件（收集过程中不显示）
    const commentFilter = document.getElementById('comment-filter');
    if (commentFilter) {
        commentFilter.style.display = 'none';
    }

    // 隐藏导出控件（收集过程中不显示）
    const exportControls = document.getElementById('export-controls');
    if (exportControls) {
        exportControls.style.display = 'none';
    }

    // 显示统计信息区域
    const commentStats = document.getElementById('comment-stats');
    if (commentStats) {
        commentStats.style.display = 'block';
    }

    // 重置统计信息
        this.updateCommentStats(0, 0, '-');

    // 开始收集
        this.statusUpdater.updateCommentStatus('开始收集评论...');
        this.collectComments(true);
    
    // 立即检查是否已经收集完毕
        const nonMainPostCount = this.allCommentsData.filter(comment => !comment.isMainPost).length;
        if ((this.totalExpectedComments > 0 && nonMainPostCount >= this.totalExpectedComments) || this.totalExpectedComments === 0) {
            this.statusUpdater.updateCommentStatus("已收集全部评论，自动停止收集");
        setTimeout(() => {
                if (this.isCollectingComments) {
                    this.stopCollectComments();
            }
        }, 500);
        return;
    }

    // 设置计时器，定期更新用时
        this.commentCollectionTimer = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - this.commentCollectionStartTime) / 1000);
            this.updateCollectionTime(elapsedSeconds);
    }, 1000);

    // 检查自动滚动选项是否已勾选
    const autoScrollCheckbox = document.getElementById('auto-scroll-comments');
    const isAutoScrollEnabled = autoScrollCheckbox && autoScrollCheckbox.checked;

    // 如果自动滚动选项已勾选，则开始自动滚动
    if (isAutoScrollEnabled) {
            this.startCommentsAutoScroll();
    } else {
        // 如果没有启用自动滚动，添加评论数量检测计时器
        // 用于检测评论数量是否在一段时间内无变化，如果是则停止收集
        
        // 保存上一次检查时的评论数量
        let lastCommentCount = nonMainPostCount;
        // 记录评论数量连续无变化的次数
        let unchangedCount = 0;
        // 连续无变化的阈值，达到此值时停止收集
        const MAX_UNCHANGED_COUNT = 3; // 连续3次无变化后停止
        
        // 创建评论数量检测计时器
        let noChangeDetectionTimer = setInterval(() => {
                if (!this.isCollectingComments) {
                clearInterval(noChangeDetectionTimer);
                return;
            }
            
                const currentCommentCount = this.allCommentsData.filter(comment => !comment.isMainPost).length;
            
            // 如果评论数量无变化
            if (currentCommentCount === lastCommentCount) {
                unchangedCount++;
                
                // 如果有预期总数且已达到，则立即停止
                    if (this.totalExpectedComments > 0 && currentCommentCount >= this.totalExpectedComments) {
                        this.statusUpdater.updateCommentStatus("已收集全部评论，自动停止收集");
                        if (this.isCollectingComments) {
                            this.stopCollectComments();
                    }
                    clearInterval(noChangeDetectionTimer);
                } 
                // 如果连续多次检测到评论数量无变化，且已经收集了一些评论，则停止收集
                else if (currentCommentCount > 0 && unchangedCount >= MAX_UNCHANGED_COUNT) {
                        this.statusUpdater.updateCommentStatus(`评论数量 ${currentCommentCount} 在${MAX_UNCHANGED_COUNT}秒内无变化，停止收集`);
                        if (this.isCollectingComments) {
                            this.stopCollectComments();
                    }
                    clearInterval(noChangeDetectionTimer);
                }
            } else {
                // 评论数量有变化，重置连续无变化计数
                unchangedCount = 0;
            }
            
            // 更新上一次检查的评论数量
            lastCommentCount = currentCommentCount;
        }, 600); // 每0.6秒检查一次
    }
}

// 停止收集评论
    stopCollectComments() {
        console.log("[DEBUG] stopCollectComments 被调用");
        if (!this.isCollectingComments) return;

        this.isCollectingComments = false;

    // 停止计时器
        if (this.commentCollectionTimer) {
            clearInterval(this.commentCollectionTimer);
            this.commentCollectionTimer = null;
    }

    // 清除可能存在的其他计时器（通过名称检测和清除不可靠，此处只是注释说明）
    // 所有计时器变量应在startCollectComments中创建时保存在闭包内，在这里不需要额外操作
    // noChangeDetectionTimer会在其自己的逻辑中检测isCollectingComments并自动退出

    // 停止自动滚动（但不取消复选框勾选）
        this.stopCommentsAutoScroll(false);

    // 更新UI按钮状态
    const toggleButton = document.getElementById('toggle-collect-comments');
    if (toggleButton) {
        toggleButton.textContent = '开始收集';
        toggleButton.style.backgroundColor = '#1a73e8';
    }

    // 显示筛选控件
    const commentFilter = document.getElementById('comment-filter');
    if (commentFilter) {
        commentFilter.style.display = 'block';
    }

    // 显示导出控件
    const exportControls = document.getElementById('export-controls');
    if (exportControls) {
        exportControls.style.display = 'block';
    }
    
    // 确保统计信息区域也显示
    const commentStats = document.getElementById('comment-stats');
    if (commentStats) {
        commentStats.style.display = 'block';
    }

    // 更新筛选下拉框
        this.updateSpeakerFilter();

    // 添加筛选下拉框的事件监听
    const speakerFilter = document.getElementById('speaker-filter');
    if (speakerFilter) {
        // 先移除可能存在的旧监听器
            speakerFilter.removeEventListener('change', this.filterAndDisplayComments);
        // 添加新的监听器
            speakerFilter.addEventListener('change', () => this.filterAndDisplayComments());
    }

    // 更新最终的评论数统计
        const collectedCount = this.allCommentsData.filter(comment => !comment.isMainPost).length;
        this.updateCommentStats(
        collectedCount,
            Math.floor((Date.now() - this.commentCollectionStartTime) / 1000),
            this.latestCommentTime || '未知'
    );

        this.statusUpdater.updateCommentStatus(`收集完成，共 ${collectedCount} 条评论`);
}

// 更新评论统计信息
    updateCommentStats(count, timeInSeconds, latestTime) {
        console.log("[DEBUG] updateCommentStats 被调用");
    const countElement = document.getElementById('comment-count');
    const timeElement = document.getElementById('collection-time');
    const latestTimeElement = document.getElementById('earliest-comment-time');
    
    // 计算进度百分比
    let progressPercentage = '';
        if (this.totalExpectedComments > 0) {
            const percentage = Math.round((count / this.totalExpectedComments) * 100);
        progressPercentage = ` (${percentage}%)`;
    }

    if (countElement) countElement.textContent = `${count}${progressPercentage}`;
        if (timeElement) timeElement.textContent = this.formatTime(timeInSeconds);
    if (latestTimeElement) latestTimeElement.textContent = latestTime;
}

// 更新收集用时
    updateCollectionTime(timeInSeconds) {
        console.log("[DEBUG] updateCollectionTime 被调用");
    const timeElement = document.getElementById('collection-time');
    if (timeElement) {
            timeElement.textContent = this.formatTime(timeInSeconds);
    }
}

// 格式化时间
    formatTime(seconds) {
        console.log("[DEBUG] formatTime 被调用");
    if (seconds < 60) {
        return `${seconds}秒`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}分${remainingSeconds}秒`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours}时${minutes}分${remainingSeconds}秒`;
    }
}

// 更新评论筛选下拉框
    updateSpeakerFilter() {
        console.log("[DEBUG] updateSpeakerFilter 被调用");
    // 获取所有唯一的发言者
    const speakers = new Set();
    
    // 保存当前选中的值
    const speakerFilter = document.getElementById('speaker-filter');
        const replyTargetFilter = document.getElementById('reply-target');
        
    // 默认值设为'all'，即全部评论
        const selectedSpeakerValue = speakerFilter && speakerFilter.value ? speakerFilter.value : 'all';
        const selectedReplyTargetValue = replyTargetFilter && replyTargetFilter.value ? replyTargetFilter.value : 'all';
    
        // 清空"只看"下拉框
    if (speakerFilter) {
        speakerFilter.innerHTML = '';
        
        // 添加"全部"选项
        const allOption = document.createElement('option');
        allOption.value = 'all';
        
        // 使用非主贴评论的数量
            const nonMainPostComments = this.allCommentsData.filter(comment => !comment.isMainPost);
        allOption.textContent = `全部 (${nonMainPostComments.length}条)`;
        speakerFilter.appendChild(allOption);
        }
        
        // 清空"回复对象"下拉框
        if (replyTargetFilter) {
            replyTargetFilter.innerHTML = '';
            
            // 添加"整体讨论"选项
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = '整体讨论';
            replyTargetFilter.appendChild(allOption);
            
            // 添加"洞主"选项 - 这里我们使用固定的"author"值来表示洞主
            const authorOption = document.createElement('option');
            authorOption.value = 'author';
            authorOption.textContent = '洞主';
            replyTargetFilter.appendChild(authorOption);
        }
        
        // 遍历评论获取发言者，排除主贴
        this.allCommentsData.forEach(comment => {
            if (!comment.isMainPost && comment.speaker && !speakers.has(comment.speaker)) {
                speakers.add(comment.speaker);
            }
        });
        
        // 为每个发言者创建选项并添加到两个下拉框中
        speakers.forEach(speaker => {
            // 计算该发言者的评论数，排除主贴
            const speakerCommentCount = this.allCommentsData.filter(comment => 
                !comment.isMainPost && comment.speaker === speaker).length;
            
            // 为"只看"下拉框添加选项
            if (speakerFilter) {
                const speakerOption = document.createElement('option');
                speakerOption.value = speaker;
                speakerOption.textContent = `${speaker} (${speakerCommentCount}条)`;
                speakerFilter.appendChild(speakerOption);
            }
            
            // 为"回复对象"下拉框添加选项，但跳过"洞主"（因为已经添加过固定的洞主选项）
            if (replyTargetFilter && speaker !== '洞主') {
                const replyOption = document.createElement('option');
                replyOption.value = speaker;
                replyOption.textContent = speaker;
                replyTargetFilter.appendChild(replyOption);
            }
        });
        
        // 恢复选中的值
        if (speakerFilter) {
            speakerFilter.value = selectedSpeakerValue;
        }
        
        if (replyTargetFilter) {
            replyTargetFilter.value = selectedReplyTargetValue;
    }
}

// 筛选并显示评论
    filterAndDisplayComments() {
        console.log("[DEBUG] filterAndDisplayComments 被调用");
    // 获取筛选条件
    const speakerFilter = document.getElementById('speaker-filter');
    const selectedSpeaker = speakerFilter ? speakerFilter.value : 'all';
    
    // 查找主贴
        const mainPost = this.allCommentsData.find(comment => comment.isMainPost);

    // 筛选评论（不包括主贴）
        let filteredComments = this.allCommentsData.filter(comment => !comment.isMainPost);
    
    // 根据发言者筛选普通评论
    if (selectedSpeaker !== 'all') {
        filteredComments = filteredComments.filter(comment => 
            comment.speaker === selectedSpeaker);
    }
    
    // 如果找到主贴，将其添加到筛选结果的开头
    if (mainPost) {
        filteredComments = [mainPost, ...filteredComments];
    }
    
    // 显示筛选后的评论
    const commentsContainer = document.getElementById('comments-container');
    if (commentsContainer) {
            // 不需要在这里清空容器，因为displayComments函数已经会清空容器
            this.displayComments(filteredComments, commentsContainer);
        
        // 更新评论数显示 (主贴不计入评论数)
        const nonMainPostCount = filteredComments.filter(comment => !comment.isMainPost).length;
            this.statusUpdater.updateCommentStatus(`已筛选 ${nonMainPostCount} 条评论`);
    }
}

    /*************************************export*************************************/

// 导出为文本格式
    exportAsText() {
        console.log("[DEBUG] exportAsText 被调用");
    // 获取当前显示的评论
    const speakerFilter = document.getElementById('speaker-filter');
    const selectedSpeaker = speakerFilter ? speakerFilter.value : 'all';
    
    // 查找主贴
        const mainPost = this.allCommentsData.find(comment => comment.isMainPost);

    // 筛选评论，排除主贴
        let comments = this.allCommentsData.filter(comment => !comment.isMainPost);
    
    if (selectedSpeaker !== 'all') {
        comments = comments.filter(comment => comment.speaker === selectedSpeaker);
    }
    
    if (comments.length === 0 && !mainPost) {
        alert('没有可导出的评论');
        return;
    }
    
    // 生成帖子信息
    const holeTitle = document.querySelector('.sidebar-title.sidebar-top');
    const holeTitleMatch = holeTitle ? holeTitle.textContent.match(/#\d+/) : null;
    const holeId = holeTitleMatch ? holeTitleMatch[0] : (holeTitle ? holeTitle.textContent.trim() : '未知帖子');
    const totalComments = comments.length; // 不包含主贴的评论数
    const exportTime = new Date().toLocaleString();
    
    // 生成文本内容
    let textContent = `# ${holeId}\n`;
    textContent += `# 导出时间：${exportTime}\n`;
    textContent += `# 评论数量：${totalComments}\n`;
    if (selectedSpeaker !== 'all') {
        textContent += `# 筛选条件：只看 ${selectedSpeaker}\n`;
    }
        textContent += `# 最晚评论时间：${this.latestCommentTime || '未知'}\n`;
    textContent += `\n-------------------------------\n\n`;
    
    // 先添加主贴信息(如果有)
    if (mainPost) {
        textContent += `【主贴】ID: ${mainPost.id} | 时间: ${mainPost.publishTime || '未知'}\n\n`;
        textContent += `${mainPost.content || ''}\n\n`;
        if (mainPost.stars || mainPost.comments) {
            textContent += `收藏: ${mainPost.stars || 0} | 评论: ${mainPost.comments || 0}\n\n`;
        }
        textContent += `-------------------------------\n\n`;
    }
    
    // 添加每条评论
    comments.forEach((comment, index) => {
        // 评论ID和发言人信息
        textContent += `[${index + 1}] ID: ${comment.id || ''} | 发言人: ${comment.speaker || '匿名'}`;
        
        // 添加发布时间
        if (comment.publishTime) {
            textContent += ` | 时间: ${comment.publishTime}`;
        }
        textContent += `\n\n`;
        
        // 如果有引用内容，先显示引用
        if (comment.quote) {
            textContent += `【引用】${comment.quote.person || '匿名'}: ${comment.quote.content}\n\n`;
        }
        
        // 添加评论主体内容
        textContent += `${comment.content || ''}\n\n`;
        
        textContent += `-------------------------------\n\n`;
    });
    
    // 获取导出设置并执行导出
        this.getExportSettings().then(exportMode => {
        let saveToLocal = exportMode === 'save' || exportMode === 'both';
        let copyToClipboard = exportMode === 'copy' || exportMode === 'both';
        
        // 根据设置保存到本地
        if (saveToLocal) {
            // 创建下载链接
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            // 设置文件名
            const fileName = `TreeHole${holeId.replace('#', '')}_${new Date().getTime()}.txt`;
            
            // 创建并触发下载
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            // 清理资源
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
        
        // 根据设置复制到剪贴板
        if (copyToClipboard) {
            try {
                navigator.clipboard.writeText(textContent).then(() => {
                    if (saveToLocal) {
                            this.statusUpdater.updateCommentStatus(`已导出 ${totalComments} 条评论为文本文件，并已复制到剪贴板`);
                    } else {
                            this.statusUpdater.updateCommentStatus(`已复制 ${totalComments} 条评论到剪贴板`);
                    }
                }).catch(err => {
                    console.error('无法复制到剪贴板: ', err);
                    if (saveToLocal) {
                            this.statusUpdater.updateCommentStatus(`已导出 ${totalComments} 条评论为文本文件（复制到剪贴板失败）`);
                    } else {
                            this.statusUpdater.updateCommentStatus(`复制到剪贴板失败`);
                    }
                });
            } catch (err) {
                console.error('不支持clipboard API: ', err);
                if (saveToLocal) {
                        this.statusUpdater.updateCommentStatus(`已导出 ${totalComments} 条评论为文本文件`);
                } else {
                        this.statusUpdater.updateCommentStatus(`复制到剪贴板失败（不支持clipboard API）`);
                }
            }
        } else {
                this.statusUpdater.updateCommentStatus(`已导出 ${totalComments} 条评论为文本文件`);
        }
    });
}

// 导出为图片格式
    exportAsImage() {
        console.log("[DEBUG] exportAsImage 被调用");
        this.statusUpdater.updateCommentStatus(`导出评论数据为图片...`);
    // 获取评论容器
    const commentsContainer = document.getElementById('comments-container');
    if (!commentsContainer) {
        alert('找不到评论容器');
        return;
    }

    // 检查是否有评论
    if (commentsContainer.children.length === 0 ||
        (commentsContainer.children.length === 1 && commentsContainer.children[0].textContent.includes('暂无评论数据'))) {
        alert('没有可导出的评论');
        return;
    }

    // 获取帖子信息
    const holeTitle = document.querySelector('.sidebar-title.sidebar-top');
    const holeTitleMatch = holeTitle ? holeTitle.textContent.match(/#\d+/) : null;
    const holeId = holeTitleMatch ? holeTitleMatch[0] : (holeTitle ? holeTitle.textContent.trim() : '未知帖子');
    const speakerFilter = document.getElementById('speaker-filter');
    const selectedSpeaker = speakerFilter && speakerFilter.value ? speakerFilter.value : 'all';
    const displaySpeaker = selectedSpeaker === 'all' ? '全部' : selectedSpeaker;

    // 创建一个临时容器，用于生成图片
    const tempContainer = document.createElement('div');
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.padding = '20px';
    tempContainer.style.width = '800px';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';

    // 添加标题和信息
    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    header.style.borderBottom = '2px solid #eee';
    header.style.paddingBottom = '10px';

    // 获取当前筛选后的评论数量
    const filteredComments = document.querySelectorAll('#comments-container .collected-comment');
    const totalFilteredComments = filteredComments.length;
        
        // 计算实际评论数量（不包括主贴）
        const actualCommentCount = this.allCommentsData.filter(comment => !comment.isMainPost).length;
    
    // 设置最大显示条数限制
    const MAX_COMMENTS_TO_DISPLAY = 101;
    const displayCount = Math.min(totalFilteredComments, MAX_COMMENTS_TO_DISPLAY);

    header.innerHTML = `
        <h2 style="margin: 0 0 10px 0;">${holeId}</h2>
        <div style="color: #666; font-size: 14px;">
            <div>导出时间：${new Date().toLocaleString()}</div>
                <div>评论数量：${actualCommentCount} (显示: ${displaySpeaker})</div>
                <div>最晚评论时间：${this.latestCommentTime || '未知'}</div>
        </div>
    `;

    tempContainer.appendChild(header);

    // 复制评论内容（仅复制有限数量的评论）
    const contentClone = document.createElement('div');
    contentClone.style.border = 'none';
    contentClone.style.maxWidth = '100%';
    
    // 只复制前MAX_COMMENTS_TO_DISPLAY条评论
    for (let i = 0; i < displayCount; i++) {
        if (i < filteredComments.length) {
            contentClone.appendChild(filteredComments[i].cloneNode(true));
        }
    }
    
    // 如果有更多评论但没有显示，添加提示信息
    if (totalFilteredComments > MAX_COMMENTS_TO_DISPLAY) {
        const moreInfo = document.createElement('div');
        moreInfo.style.textAlign = 'center';
        moreInfo.style.color = '#666';
        moreInfo.style.padding = '15px';
        moreInfo.style.marginTop = '10px';
        moreInfo.style.borderTop = '1px dashed #ddd';
            moreInfo.textContent = `注：图片中仅显示前${MAX_COMMENTS_TO_DISPLAY - 1}条评论，共有 ${actualCommentCount} 条评论。请使用文本导出获取完整数据。`;
        contentClone.appendChild(moreInfo);
    }

    tempContainer.appendChild(contentClone);

    // 添加到文档以便截图
    document.body.appendChild(tempContainer);

    // 使用html2canvas截图
        this.loadHtml2Canvas()
        .then((html2canvasFunc) => {
            return html2canvasFunc(tempContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true
            });
        })
        .then(canvas => {
            // 移除临时容器
            document.body.removeChild(tempContainer);

            // 获取导出设置并执行导出
                this.getExportSettings().then(exportMode => {
                let saveToLocal = exportMode === 'save' || exportMode === 'both';
                let copyToClipboard = exportMode === 'copy' || exportMode === 'both';
                
                // 将canvas转换为图片数据
                const imgData = canvas.toDataURL('image/png');
                
                // 根据设置保存到本地
                if (saveToLocal) {
                    // 设置文件名
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = `PKU_TreeHole_导出_${new Date().getTime()}.png`;
                    link.click();
                }
                
                // 根据设置复制到剪贴板
                if (copyToClipboard) {
                    try {
                        // 在某些浏览器中，可以直接从canvas获取剪贴板项
                        canvas.toBlob(blob => {
                            try {
                                const item = new ClipboardItem({ 'image/png': blob });
                                navigator.clipboard.write([item]).then(() => {
                                    if (saveToLocal) {
                                            this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}，并已复制到剪贴板`);
                                        } else if (exportMode === 'copy') {
                                            this.statusUpdater.updateCommentStatus(`已复制 ${displayCount - 1} 条评论数据为图片${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}到剪贴板`);
                                    } else {
                                            this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}（复制到剪贴板失败）`);
                                    }
                                }).catch(err => {
                                    console.error('无法复制图片到剪贴板: ', err);
                                    if (saveToLocal) {
                                            this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}（复制到剪贴板失败）`);
                                    } else {
                                            this.statusUpdater.updateCommentStatus(`复制评论数据图片到剪贴板失败`);
                                    }
                                });
                            } catch (err) {
                                console.error('ClipboardItem不受支持: ', err);
                                if (saveToLocal) {
                                        this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}`);
                                } else {
                                        this.statusUpdater.updateCommentStatus(`复制到剪贴板失败（ClipboardItem不受支持）`);
                                }
                            }
                        });
                    } catch (err) {
                        console.error('无法使用剪贴板功能: ', err);
                        if (saveToLocal) {
                                this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}`);
                        } else {
                                this.statusUpdater.updateCommentStatus(`复制到剪贴板失败（无法使用剪贴板功能）`);
                        }
                    }
                } else {
                        this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}`);
                }
            });
        })
        .catch(error => {
            console.error('导出图片失败:', error);
            alert('导出图片失败，请重试');
        });
}

// 动态加载html2canvas库
    loadHtml2Canvas() {
        console.log("[DEBUG] loadHtml2Canvas 被调用");
    return new Promise((resolve, reject) => {
        // 检查是否已加载过
        if (window.__html2canvasReady) {
            resolve(window.__html2canvasCaptureFunc);
            return;
        }

        // 注入脚本加载函数
            const injectScript = (src, onError) => {
                console.log("[DEBUG] injectScript 被调用");
            const script = document.createElement('script');
            script.src = src;
            script.onerror = onError;
            document.head.appendChild(script);
            return script;
        }

        // 创建截图函数
        const createCaptureFunction = () => {
                console.log("[DEBUG] createCaptureFunction 被调用");
            return (element, options) => {
                    console.log("[DEBUG] createCaptureFunction 内部被调用");
                return new Promise((resolveCapture, rejectCapture) => {
                        console.log("[DEBUG] createCaptureFunction 内部被调用，开始捕获");
                    const captureId = 'capture_' + Date.now();

                    // 监听结果
                    const captureListener = (event) => {
                            console.log("[DEBUG] captureListener 被调用");
                        if (!event.data ||
                            event.data.type !== 'HTML2CANVAS_RESULT' ||
                            event.data.captureId !== captureId) return;

                        window.removeEventListener('message', captureListener);

                        if (event.data.error) {
                            rejectCapture(new Error(event.data.error));
                            return;
                        }

                        // 从数据URL创建Canvas
                        const img = new Image();
                        img.onload = () => {
                                console.log("[DEBUG] 捕获成功，创建canvas");
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            resolveCapture(canvas);
                        };
                        img.onerror = () => rejectCapture(new Error('无法从数据URL创建图像'));
                        img.src = event.data.dataUrl;
                    };

                    window.addEventListener('message', captureListener);

                    // 使用临时ID标记元素
                    const tempId = 'html2canvas_temp_' + Date.now();
                    const originalId = element.id;
                    element.id = tempId;

                    // 发送捕获请求
                    window.postMessage({
                        type: 'HTML2CANVAS_CAPTURE_REQUEST',
                        captureId: captureId,
                        selector: '#' + tempId,
                        options: options
                    }, '*');

                    // 恢复原始ID
                    setTimeout(() => {
                        if (originalId) {
                            element.id = originalId;
                        } else {
                            element.removeAttribute('id');
                        }
                    }, 0);
                });
            };
        };

        // 监听执行器加载完成的消息
        const executorLoadedListener = (event) => {
                console.log("[DEBUG] executorLoadedListener 被调用");
            if (event.data && event.data.type === 'HTML2CANVAS_EXECUTOR_LOADED') {
                window.removeEventListener('message', executorLoadedListener);

                // 创建并保存截图函数
                const captureFunc = createCaptureFunction();
                window.__html2canvasCaptureFunc = captureFunc;
                window.__html2canvasReady = true;

                resolve(captureFunc);
            }
        };

        window.addEventListener('message', executorLoadedListener);

        // 先加载html2canvas库，然后加载执行器
        const html2canvasScript = injectScript(
            chrome.runtime.getURL('assets/html2canvas.min.js'),
            () => reject(new Error('无法加载html2canvas库'))
        );

        html2canvasScript.onload = () => {
            injectScript(
                chrome.runtime.getURL('assets/html2canvas-executor.js'),
                () => reject(new Error('无法加载html2canvas执行器'))
            );
        };
    });
}

// 导出悬浮窗中的树洞数据为文本格式
    exportHolesAsText() {
        console.log("[DEBUG] exportHolesAsText 被调用");
        if (!this.holesData || this.holesData.length === 0) {
            this.statusUpdater.updatePostStatus('没有可导出的数据，请先收集数据', true);
        return;
    }

    // 获取当前显示的排序方式
    const sortMethod = document.querySelector('#sort-method').value;

    // 生成文本内容
        let textContent = ``;
        //textContent += `# PKU树洞数据导出\n`;
    textContent += `# 导出时间：${new Date().toLocaleString()}\n`;
        textContent += `# 帖子数量：${this.holesData.length}\n`;
        textContent += `# 排序方式：${this.getSortMethodName(sortMethod)}\n`;

    // 获取最早和最新的帖子时间
        const timeData = this.holesData.map(hole => {
        const parts = hole.publishTime.split(' ');
        return parts.length > 1 ? parts[1] + ' ' + parts[0] : hole.publishTime;
    }).sort();

    if (timeData.length > 0) {
        textContent += `# 时间范围：${timeData[0]} 至 ${timeData[timeData.length - 1]}\n`;
    }

    textContent += `\n-------------------------------\n\n`;

    // 根据当前排序方式排序
        let sortedHoles = [...this.holesData];
        sortedHoles = this.sortHolesByMethod(sortedHoles, sortMethod);

    // 添加每个树洞的数据
    sortedHoles.forEach((hole, index) => {
            //textContent += `[${index + 1}] ID: #${hole.id} | 分类: ${hole.category ? `[${hole.category}]` : '未分类'} | 收藏数: ${hole.likeCount} | 评论数: ${hole.replyCount} | 发布时间: ${hole.publishTime}\n\n`;
            //textContent += `${hole.content || '无内容'}\n\n`;
            //textContent += `-------------------------------\n\n`;
            textContent += `#${hole.id} | 收藏:${hole.likeCount} | 评论:${hole.replyCount} | ${hole.publishTime}\n`;
            textContent += `${(hole.content || '无内容').replace(/\n/g, ' ').replace(/\r/g, ' ').slice(0,20)}\n`;
    });

    // 获取导出设置并执行导出
        this.getExportSettings().then(exportMode => {
        let saveToLocal = exportMode === 'save' || exportMode === 'both';
        let copyToClipboard = exportMode === 'copy' || exportMode === 'both';
        
        // 根据设置保存到本地
        if (saveToLocal) {
            // 创建下载链接
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            // 设置文件名
            const fileName = `PKU_TreeHole_导出_${new Date().getTime()}.txt`;
            
            // 创建并触发下载
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            // 清理资源
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
        
        // 根据设置复制到剪贴板
        if (copyToClipboard) {
            try {
                navigator.clipboard.writeText(textContent).then(() => {
                    if (saveToLocal) {
                            this.statusUpdater.updatePostStatus(`已导出 ${sortedHoles.length} 条帖子数据为文本文件，并已复制到剪贴板`);
                    } else {
                            this.statusUpdater.updatePostStatus(`已复制 ${sortedHoles.length} 条帖子数据到剪贴板`);
                    }
                }).catch(err => {
                    console.error('无法复制到剪贴板: ', err);
                    if (saveToLocal) {
                            this.statusUpdater.updatePostStatus(`已导出 ${sortedHoles.length} 条帖子数据为文本文件（复制到剪贴板失败）`);
                    } else {
                            this.statusUpdater.updatePostStatus(`复制到剪贴板失败`);
                    }
                });
            } catch (err) {
                console.error('不支持clipboard API: ', err);
                if (saveToLocal) {
                        this.statusUpdater.updatePostStatus(`已导出 ${sortedHoles.length} 条帖子数据为文本文件`);
                } else {
                        this.statusUpdater.updatePostStatus(`复制到剪贴板失败（不支持clipboard API）`);
                }
            }
        } else {
                this.statusUpdater.updatePostStatus(`已导出 ${sortedHoles.length} 条帖子数据为文本文件`);
        }
    });
}

// 导出悬浮窗中的树洞数据为图片格式
    exportHolesAsImage() {
        console.log("[DEBUG] exportHolesAsImage 被调用");
        this.statusUpdater.updatePostStatus(`导出树洞数据为图片...`);
        if (!this.holesData || this.holesData.length === 0) {
            this.statusUpdater.updatePostStatus('没有可导出的数据，请先收集数据', true);
        return;
    }

    // 创建一个临时容器用于生成图片
    const tempContainer = document.createElement('div');
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '20px';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.width = '800px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';

    // 获取当前显示的排序方式
    const sortMethod = document.querySelector('#sort-method').value;

    // 添加标题和统计信息
    tempContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1a73e8;">PKU树洞数据导出</h2>
            <p style="color: #666; margin: 5px 0;">导出时间：${new Date().toLocaleString()}</p>
                <p style="color: #666; margin: 5px 0;">帖子数量：${this.holesData.length}</p>
                <p style="color: #666; margin: 5px 0;">排序方式：${this.getSortMethodName(sortMethod)}</p>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 10px 0;"></div>
    `;

    // 根据当前排序方式排序
        let sortedHoles = [...this.holesData];
        sortedHoles = this.sortHolesByMethod(sortedHoles, sortMethod);

    // 只展示前30条数据，防止图片过大
    const displayHoles = sortedHoles.slice(0, 30);

    // 创建每个树洞的卡片
    displayHoles.forEach((hole, index) => {
        const holeCard = document.createElement('div');
        holeCard.style.border = '1px solid #ddd';
        holeCard.style.borderRadius = '8px';
        holeCard.style.padding = '15px';
        holeCard.style.marginBottom = '15px';
        holeCard.style.backgroundColor = '#f8f9fa';

        holeCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold; color: #1a73e8;">#${hole.id}</span>
                <div>
                        <span style="margin-right: 15px; color: #9C27B0;">[${hole.category ? hole.category : '未分类'}]</span>
                    <span style="margin-right: 15px; color: #e91e63;">收藏数：${hole.likeCount}</span>
                    <span style="margin-right: 15px; color: #2196F3;">评论数：${hole.replyCount}</span>
                    <span style="color: #666;">${hole.publishTime}</span>
                </div>
            </div>
            <div style="margin-bottom: 10px; line-height: 1.5; color: #333; word-break: break-all;">${hole.content || '无内容'}</div>
        `;

        tempContainer.appendChild(holeCard);
    });

    // 如果有更多数据但没有显示，添加提示
    if (sortedHoles.length > 30) {
        const moreInfo = document.createElement('div');
        moreInfo.style.textAlign = 'center';
        moreInfo.style.color = '#666';
        moreInfo.style.padding = '10px';
        moreInfo.textContent = `注：图片中仅显示前30条数据，共有 ${sortedHoles.length} 条数据。请使用文本导出获取完整数据。`;
        tempContainer.appendChild(moreInfo);
    }

    // 添加到文档以便截图
    document.body.appendChild(tempContainer);

    // 使用html2canvas截图
        this.loadHtml2Canvas()
        .then((html2canvasFunc) => {
            return html2canvasFunc(tempContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true
            });
        })
        .then(canvas => {
            // 移除临时容器
            document.body.removeChild(tempContainer);

            // 获取导出设置并执行导出
                this.getExportSettings().then(exportMode => {
                let saveToLocal = exportMode === 'save' || exportMode === 'both';
                let copyToClipboard = exportMode === 'copy' || exportMode === 'both';
                
                // 将canvas转换为图片数据
                const imgData = canvas.toDataURL('image/png');
                
                // 根据设置保存到本地
                if (saveToLocal) {
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = `PKU_TreeHole_导出_${new Date().getTime()}.png`;
                    link.click();
                }
                
                // 根据设置复制到剪贴板
                if (copyToClipboard) {
                    try {
                        canvas.toBlob(blob => {
                            try {
                                const item = new ClipboardItem({ 'image/png': blob });
                                navigator.clipboard.write([item]).then(() => {
                                    if (saveToLocal) {
                                            this.statusUpdater.updatePostStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}，并已复制到剪贴板`);
                                    } else {
                                            this.statusUpdater.updatePostStatus(`已复制 ${displayHoles.length} 条帖子数据为图片${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}到剪贴板`);
                                    }
                                }).catch(err => {
                                    console.error('无法复制图片到剪贴板: ', err);
                                    if (saveToLocal) {
                                            this.statusUpdater.updatePostStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}（复制到剪贴板失败）`);
                                    } else {
                                            this.statusUpdater.updatePostStatus(`复制帖子数据图片到剪贴板失败`);
                                    }
                                });
                            } catch (err) {
                                console.error('ClipboardItem不受支持: ', err);
                                if (saveToLocal) {
                                        this.statusUpdater.updatePostStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}`);
                                } else {
                                        this.statusUpdater.updatePostStatus(`复制到剪贴板失败（ClipboardItem不受支持）`);
                                }
                            }
                        });
                    } catch (err) {
                        console.error('无法使用剪贴板功能: ', err);
                        if (saveToLocal) {
                                this.statusUpdater.updatePostStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}`);
                        } else {
                                this.statusUpdater.updatePostStatus(`复制到剪贴板失败（无法使用剪贴板功能）`);
                        }
                    }
                } else {
                        this.statusUpdater.updatePostStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}`);
                }
            });
        })
        .catch(error => {
            // 确保在出错时也移除临时容器
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            console.error('导出图片失败:', error);
                this.statusUpdater.updatePostStatus('导出图片失败，请重试', true);
        });
}

// 获取排序方式的中文名称
    getSortMethodName(method) {
        console.log("[DEBUG] getSortMethodName 被调用");
    switch (method) {
        case 'like': return '按收藏数排序';
        case 'reply': return '按评论数排序';
        case 'time': return '按发布时间排序';
            case 'comprehensive': return '按综合关注程度排序';
        default: return '未知排序方式';
    }
}

// 获取导出设置
    getExportSettings() {
        console.log("[DEBUG] getExportSettings 被调用");
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

    /*************************************llm API*************************************/
    // 获取API设置
    getApiSettings() {
        console.log("[DEBUG] getApiSettings 被调用");
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

    // 总结树洞内容
    async summarizeTreehole() {
        console.log("[DEBUG] summarizeTreehole 被调用");
        try {
            this.statusUpdater.updateCommentStatus('正在准备总结树洞内容...');
            
            // 检查是否有评论数据
            if (!this.allCommentsData || this.allCommentsData.length === 0) {
                this.statusUpdater.updateCommentStatus('没有可用的评论数据，请先收集评论', true);
                return;
            }
            
            // 获取API设置
            const apiSettings = await this.getApiSettings();
            
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
                    树洞内容总结 (${apiSettings.aiPlatform === 'deepseek' ? 'DeepSeek' : '智谱GLM-4'})
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
            const mainPost = this.allCommentsData.find(comment => comment.isMainPost);
            
            // 筛选评论（根据发言人筛选）
            let filteredComments = this.allCommentsData.filter(comment => !comment.isMainPost);
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
            const modelNameForStatus = apiSettings.aiPlatform === 'deepseek' ? 
                (apiSettings.subModel === 'deepseek-reasoner' ? 'DeepSeek-R1' : 'DeepSeek-V3') : 
                `智谱${apiSettings.subModel.toUpperCase()}`;
            
            this.statusUpdater.updateCommentStatus(`正在调用${modelNameForStatus} API进行总结...`);
            
            // 根据选择的模型调用不同的API
            let summary;
            if (apiSettings.aiPlatform === 'deepseek') {
                summary = await this.summarizeWithDeepSeekAI(content, apiSettings.apiKey, apiSettings.subModel);
            } else {
                summary = await this.summarizeWithZhipuAI(content, apiSettings.apiKey, apiSettings.subModel);
            }
            
            
            // 获取模型名称显示
            let modelDisplayName = "";
            if (apiSettings.aiPlatform === 'deepseek') {
                if (apiSettings.subModel === 'deepseek-chat') {
                    modelDisplayName = "DeepSeek-V3";
                } else if (apiSettings.subModel === 'deepseek-reasoner') {
                    modelDisplayName = "DeepSeek-R1";
                } else {
                    modelDisplayName = "DeepSeek";
                }
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
                    ${summary.replace(/\n/g, '<br>')}
                </div>
            `;
            
            // 添加复制总结按钮事件
            document.getElementById('copy-summary').addEventListener('click', () => {
                navigator.clipboard.writeText(summary)
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
    async summarizeWithZhipuAI(content, apiKey, model = 'glm-4-flash') {
        console.log("[DEBUG] summarizeWithZhipuAI 被调用");
        try {
            const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            
            const prompt = `请总结以下树洞内容的主要观点和讨论要点，提炼关键信息，生成一个简洁的摘要：\n\n${content}`;
            
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
    async summarizeWithDeepSeekAI(content, apiKey, model = 'deepseek-chat') {
        console.log("[DEBUG] summarizeWithDeepSeekAI 被调用");
        try {
            const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
            
            const prompt = `请总结以下树洞内容的主要观点和讨论要点，提炼关键信息，生成一个简洁的摘要：\n\n${content}`;
            
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

    async classifyTreehole(content, apiKey) {
        console.log("[DEBUG] classifyTreehole 被调用");
        const categories = [
            "popi", "交友", "求助", "提问", "情感", "学习", "生活", "其他"
        ];
        
        const prompt = `请判断以下树洞内容属于哪个类别，只需回复类别名称，不要解释：
        类别选项：${categories.join("、")}

        树洞内容：${content}`;

        try {
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'glm-4-flash',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.1
                })
            });

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
            const mainPost = this.allCommentsData.find(comment => comment.isMainPost);
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
                let filteredComments = this.allCommentsData.filter(comment => !comment.isMainPost);
                
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
                const targetComments = this.allCommentsData.filter(comment => 
                    !comment.isMainPost && comment.speaker === replyTarget
                ).map(comment => `${comment.speaker}: ${comment.content}`).join('\n');
                
                if (!targetComments) {
                    throw new Error(`未找到用户 "${replyTarget}" 的评论`);
                }
                
                contentToProcess = `树洞内容: ${mainPostContent}\n\n${replyTarget}的评论:\n${targetComments}`;
                promptPrefix = `请针对用户"${replyTarget}"的评论生成一条回复。`;
            }
            
            // 获取API设置
            const apiSettings = await this.getApiSettings();
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

    start() {
        // 在页面加载完成后初始化
        // 创建 MutationObserver 来监听 DOM 变化
        this.mutationObserver = new MutationObserver((mutations) => {
            let hasNewNodes = false;

            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    hasNewNodes = true;
                }
            });

            if (hasNewNodes) {
                this.processHoles();
            }
        });

        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log("[PKU TreeHole] 收到消息:", request.action);

            switch (request.action) {
                case "startCollection":
                    try {
                        const currentCount = this.startCollection({
                            timeLimit: request.timeLimit,
                            postsLimit: request.postsLimit
                        });
                        sendResponse({ success: true, currentCount: currentCount });
                    } catch (error) {
                        console.error("[PKU TreeHole] 启动收集出错:", error);
                        sendResponse({ success: false, error: error.message });
                    }
                    break;

                case "stopCollection":
                    this.stopCollection(true, '从弹出窗口停止');
                    sendResponse({ success: true });
                    break;

                case "getHolesData":
                    console.log("[PKU TreeHole] 发送数据，数量:", this.holesData.length);
                    sendResponse({
                        holes: this.holesData,
                        isFinished: !this.isCollecting,
                        count: this.holesData.length
                    });
                    break;
            }
            return true;
        });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.loadInitialData();
                this.postUI.createFloatingPanel();
                this.observeSidebarChanges();
                this.addCommentCollectorStyles();
            });
        } else {
            this.loadInitialData();
            this.postUI.createFloatingPanel();
            this.observeSidebarChanges();
            this.addCommentCollectorStyles();
        }
    }
}

// 使用动态导入启动代码
async function initializeApp() {
    try {
        // 动态导入PostUI模块
        const PostUIModule = await import('./Modules/PostUI.js');
        const StatusUpdaterModule = await import('./Modules/StatusUpdater.js');
        
        // 获取模块中的默认导出
        const PostUI = PostUIModule.default;
        const StatusUpdater = StatusUpdaterModule.default;
        
        // 初始化应用
        const treeholeHelper = new TreeholeHelper();
        const statusUpdater = new StatusUpdater();
        const postUI = new PostUI(treeholeHelper, statusUpdater);
        treeholeHelper.setModules(postUI, statusUpdater);
        treeholeHelper.start();
        
        console.log("[PKU TreeHole] 应用初始化成功");
    } catch (error) {
        console.error("[PKU TreeHole] 模块加载失败:", error);
    }
}

// 启动应用
initializeApp();
