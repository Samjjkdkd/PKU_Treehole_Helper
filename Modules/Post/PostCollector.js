class PostCollector{
    constructor(dataManager, statusUpdater, postUI){
        this.dataManager = dataManager;
        this.statusUpdater = statusUpdater;
        this.postUI = postUI;
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
    }
    
    setModules(pageInitializer){
        this.pageInitializer = pageInitializer;
    }

    // 加载初始数据
    loadInitialData() {
        this.processHoles();
    }

    // 开始收集数据
    startCollection(options) {
        // 如果正在收集中，先停止当前收集
        if (this.isCollecting) {
            this.stopCollection(false);
        }

        // 设置新的收集参数（不清空已有数据）
        this.isCollecting = true;
        this.timeLimit = options.timeLimit;
        this.postsLimit = options.postsLimit;
        this.startTime = Date.now();
        this.endTime = options.endTime || null;  // 确保设置endTime全局变量

        // 初始化页面监视
        this.pageInitializer.initPageObserver();

        // 处理当前可见帖子
        this.loadInitialData();

        // 启动定期检查
        if (!this.checkInterval) {
            this.checkInterval = setInterval(() => this.processHoles(), 2000); // 每2秒检查一次新数据
        }

        // 根据选项决定是否开始自动滚动
        if (options.autoScroll) {
            this.autoScroll();
        }

        // 返回当前已有的数据数量
            return this.dataManager.holesData.length;
    }

    // 停止收集数据
    stopCollection(updateUI = false, reason = '') {
        
        // 防止重复调用
        if (!this.isCollecting) {
            return;
        }
        
        // 检查是否因为发布时间限制而停止
        if (reason === '达到发布时间限制') {
            this.timeReachLimited = true;
        }
        
        // 检查是否因为达到帖子数量限制而停止
        if (reason === '达到帖子数量限制') {
            this.postsReachLimited = true;
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
            
            // 获取面板元素
            const panel = document.getElementById('pku-treehole-panel');
            if (panel) {
                
                // 获取按钮和加载指示器
                const startBtn = panel.querySelector('#start-btn');
                const stopBtn = panel.querySelector('#stop-btn');
                const loadingDiv = panel.querySelector('.loading');
                const holesContainer = panel.querySelector('#holes-container');
                
                // 更新按钮状态
                if (startBtn) {
                    startBtn.style.display = 'inline-block';
                }
                if (stopBtn) {
                    stopBtn.style.display = 'none';
                }
                if (loadingDiv) {
                    loadingDiv.style.display = 'none';
                }
                
                // 获取最后一条帖子的发布时间
                const lastTime = this.dataManager.holesData.length > 0 ? this.dataManager.holesData[this.dataManager.holesData.length - 1].publishTime : '';
                
                // 构建状态消息
                let statusMessage = `收集完成，共 ${this.dataManager.holesData.length} 条数据`;
                if (lastTime) {
                    statusMessage += `，最后帖子发布于 ${lastTime}`;
                }
                if (reason) {
                    statusMessage += `（${reason}）`;
                }
                
                try {
                    this.statusUpdater.updatePostStatus(statusMessage);
                    
                    // 使用延时来避免可能的递归调用
                    setTimeout(() => {
                        this.postUI.displayHoles(this.dataManager.holesData, panel, holesContainer, false);
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
                // 使用全局状态更新
                this.statusUpdater.updatePostStatus(`收集完成，共 ${this.dataManager.holesData.length} 条数据${reason ? ` (${reason})` : ''}`);
                
                // 即使找不到面板也尝试调用displayHoles
                // this.postUI.displayHoles(this.dataManager.holesData, null, null, false);
            }
        }
    }

    // 自动滚动函数
    autoScroll() {
        if (this.isScrolling) return;

        this.isScrolling = true;

        // 使用用户提供的滚动容器
        const scrollContainer = document.querySelector(".left-container");
        if (!scrollContainer) {
            console.error("[PKU TreeHole] 无法找到滚动容器");
                this.isScrolling = false;
            return;
        }

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
                const reachedLimit = this.postsLimit && this.dataManager.holesData.length >= this.postsLimit;

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
                } else {
                    // 短暂暂停后继续滚动
                    setTimeout(() => this.autoScroll(), 2000);
                }
            }
        }, 500); // 每500毫秒滚动一次
    }

// 处理帖子数据
    processHoles() {
        
        // 如果已经停止收集，直接返回
        if (!this.isCollecting) {
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
                        // 注意：这里的逻辑是，如果帖子时间早于或等于截止时间，则停止收集
                        if (postTime <= this.endTime) {
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
                    const existingIndex = this.dataManager.holesData.findIndex(h => h.id === id);
                if (existingIndex === -1) {
                        this.dataManager.holesData.push(holeData);
                    newHolesCount++;
                } else {
                        this.dataManager.holesData[existingIndex] = holeData;
                }
            }

            hole.dataset.processed = 'true';
        });

        // 检查是否需要停止收集
        if (this.isCollecting) {
        const currentTime = Date.now();
            const timeExpired = this.timeLimit && (currentTime - this.startTime > this.timeLimit);
            const reachedLimit = this.postsLimit && this.dataManager.holesData.length >= this.postsLimit;

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
}

// 导出PostCollector类
export default PostCollector;

