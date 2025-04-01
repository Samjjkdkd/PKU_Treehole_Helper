// PostUI.js - 处理树洞帖子UI显示和交互的类

class PostUI {
    constructor(dataManager, statusUpdater) {
        this.tabElement = null; // tab元素引用
        this.dataManager = dataManager;
        this.statusUpdater = statusUpdater;
    }

    setModules(exportManager, postCollector, postClassifier){
        this.exportManager = exportManager;
        this.postCollector = postCollector;
        this.postClassifier = postClassifier;
    }
    
    // 在文件开头添加面板创建代码
    createFloatingPanel() {
        // CSS样式已移动到style/floating-panel.css文件中

        const panel = document.createElement('div');
        panel.id = 'pku-treehole-panel';

        panel.innerHTML = `
            <div class="tab">
                <img src="${chrome.runtime.getURL('icon/icon48.png')}" class="icon" alt="PKU TreeHole Helper">
            </div>
            <div class="panel-content">
                <div class="instruction">
                    点击"开始收集数据"后，插件会自动滚动页面加载帖子，并收集排序展示收藏数据。
                </div>
                <div class="config-panel">
                    <div class="config-item">
                        <label>最大收集时间(分钟):</label>
                        <input type="number" id="time-limit" value="5" min="1" max="60">
                    </div>
                    <div class="config-item">
                        <label>最大帖子数量:</label>
                        <input type="number" id="posts-limit" value="3000" min="10" max="10000">
                    </div>
                    <div class="config-item">
                        <label>最早发布时间:</label>
                        <input type="datetime-local" id="end-time" step="60">
                        <button id="clear-time" class="small-btn treehole-btn-hover">清除</button>
                    </div>
                </div>
                <div class="auto-scroll-option">
                    <input type="checkbox" id="auto-scroll" checked>
                    <label for="auto-scroll">启用自动滚动</label>
                </div>
                <div class="sort-option">
                    <label>排序方式：</label>
                    <select id="sort-method">
                        <option value="comprehensive" selected>按综合关注程度排序</option>
                        <option value="like">按收藏数排序</option>
                        <option value="reply">按评论数排序</option>
                        <option value="time">按发布时间排序</option>
                    </select>
                </div>
                <div class="button-group" style="display: flex; align-items: center;">
                    <button id="start-btn" class="treehole-btn-hover" style="width: 120px;">开始收集数据</button>
                    <button id="stop-btn" class="treehole-btn-hover" style="display: none; width: 120px;">停止收集</button>
                    <button id="batch-classify-btn" class="treehole-btn-hover" style="background-color: #9C27B0; color: white; border: none; border-radius: 4px; margin-left: 10px; cursor: pointer;">批量分类</button>
                </div>
                <div class="export-group" style="margin-top: 10px; display: flex; justify-content: space-between;">
                    <button id="export-text-btn" class="treehole-btn-hover" style="flex: 1; margin-right: 5px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; padding: 6px 8px; cursor: pointer; font-size: 13px;">导出文本</button>
                    <button id="export-image-btn" class="treehole-btn-hover" style="flex: 1; margin-left: 5px; background-color: #2196F3; color: white; border: none; border-radius: 4px; padding: 6px 8px; cursor: pointer; font-size: 13px;">导出图片</button>
                </div>
                <div class="status" id="status-text"></div>
                <div id="holes-container">
                    <div class="loading">正在收集数据...</div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // 保存tab元素的引用
        this.tabElement = panel.querySelector('.tab');

        // 初始应用主题颜色
        this.applyThemeToTab();

        // 添加MutationObserver监听主题颜色变化
        const observer = new MutationObserver(() => this.applyThemeToTab());
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        // 每分钟检查一次主题颜色，以防MutationObserver未捕获到变化
        setInterval(() => this.applyThemeToTab(), 60000);

        // 添加事件监听器
        const startBtn = panel.querySelector('#start-btn');
        const stopBtn = panel.querySelector('#stop-btn');
        const exportTextBtn = panel.querySelector('#export-text-btn');
        const exportImageBtn = panel.querySelector('#export-image-btn');
        const batchClassifyBtn = panel.querySelector('#batch-classify-btn');
        const holesContainer = panel.querySelector('#holes-container');
        const loadingDiv = panel.querySelector('.loading');
        const statusText = panel.querySelector('#status-text');
        const timeLimitInput = panel.querySelector('#time-limit');
        const postsLimitInput = panel.querySelector('#posts-limit');
        const tab = panel.querySelector('.tab');

        // 添加点击切换面板状态的功能
        let isExpanded = false;
        tab.addEventListener('click', () => {
            isExpanded = !isExpanded;
            if (isExpanded) {
                panel.classList.add('expanded');
            } else {
                panel.classList.remove('expanded');
            }
        });

        // 点击面板内容区域时阻止事件冒泡，防止点击内容时收起面板
        panel.querySelector('.panel-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 点击页面其他区域时收起面板
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && isExpanded) {
                isExpanded = false;
                panel.classList.remove('expanded');
            }
        });
        
        // 创建一个闭包函数，将需要的引用传递给displayHoles
        const displayHoles = (holes) => {
            this.displayHoles(holes, panel, holesContainer, isExpanded);
        };

        // 设置时间输入框的默认值和清除按钮
        const endTimeInput = panel.querySelector('#end-time');
        const clearTimeBtn = panel.querySelector('#clear-time');

        // 设置默认时间为24小时前
        const defaultTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const year = defaultTime.getFullYear();
        const month = String(defaultTime.getMonth() + 1).padStart(2, '0');
        const day = String(defaultTime.getDate()).padStart(2, '0');
        const hours = String(defaultTime.getHours()).padStart(2, '0');
        const minutes = String(defaultTime.getMinutes()).padStart(2, '0');
        endTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // 监听时间输入框变化
        endTimeInput.addEventListener('change', () => {
            if (this.postCollector.timeReachLimited) {
                this.postCollector.timeReachLimited = false;
                this.statusUpdater.updatePostStatus('时间限制已修改，可以重新开始收集数据');
            }
        });
        
        // 监听帖子数量限制输入框变化
        postsLimitInput.addEventListener('change', () => {
            if (this.postCollector.postsReachLimited) {
                this.postCollector.postsReachLimited = false;
                this.statusUpdater.updatePostStatus('帖子数量限制已修改，可以重新开始收集数据');
            }
        });

        clearTimeBtn.addEventListener('click', () => {
            endTimeInput.value = '';
            
            // 重置发布时间限制标记
            if (this.postCollector.timeReachLimited) {
                this.postCollector.timeReachLimited = false;
                this.statusUpdater.updatePostStatus('时间限制已清除，可以重新开始收集数据');
            }

            // 添加视觉反馈
            clearTimeBtn.style.backgroundColor = '#4CAF50';
            clearTimeBtn.textContent = '已清除';

            // 0.8秒后恢复原样
            setTimeout(() => {
                clearTimeBtn.style.backgroundColor = '';
                clearTimeBtn.textContent = '清除';
            }, 800);
        });

        startBtn.addEventListener('click', () => {
            // 检查是否已经达到了发布时间限制
            if (this.postCollector.timeReachLimited) {
                this.statusUpdater.updatePostStatus('已达到发布时间限制，请修改或清除时间限制后再试', true);
                // 由于我们不会隐藏开始按钮，这里不需要恢复按钮状态
                return;
            }
            
            // 检查是否已经达到了帖子数量限制
            if (this.postCollector.postsReachLimited) {
                this.statusUpdater.updatePostStatus('已达到帖子数量限制，请增加数量限制后再试', true);
                return;
            }
            
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            loadingDiv.style.display = 'block';

            const timesLimit = parseInt(timeLimitInput.value);
            const postLimit = parseInt(postsLimitInput.value);
            const autoScrollEnabled = panel.querySelector('#auto-scroll').checked;
            const endTimeStr = endTimeInput.value;

            // 验证结束时间
            if (endTimeStr) {
                const endTimes = new Date(endTimeStr);
                // 获取当前页面最早的帖子时间
                const earliestPost = document.querySelector('.flow-item-row');
                if (earliestPost) {
                    const headerElement = earliestPost.querySelector('.box-header');
                    if (headerElement) {
                        const timeMatch = headerElement.textContent.match(/(\d{2}-\d{2} \d{2}:\d{2})/);
                        if (timeMatch) {
                            const currentYear = new Date().getFullYear();
                            const postTime = new Date(currentYear + '-' + timeMatch[1].replace(' ', ' '));

                            if (endTimes > postTime) {
                                this.statusUpdater.updatePostStatus('错误：设定的截止时间晚于当前可见帖子的发布时间', true);
                                startBtn.style.display = 'inline-block';
                                stopBtn.style.display = 'none';
                                loadingDiv.style.display = 'none';
                                return;
                            }
                        }
                    }
                }
            }

            try {
                const currentCount = this.postCollector.startCollection({
                    timeLimit: timesLimit * 60 * 1000,
                    postsLimit: postLimit,
                    autoScroll: autoScrollEnabled,
                    endTime: endTimeStr ? new Date(endTimeStr) : null
                });
                this.statusUpdater.updatePostStatus(`开始收集数据，当前已有 ${currentCount || 0} 条数据${autoScrollEnabled ? '' : '（手动滚动模式）'}`);
            } catch (error) {
                this.statusUpdater.updatePostStatus('收集数据失败: ' + error.message, true);
                this.postCollector.stopCollection(true, '出现错误');
            }
        });

        stopBtn.addEventListener('click', () =>{
            this.postCollector.stopCollection(true, '');//手动停止收集不提示
        });

        exportTextBtn.addEventListener('click', () => {
            this.exportManager.exportHolesAsText();
        });

        exportImageBtn.addEventListener('click', () => {
            this.exportManager.exportHolesAsImage();
        });

        // 添加排序方式变更监听
        panel.querySelector('#sort-method').addEventListener('change', () => {
            displayHoles(this.dataManager.holesData);
        });

        // 定期更新显示
        setInterval(() => {
            if (this.postCollector.isCollecting) {
                displayHoles(this.dataManager.holesData);
                const elapsedTime = (Date.now() - this.postCollector.startTime) / 1000;
                // 获取最后一条帖子的发布时间
                const lastTime = this.dataManager.holesData.length > 0 ? this.dataManager.holesData[this.dataManager.holesData.length - 1].publishTime : '';
                this.statusUpdater.updatePostStatus(`已收集 ${this.dataManager.holesData.length} 条数据，用时 ${elapsedTime.toFixed(0)} 秒${lastTime ? '，最后帖子发布于 ' + lastTime : ''}`);
            }
        }, 1000);

        // 添加批量分类按钮的事件监听
        batchClassifyBtn.addEventListener('click', async () => {
            // 如果正在分类，则停止分类
            if (this.postClassifier.isClassifying) {
                this.postClassifier.stopClassifying(batchClassifyBtn);
                return;
            }
            
            try {
                const apiSettings = await this.dataManager.getApiSettings();
                if (!apiSettings.apiKey) {
                    throw new Error('请先在设置中配置API Key');
                }
                
                if (this.dataManager.holesData.length === 0) {
                    throw new Error('暂无数据，请先收集树洞数据');
                }
                
                // 开始分类
                this.postClassifier.startClassifying(apiSettings.apiKey, batchClassifyBtn, panel);
                
            } catch (error) {
                alert('批量分类失败: ' + error.message);
            }
        });
        
        // 初始化状态元素引用
        this.statusUpdater.initStatusElement();
    }

    // 显示树洞数据的方法
    displayHoles(holes, panel, holesContainer, isExpanded) {
        if (!holes || holes.length === 0) {
            if (holesContainer) {
                holesContainer.innerHTML = '<div class="no-data">暂无数据，请点击"开始收集数据"</div>';
            }
            return;
        }

        if (!holesContainer) {
            const panelElement = document.getElementById('pku-treehole-panel');
            if (panelElement) {
                holesContainer = panelElement.querySelector('#holes-container');
            }
            if (!holesContainer) {
                console.error("[PKU TreeHole] 无法找到holes-container元素");
                return;
            }
        }

        holesContainer.innerHTML = '';
        const sortMethod = panel ? panel.querySelector('#sort-method').value : 'comprehensive';

        // 使用排序函数
        const sortedHoles = this.sortHolesByMethod(holes, sortMethod);

        sortedHoles.forEach(hole => {
            const holeDiv = document.createElement('div');
            holeDiv.className = 'hole-item treehole-item-hover';
            holeDiv.setAttribute('data-hole-id', hole.id);
            holeDiv.innerHTML = `
                <div>
                    ${hole.category ? `<span class="category-tag" style="display: inline-flex; align-items: center; padding: 2px 5px; border-radius: 4px; margin-right: 5px; font-size: 12px; background-color: ${this.postClassifier.getCategoryColor(hole.category)}; color: white;">${this.postClassifier.getCategoryIcon(hole.category)} ${hole.category}</span>` : ''}
                    <span class="hole-id">#${hole.id}</span>
                    <span class="like-count">收藏数：${hole.likeCount}</span>
                    <span class="reply-count">评论数：${hole.replyCount}</span>
                    <span class="publish-time">${hole.publishTime}</span>
                    ${hole.hasImage ? '<span class="has-image"><i class="icon-image"></i>含图片</span>' : ''}
                </div>
                <div class="content">${hole.content}</div>
            `;

            // 添加点击事件
            holeDiv.addEventListener('click', () => {
                // 查找对应的帖子元素
                const targetHole = Array.from(document.querySelectorAll('.flow-item-row')).find(item => {
                    const idElement = item.querySelector('.box-id');
                    return idElement && idElement.textContent.trim().replace('#', '').trim() === hole.id;
                });

                if (targetHole) {
                    // 收起面板
                    if (panel && isExpanded !== undefined) {
                        panel.classList.remove('expanded');
                        // 更新外部的isExpanded状态
                        if (typeof isExpanded === 'boolean') {
                            isExpanded = false;
                        }
                    }

                    // 滚动到目标位置
                    targetHole.scrollIntoView({ behavior: "smooth", block: "center" });

                    // 添加高亮效果
                    targetHole.style.transition = 'background-color 0.3s ease';
                    targetHole.style.backgroundColor = '#fff3cd';
                    setTimeout(() => {
                        targetHole.style.backgroundColor = '';
                    }, 1000);
                }
            });

            holesContainer.appendChild(holeDiv);
        });
    }

    // 检查并应用主题颜色到tab
    applyThemeToTab() {
        // 检查是否存在root-dark-mode类
        const appElement = document.getElementById('app');
        const hasRootDarkMode = appElement && appElement.classList.contains('root-dark-mode');

        // 如果找到root-dark-mode类，直接应用深色主题
        if (hasRootDarkMode) {
            if (this.tabElement) {
                this.tabElement.style.backgroundColor = '#333333'; // 深灰色背景
                this.tabElement.style.color = 'white'; // 白色文本
                this.tabElement.dataset.theme = 'dark'; // 设置数据属性表示当前是深色主题
            }
            return; // 已经应用了主题，直接返回
        } else {
            if (this.tabElement) {
                this.tabElement.style.backgroundColor = '#f0f0f0'; // 浅灰色背景
                this.tabElement.style.color = '#333'; // 深色文本，提高对比度
                this.tabElement.dataset.theme = 'light'; // 设置数据属性表示当前是浅色主题
            }
        }
    }

    // 添加排序函数
    sortHolesByMethod(holes, method) {
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
}

// 导出PostUI类，以便在其他文件中引用
export default PostUI; 