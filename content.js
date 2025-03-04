// 存储帖子数据
let holesData = [];
let isCollecting = false;
let timeLimit = null;
let postsLimit = null;
let startTime = null;
let checkInterval = null;
let scrollInterval = null;
let isScrolling = false;
let endTime = null;
let commentsData = []; // 存储评论数据
let allCommentsData = []; // 存储所有评论数据
let speakerList = new Set(); // 存储所有发言人列表
let statusTextElement = null; // 状态文本元素引用
let tabElement = null; // tab元素引用

// 全局状态更新函数
function updateGlobalStatus(text, isError = false) {
    if (statusTextElement) {
        statusTextElement.style.display = 'block';
        statusTextElement.style.background = isError ? '#ffebee' : '#e8f5e9';
        statusTextElement.textContent = text;
    } else {
        console.log(`状态更新: ${text}${isError ? ' (错误)' : ''}`);
    }
}

// 检查并应用主题颜色到tab
function applyThemeToTab() {

    // 检查是否存在root-dark-mode类
    const appElement = document.getElementById('app');
    const hasRootDarkMode = appElement && appElement.classList.contains('root-dark-mode');

    // 如果找到root-dark-mode类，直接应用深色主题
    if (hasRootDarkMode) {
        if (tabElement) {
            tabElement.style.backgroundColor = '#333333'; // 深灰色背景
            tabElement.style.color = 'white'; // 白色文本
            tabElement.dataset.theme = 'dark'; // 设置数据属性表示当前是深色主题
        }
        return; // 已经应用了主题，直接返回
    } else {
        if (tabElement) {
            tabElement.style.backgroundColor = '#f0f0f0'; // 浅灰色背景
            tabElement.style.color = '#333'; // 深色文本，提高对比度
            tabElement.dataset.theme = 'light'; // 设置数据属性表示当前是浅色主题
        }
    }
}

// 评论自动滚动相关变量
let commentsScrollInterval = null;
let isCommentsScrolling = false;

// 评论收集相关变量
let isCollectingComments = false;
let commentCollectionStartTime = 0;
let commentCollectionTimer = null;
let collectedCommentIds = new Set();
let earliestCommentTime = null;
let latestCommentTime = null; // 新增：用于记录最晚评论时间
let totalExpectedComments = 0; // 预期的总评论数量

// 自动滚动函数
function autoScroll() {
    if (isScrolling) return;

    isScrolling = true;

    // 使用用户提供的滚动容器
    const scrollContainer = document.querySelector(".left-container");
    if (!scrollContainer) {
        console.error("[PKU TreeHole] 无法找到滚动容器");
        isScrolling = false;
        return;
    }

    console.log("[PKU TreeHole] 开始自动滚动...");

    let scrollCount = 0;
    const maxScrolls = 200; // 防止无限滚动

    // 清除可能存在的上一个滚动计时器
    if (scrollInterval) {
        clearInterval(scrollInterval);
    }

    scrollInterval = setInterval(() => {
        // 滚动页面
        scrollContainer.scrollBy(0, 5000);
        scrollCount++;

        // 检查是否需要停止滚动
        const timeExpired = timeLimit && (Date.now() - startTime > timeLimit);
        const reachedLimit = postsLimit && holesData.length >= postsLimit;

        if (timeExpired || reachedLimit || scrollCount > maxScrolls) {
            clearInterval(scrollInterval);
            scrollInterval = null;
            isScrolling = false;

            if (timeExpired || reachedLimit) {
                stopCollection();
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                console.log("[PKU TreeHole] 达到限制条件，停止滚动");
            } else {
                console.log("[PKU TreeHole] 滚动次数达到上限，短暂暂停后继续");
                // 短暂暂停后继续滚动
                setTimeout(autoScroll, 2000);
            }
        }
    }, 500); // 每500毫秒滚动一次
}

// 处理帖子数据
function processHoles() {
    const holes = document.querySelectorAll('.flow-item-row');
    let newHolesCount = 0;
    let reachedTimeLimit = false;

    holes.forEach(hole => {
        if (hole.dataset.processed) return;

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

            // 检查是否达到时间限制
            if (timeLimit && publishTime) {
                const currentYear = new Date().getFullYear();
                const postTime = new Date(currentYear + '-' + publishTime.replace(' ', ' '));
                if (endTime && postTime <= endTime) {
                    reachedTimeLimit = true;
                    stopCollection();
                    return;
                }
            }

            // 存储数据
            const holeData = {
                id: id,
                content: content,
                likeCount: count,
                replyCount: replies,
                publishTime: publishTime,
                hasImage: hasImage
            };

            // 检查是否已存在该帖子
            const existingIndex = holesData.findIndex(h => h.id === id);
            if (existingIndex === -1) {
                holesData.push(holeData);
                newHolesCount++;
            } else {
                holesData[existingIndex] = holeData;
            }
        }

        hole.dataset.processed = 'true';
    });

    if (newHolesCount > 0) {
        console.log(`[PKU TreeHole] 新增 ${newHolesCount} 条帖子，总计 ${holesData.length} 条`);
    }

    // 检查是否需要停止收集
    if (isCollecting) {
        const currentTime = Date.now();
        const timeExpired = timeLimit && (currentTime - startTime > timeLimit);
        const reachedLimit = postsLimit && holesData.length >= postsLimit;

        if (timeExpired || reachedLimit || reachedTimeLimit) {
            stopCollection();
        }
    }
}

// 创建 MutationObserver 来监听 DOM 变化
const mutationObserver = new MutationObserver((mutations) => {
    let hasNewNodes = false;

    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            hasNewNodes = true;
        }
    });

    if (hasNewNodes) {
        processHoles();
    }
});

// 初始化页面监视器
function initPageObserver() {
    // 监听整个页面的变化
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log("[PKU TreeHole] 已初始化页面监视器");
}

// 加载初始数据
function loadInitialData() {
    processHoles();
    console.log("[PKU TreeHole] 已处理初始可见帖子");
}

// 开始收集数据
function startCollection(options) {
    console.log("[PKU TreeHole] 开始收集数据，时间限制:", options.timeLimit / 1000, "秒，数量限制:", options.postsLimit);

    // 如果正在收集中，先停止当前收集
    if (isCollecting) {
        console.log("[PKU TreeHole] 已有收集任务正在进行，重新开始...");
        stopCollection();
    }

    // 设置新的收集参数（不清空已有数据）
    isCollecting = true;
    timeLimit = options.timeLimit;
    postsLimit = options.postsLimit;
    startTime = Date.now();

    // 初始化页面监视
    initPageObserver();

    // 处理当前可见帖子
    loadInitialData();

    // 启动定期检查
    if (!checkInterval) {
        checkInterval = setInterval(processHoles, 2000); // 每2秒检查一次新数据
    }

    // 根据选项决定是否开始自动滚动
    if (options.autoScroll) {
        console.log("[PKU TreeHole] 启用自动滚动");
        autoScroll();
    } else {
        console.log("[PKU TreeHole] 禁用自动滚动");
    }

    // 返回当前已有的数据数量
    return holesData.length;
}

// 停止收集数据
function stopCollection() {
    console.log("[PKU TreeHole] 停止收集，共收集到", holesData.length, "条帖子");

    isCollecting = false;
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }

    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
    isScrolling = false;
}

// 清空收集的数据
function clearHolesData() {
    console.log("[PKU TreeHole] 清空所有数据");
    holesData = [];

    // 清除所有帖子的processed标记
    const holes = document.querySelectorAll('.flow-item-row');
    holes.forEach(hole => {
        delete hole.dataset.processed;
    });
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("[PKU TreeHole] 收到消息:", request.action);

    switch (request.action) {
        case "startCollection":
            try {
                const currentCount = startCollection({
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
            stopCollection();
            sendResponse({ success: true });
            break;

        case "getHolesData":
            console.log("[PKU TreeHole] 发送数据，数量:", holesData.length);
            sendResponse({
                holes: holesData,
                isFinished: !isCollecting,
                count: holesData.length
            });
            break;

        case "clearData":
            clearHolesData();
            sendResponse({ success: true });
            break;
    }
    return true;
});

// 在文件开头添加面板创建代码
function createFloatingPanel() {
    // 创建通用的按钮悬浮效果样式
    const floatingPanelStyles = document.createElement('style');
    floatingPanelStyles.textContent = `
        /* 按钮悬浮效果 */
        .treehole-btn-hover {
            transition: transform 0.2s ease, background-color 0.2s ease, opacity 0.2s ease !important;
        }
        .treehole-btn-hover:hover {
            transform: scale(1.05) !important;
        }
        
        /* 针对开始按钮的特殊效果 */
        #start-btn:hover {
            background-color: #0f5bdb !important;
            filter: brightness(1.1);
        }
        
        /* 针对停止按钮的特殊效果 */
        #stop-btn:hover {
            background-color: #d32f2f !important;
            filter: brightness(1.1);
        }
        
        /* 针对导出按钮的特殊效果 */
        #export-text-btn:hover {
            background-color: #2E7D32 !important;
            filter: brightness(1.1);
        }
        
        #export-image-btn:hover {
            background-color: #1565C0 !important;
            filter: brightness(1.1);
        }
        
        /* 小按钮的悬浮效果 */
        .small-btn:hover {
            transform: scale(1.1) !important;
            background-color: #666 !important;
        }
        
        /* 输入框的焦点效果 */
        .config-item input:focus {
            border-color: #1a73e8 !important;
            box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2) !important;
            transform: scale(1.02);
        }
        
        /* 下拉框的悬浮效果 */
        .sort-option select:hover {
            border-color: #1a73e8 !important;
            transform: scale(1.05);
        }
    `;
    document.head.appendChild(floatingPanelStyles);

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
                    <option value="like">按收藏数排序</option>
                    <option value="reply">按评论数排序</option>
                    <option value="time">按发布时间排序</option>
                </select>
            </div>
            <div class="button-group">
                <button id="start-btn" class="treehole-btn-hover">开始收集数据</button>
                <button id="stop-btn" class="treehole-btn-hover">停止收集</button>
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
    tabElement = panel.querySelector('.tab');

    // 初始应用主题颜色
    applyThemeToTab();

    // 添加MutationObserver监听主题颜色变化
    const observer = new MutationObserver(applyThemeToTab);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['style', 'class']
    });

    // 每分钟检查一次主题颜色，以防MutationObserver未捕获到变化
    setInterval(applyThemeToTab, 60000);

    // 对悬浮窗中的元素添加悬浮效果
    // 为输入框添加过渡效果
    const inputs = panel.querySelectorAll('input[type="number"], input[type="datetime-local"]');
    inputs.forEach(input => {
        input.style.transition = 'all 0.2s ease';
    });

    // 为下拉框添加过渡效果
    const selects = panel.querySelectorAll('select');
    selects.forEach(select => {
        select.style.transition = 'all 0.2s ease';
    });

    // 添加事件监听器
    const startBtn = panel.querySelector('#start-btn');
    const stopBtn = panel.querySelector('#stop-btn');
    const exportTextBtn = panel.querySelector('#export-text-btn');
    const exportImageBtn = panel.querySelector('#export-image-btn');
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

    function updateStatus(text, isError = false) {
        statusTextElement = statusText; // 保存对状态文本元素的引用
        updateGlobalStatus(text, isError);
    }

    function displayHoles(holes) {
        if (!holes || holes.length === 0) {
            holesContainer.innerHTML = '<div class="no-data">暂无数据，请点击"开始收集数据"</div>';
            return;
        }

        holesContainer.innerHTML = '';
        const sortMethod = panel.querySelector('#sort-method').value;

        // 根据选择的方式排序
        let sortedHoles = [...holes];
        switch (sortMethod) {
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
        }

        sortedHoles.forEach(hole => {
            const holeDiv = document.createElement('div');
            holeDiv.className = 'hole-item treehole-item-hover';
            holeDiv.innerHTML = `
                <div>
                    <span class="hole-id">#${hole.id}</span>
                    <span class="like-count">收藏数：${hole.likeCount}</span>
                    <span class="reply-count">评论数：${hole.replyCount}</span>
                    <span class="publish-time">${hole.publishTime}</span>
                    ${hole.hasImage ? '<span class="has-image"><i class="icon-image"></i>含图片</span>' : ''}
                </div>
                <div class="content">${hole.content}</div>
            `;

            // 设置悬浮效果样式
            holeDiv.style.transition = 'all 0.2s ease';
            holeDiv.onmouseover = () => {
                holeDiv.style.transform = 'translateX(-2px) scale(1.01)';
                holeDiv.style.backgroundColor = '#f5f8ff';
                holeDiv.style.borderColor = '#1a73e8';
                holeDiv.style.boxShadow = '0 2px 5px rgba(26, 115, 232, 0.1)';
            };
            holeDiv.onmouseout = () => {
                holeDiv.style.transform = 'translateX(0) scale(1)';
                holeDiv.style.backgroundColor = '';
                holeDiv.style.borderColor = '#ddd';
                holeDiv.style.boxShadow = 'none';
            };

            // 添加点击事件
            holeDiv.addEventListener('click', () => {
                // 查找对应的帖子元素
                const targetHole = Array.from(document.querySelectorAll('.flow-item-row')).find(item => {
                    const idElement = item.querySelector('.box-id');
                    return idElement && idElement.textContent.trim().replace('#', '').trim() === hole.id;
                });

                if (targetHole) {
                    // 收起面板
                    panel.classList.remove('expanded');
                    isExpanded = false;

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

            // 添加鼠标悬停效果
            holeDiv.style.cursor = 'pointer';
            holesContainer.appendChild(holeDiv);
        });
    }

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

    clearTimeBtn.addEventListener('click', () => {
        endTimeInput.value = '';

        // 添加视觉反馈
        clearTimeBtn.style.backgroundColor = '#4CAF50';
        clearTimeBtn.textContent = '已清除';

        // 0.8秒后恢复原样
        setTimeout(() => {
            clearTimeBtn.style.backgroundColor = '';
            clearTimeBtn.textContent = '清除';
        }, 800);
    });

    startBtn.addEventListener('click', function () {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        loadingDiv.style.display = 'block';

        const timeLimit = parseInt(timeLimitInput.value);
        const postsLimit = parseInt(postsLimitInput.value);
        const autoScrollEnabled = panel.querySelector('#auto-scroll').checked;
        const endTimeStr = endTimeInput.value;

        // 验证结束时间
        if (endTimeStr) {
            const endTime = new Date(endTimeStr);
            // 获取当前页面最早的帖子时间
            const earliestPost = document.querySelector('.flow-item-row');
            if (earliestPost) {
                const headerElement = earliestPost.querySelector('.box-header');
                if (headerElement) {
                    const timeMatch = headerElement.textContent.match(/(\d{2}-\d{2} \d{2}:\d{2})/);
                    if (timeMatch) {
                        const currentYear = new Date().getFullYear();
                        const postTime = new Date(currentYear + '-' + timeMatch[1].replace(' ', ' '));

                        if (endTime > postTime) {
                            updateStatus('错误：设定的截止时间晚于当前可见帖子的发布时间', true);
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
            const currentCount = startCollection({
                timeLimit: timeLimit * 60 * 1000,
                postsLimit: postsLimit,
                autoScroll: autoScrollEnabled,
                endTime: endTimeStr ? new Date(endTimeStr) : null
            });
            updateStatus(`开始收集数据，当前已有 ${currentCount || 0} 条数据${autoScrollEnabled ? '' : '（手动滚动模式）'}`);
        } catch (error) {
            updateStatus('收集数据失败: ' + error.message, true);
            stopCollection();
        }
    });

    stopBtn.addEventListener('click', function () {
        stopCollection();
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        loadingDiv.style.display = 'none';

        // 获取最后一条帖子的发布时间
        const lastTime = holesData.length > 0 ? holesData[holesData.length - 1].publishTime : '';
        updateStatus(`收集完成，共 ${holesData.length} 条数据${lastTime ? '，最后帖子发布于 ' + lastTime : ''}`);
        displayHoles(holesData);
    });

    exportTextBtn.addEventListener('click', function () {
        exportHolesAsText();
    });

    exportImageBtn.addEventListener('click', function () {
        exportHolesAsImage();
    });

    // 添加排序方式变更监听
    panel.querySelector('#sort-method').addEventListener('change', () => {
        displayHoles(holesData);
    });

    // 定期更新显示
    setInterval(() => {
        if (isCollecting) {
            displayHoles(holesData);
            const elapsedTime = (Date.now() - startTime) / 1000;
            // 获取最后一条帖子的发布时间
            const lastTime = holesData.length > 0 ? holesData[holesData.length - 1].publishTime : '';
            updateStatus(`已收集 ${holesData.length} 条数据，用时 ${elapsedTime.toFixed(0)} 秒${lastTime ? '，最后帖子发布于 ' + lastTime : ''}`);
        }
    }, 1000);
}

// 在原有代码后面添加新的函数
function createCommentCollectorButton() {
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
    button.addEventListener('click', function () {
        showCommentCollectorDialog();
    });
}

// 创建评论收集对话框
function showCommentCollectorDialog() {
    // 检查是否已存在对话框
    let dialog = document.getElementById('comment-collector-dialog');
    if (dialog) {
        // 使用flex而不是block来显示对话框，保持布局结构
        dialog.style.display = 'flex';
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
        #export-text:hover, #export-image:hover {
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
                        <input type="checkbox" id="auto-scroll-comments" style="margin-right: 5px;">
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
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 13px;">导出评论：</span>
                        <div style="display: flex; gap: 8px;">
                            <button id="export-text" class="hover-effect" style="background-color: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">文本格式</button>
                            <button id="export-image" class="hover-effect" style="background-color: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">图片格式</button>
                        </div>
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
    document.getElementById('close-comment-dialog').addEventListener('click', function () {
        // 停止自动滚动
        stopCommentsAutoScroll(false);
        // 停止收集评论（如果正在进行）
        stopCollectComments();
        // 只隐藏对话框，不改变其布局属性
        dialog.style.display = 'none';
    });

    // 添加收集评论按钮事件
    document.getElementById('toggle-collect-comments').addEventListener('click', function () {
        const button = document.getElementById('toggle-collect-comments');
        if (button.textContent === '开始收集') {
            startCollectComments();
            button.textContent = '停止收集';
            button.style.backgroundColor = '#e53935';

            // 显示统计区域
            document.getElementById('comment-stats').style.display = 'block';
        } else {
            stopCollectComments();
            button.textContent = '开始收集';
            button.style.backgroundColor = '#1a73e8';
        }
    });

    // 添加自动滚动复选框事件
    const autoScrollCheckbox = document.getElementById('auto-scroll-comments');
    autoScrollCheckbox.addEventListener('change', function () {
        // 改为仅设置状态，不触发滚动
        console.log("[PKU TreeHole] 自动滚动设置: " + (this.checked ? "开启" : "关闭"));
    });

    // 添加筛选下拉框事件（初始状态下隐藏）
    const speakerFilter = document.getElementById('speaker-filter');
    if (speakerFilter) {
        speakerFilter.addEventListener('change', filterAndDisplayComments);
    }

    // 添加导出按钮事件监听器
    const exportTextButton = document.getElementById('export-text');
    if (exportTextButton) {
        exportTextButton.addEventListener('click', exportAsText);
    }

    const exportImageButton = document.getElementById('export-image');
    if (exportImageButton) {
        exportImageButton.addEventListener('click', exportAsImage);
    }

    // 添加拖拽功能
    const dialogHeader = document.getElementById('comment-dialog-header');
    let isDragging = false;
    let offsetX, offsetY;

    dialogHeader.addEventListener('mousedown', function (e) {
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

    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;

        // 计算新位置
        const newLeft = e.clientX - offsetX;
        const newTop = e.clientY - offsetY;

        // 应用新位置
        dialog.style.left = newLeft + 'px';
        dialog.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', function () {
        if (isDragging) {
            isDragging = false;
            dialogHeader.style.cursor = 'move';
        }
    });

    // 添加调整大小功能
    const resizeHandle = document.getElementById('resize-handle');
    let isResizing = false;
    let originalWidth, originalHeight, originalX, originalY;

    resizeHandle.addEventListener('mousedown', function (e) {
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

    document.addEventListener('mousemove', function (e) {
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

    document.addEventListener('mouseup', function () {
        if (isResizing) {
            isResizing = false;
        }
    });
}

// 收集评论
function collectComments(isInitialCollection = false) {
    // 获取评论容器
    const commentsContainer = document.querySelector(".sidebar-content");
    if (!commentsContainer) {
        updateCommentCollectorStatus("无法找到评论容器", true);
        return;
    }

    // 获取所有评论元素
    const commentElements = commentsContainer.querySelectorAll(".box:not(.box-tip):not(.box33)");
    if (!commentElements || commentElements.length === 0) {
        updateCommentCollectorStatus("未找到评论", true);
        return;
    }

    updateCommentCollectorStatus(`找到 ${commentElements.length} 条评论，正在处理...`);

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
                if (!earliestCommentTime || publishTime < earliestCommentTime) {
                    earliestCommentTime = publishTime;
                }
                
                // 更新最晚评论时间
                if (!latestCommentTime || publishTime > latestCommentTime) {
                    latestCommentTime = publishTime;
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
            commentData = extractMainPostData(element);
            
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
                    commentData = extractCommentData(element);
                    if (commentData) {
                        nonMainPostComments.push(commentData);
                    }
                }
            }
        } else {
            // 处理普通评论
            commentData = extractCommentData(element);
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
            collectedCommentIds.add(commentId);
            
            // 如果不是主贴，将发言人添加到全局集合
            if (!commentData.isMainPost && commentData.speaker) {
                speakerList.add(commentData.speaker);
            }
        }
    });
    
    // 将非主贴评论添加到全局数组
    // 使用Set去重，避免重复添加同一条评论
    if (foundMainPost && mainPostData 
        && !allCommentsData.find(comment => comment.isMainPost)) {
        allCommentsData.push(mainPostData);
    }

    nonMainPostComments.forEach(comment => {
        // 检查评论是否已经存在于allCommentsData中
        const isDuplicate = allCommentsData.some(existingComment => 
            existingComment.id === comment.id);
        
        if (!isDuplicate) {
            allCommentsData.push(comment);
        }
    });
    
    // 如果找到了主贴，更新全局统计信息
    if (foundMainPost && mainPostData) {
        // 更新全局统计信息
        totalExpectedComments = mainPostData.comments || 0;
        
        // 根据是否有评论显示不同的信息
        if (totalExpectedComments > 0) {
            updateCommentCollectorStatus(`开始收集评论 (共 ${totalExpectedComments} 条)`);
        } else {
            updateCommentCollectorStatus(`开始收集评论 (暂无其他评论)`);
        }
    }

    // 显示收集到的评论
    const dialogCommentsContainer = document.getElementById("comments-container");
    if (dialogCommentsContainer) {
        // 清空之前的内容
        if (!isCommentsScrolling && isInitialCollection) {
            dialogCommentsContainer.innerHTML = "";
        }

        // 显示评论
        displayComments(comments, dialogCommentsContainer);

        // 更新状态信息（包括主贴中的总数信息）
        const collectedCount = allCommentsData.filter(comment => !comment.isMainPost).length; // 使用非主贴评论的数量
        let statusMessage = '';
        
        if (totalExpectedComments > 0) {
            const progressInfo = totalExpectedComments ? 
                ` (${Math.round((collectedCount / totalExpectedComments) * 100)}%)` : "";
            statusMessage = `已收集 ${collectedCount}/${totalExpectedComments} 条评论${progressInfo}`;
        } else {
            statusMessage = `已收集 ${collectedCount} 条评论`;
        }
        
        updateCommentCollectorStatus(statusMessage);
        
        // 更新评论统计数据
        updateCommentStats(
            collectedCount,
            Math.floor((Date.now() - commentCollectionStartTime) / 1000),
            latestCommentTime || '未知'
        );
    }
    
    return comments;
}

// 提取评论数据
function extractCommentData(commentElement) {
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
function displayComments(comments, container) {
    if (!container) return;

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
            commentDiv.style.backgroundColor = getColorForSpeaker(comment.speaker, speakerColors);
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
        
        // 为主贴添加渐入动画效果
        if (comment.isMainPost) {
            setTimeout(() => {
                commentDiv.style.transform = 'translateY(-3px)';
                commentDiv.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }, 100);
            
            setTimeout(() => {
                commentDiv.style.transform = 'translateY(0)';
                commentDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
            }, 500);
        }
    });
}

// 辅助函数：为发言人获取颜色
function getColorForSpeaker(speaker, colorMap) {
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
function observeSidebarChanges() {
    const observer = new MutationObserver((mutations) => {
        createCommentCollectorButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 初始检查
    createCommentCollectorButton();
}

// 添加样式
function addCommentCollectorStyles() {
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
function startCommentsAutoScroll() {
    if (isCommentsScrolling) return;

    isCommentsScrolling = true;

    // 获取评论容器
    const scrollContainer = document.querySelector(".sidebar-content");
    if (!scrollContainer) {
        console.error("[PKU TreeHole] 无法找到评论滚动容器");
        isCommentsScrolling = false;
        return;
    }

    console.log("[PKU TreeHole] 开始自动滚动评论...");

    // 清除可能存在的上一个滚动计时器
    if (commentsScrollInterval) {
        clearInterval(commentsScrollInterval);
    }

    // 记录上次评论数量，用于检测是否还在加载新评论
    let lastCommentCount = 0;
    let stableCount = 0;

    // 设置滚动间隔
    commentsScrollInterval = setInterval(() => {
        // 如果已不再收集评论，停止滚动
        if (!isCollectingComments) {
            stopCommentsAutoScroll(false);
            return;
        }

        // 滚动到页面底部以加载更多评论
        scrollContainer.scrollBy({
            top: 3000,
            behavior: 'smooth'
        });

        // 更新评论收集状态
        updateCommentCollectorStatus("正在自动滚动加载评论...");

        // 收集当前可见的评论
        collectComments();

        // 检查是否已加载完全部评论（到达底部且评论数量不再增加）
        const currentCommentCount = collectedCommentIds.size;
        const isAtBottom = isScrolledToBottom(scrollContainer);

        if (isAtBottom) {
            // 如果评论数量与上次相同，累加稳定计数
            if (currentCommentCount === lastCommentCount) {
                stableCount++;

                // 如果连续3次检测到评论数量不变且在底部，认为已收集完成
                if (stableCount >= 3) {
                    collectComments(); // 最后再收集一次
                    updateCommentCollectorStatus("已滚动到底部，评论加载完成，停止收集");
                    stopCollectComments(); // 停止收集评论（也会停止滚动）
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
function stopCommentsAutoScroll(updateCheckbox = true) {
    if (commentsScrollInterval) {
        clearInterval(commentsScrollInterval);
        commentsScrollInterval = null;
    }
    isCommentsScrolling = false;

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
function isScrolledToBottom(element) {
    // 当滚动位置 + 可视高度 >= 总滚动高度 - 5像素（容差）时，认为已滚动到底部
    return element.scrollTop + element.clientHeight >= element.scrollHeight - 5;
}

// 更新评论收集器状态显示
function updateCommentCollectorStatus(text, isError = false) {
    const statusElement = document.getElementById('comment-collector-status');
    if (statusElement) {
        statusElement.textContent = text;
        statusElement.style.color = isError ? '#e53935' : '#333';
    }
}

// 开始收集评论
function startCollectComments() {
    if (isCollectingComments) return;

    // 重置变量
    isCollectingComments = true;
    commentCollectionStartTime = Date.now();
    collectedCommentIds.clear();
    earliestCommentTime = null;
    latestCommentTime = null; // 新增：用于记录最晚评论时间
    allCommentsData = []; // 清空所有评论数据
    speakerList.clear(); // 清空发言人列表

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
    updateCommentStats(0, 0, '-');

    // 开始收集
    updateCommentCollectorStatus('开始收集评论...');
    collectComments(true);

    // 设置计时器，定期更新用时
    commentCollectionTimer = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - commentCollectionStartTime) / 1000);
        updateCollectionTime(elapsedSeconds);
    }, 1000);

    // 如果自动滚动选项已勾选，则开始自动滚动
    const autoScrollCheckbox = document.getElementById('auto-scroll-comments');
    if (autoScrollCheckbox && autoScrollCheckbox.checked) {
        startCommentsAutoScroll();
    }
}

// 停止收集评论
function stopCollectComments() {
    if (!isCollectingComments) return;

    isCollectingComments = false;

    // 停止计时器
    if (commentCollectionTimer) {
        clearInterval(commentCollectionTimer);
        commentCollectionTimer = null;
    }

    // 停止自动滚动（但不取消复选框勾选）
    stopCommentsAutoScroll(false);

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
    updateSpeakerFilter();

    // 添加筛选下拉框的事件监听
    const speakerFilter = document.getElementById('speaker-filter');
    if (speakerFilter) {
        // 先移除可能存在的旧监听器
        speakerFilter.removeEventListener('change', filterAndDisplayComments);
        // 添加新的监听器
        speakerFilter.addEventListener('change', filterAndDisplayComments);
    }

    // 更新最终的评论数统计
    const collectedCount = allCommentsData.filter(comment => !comment.isMainPost).length;
    updateCommentStats(
        collectedCount,
        Math.floor((Date.now() - commentCollectionStartTime) / 1000),
        latestCommentTime || '未知'
    );

    updateCommentCollectorStatus(`收集完成，共 ${collectedCount} 条评论`);
}

// 更新评论统计信息
function updateCommentStats(count, timeInSeconds, latestTime) {
    const countElement = document.getElementById('comment-count');
    const timeElement = document.getElementById('collection-time');
    const latestTimeElement = document.getElementById('earliest-comment-time');
    
    // 计算进度百分比
    let progressPercentage = '';
    if (totalExpectedComments > 0) {
        const percentage = Math.round((count / totalExpectedComments) * 100);
        progressPercentage = ` (${percentage}%)`;
    }

    if (countElement) countElement.textContent = `${count}${progressPercentage}`;
    if (timeElement) timeElement.textContent = formatTime(timeInSeconds);
    if (latestTimeElement) latestTimeElement.textContent = latestTime;
}

// 更新收集用时
function updateCollectionTime(timeInSeconds) {
    const timeElement = document.getElementById('collection-time');
    if (timeElement) {
        timeElement.textContent = formatTime(timeInSeconds);
    }
}

// 格式化时间
function formatTime(seconds) {
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
function updateSpeakerFilter() {
    // 获取所有唯一的发言者
    const speakers = new Set();
    
    // 保存当前选中的值
    const speakerFilter = document.getElementById('speaker-filter');
    // 默认值设为'all'，即全部评论
    const selectedValue = speakerFilter && speakerFilter.value ? speakerFilter.value : 'all';
    
    // 清空下拉框
    if (speakerFilter) {
        speakerFilter.innerHTML = '';
        
        // 添加"全部"选项
        const allOption = document.createElement('option');
        allOption.value = 'all';
        
        // 使用非主贴评论的数量
        const nonMainPostComments = allCommentsData.filter(comment => !comment.isMainPost);
        allOption.textContent = `全部 (${nonMainPostComments.length}条)`;
        speakerFilter.appendChild(allOption);
        
        // 遍历评论获取发言者，排除主贴
        allCommentsData.forEach(comment => {
            if (!comment.isMainPost && comment.speaker && !speakers.has(comment.speaker)) {
                speakers.add(comment.speaker);
            }
        });
        
        // 为每个发言者创建一个选项
        speakers.forEach(speaker => {
            const option = document.createElement('option');
            option.value = speaker;
            
            // 计算该发言者的评论数，排除主贴
            const speakerCommentCount = allCommentsData.filter(comment => 
                !comment.isMainPost && comment.speaker === speaker).length;
            
            option.textContent = `${speaker} (${speakerCommentCount}条)`;
            speakerFilter.appendChild(option);
        });
        
        // 恢复选中的值，确保默认是'all'
        speakerFilter.value = selectedValue;
    }
}

// 筛选并显示评论
function filterAndDisplayComments() {
    // 获取筛选条件
    const speakerFilter = document.getElementById('speaker-filter');
    const selectedSpeaker = speakerFilter ? speakerFilter.value : 'all';
    
    // 查找主贴
    const mainPost = allCommentsData.find(comment => comment.isMainPost);

    // 筛选评论（不包括主贴）
    let filteredComments = allCommentsData.filter(comment => !comment.isMainPost);
    
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
        commentsContainer.innerHTML = '';  // 清空容器
        displayComments(filteredComments, commentsContainer);
        
        // 更新评论数显示 (主贴不计入评论数)
        const nonMainPostCount = filteredComments.filter(comment => !comment.isMainPost).length;
        updateCommentCollectorStatus(`已筛选 ${nonMainPostCount} 条评论`);
    }
}

// 导出为文本格式
function exportAsText() {
    // 获取当前显示的评论
    const speakerFilter = document.getElementById('speaker-filter');
    const selectedSpeaker = speakerFilter ? speakerFilter.value : 'all';
    
    // 查找主贴
    const mainPost = allCommentsData.find(comment => comment.isMainPost);

    // 筛选评论，排除主贴
    let comments = allCommentsData.filter(comment => !comment.isMainPost);
    
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
    textContent += `# 最晚评论时间：${latestCommentTime || '未知'}\n`;
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
    
    updateCommentCollectorStatus(`已导出 ${totalComments} 条评论为文本文件`);
}

// 导出为图片格式
function exportAsImage() {
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

    header.innerHTML = `
        <h2 style="margin: 0 0 10px 0;">${holeId}</h2>
        <div style="color: #666; font-size: 14px;">
            <div>导出时间：${new Date().toLocaleString()}</div>
            <div>评论数量：${allCommentsData.length} (显示: ${displaySpeaker})</div>
            <div>最晚评论时间：${latestCommentTime || '未知'}</div>
        </div>
    `;

    tempContainer.appendChild(header);

    // 复制评论内容
    const contentClone = commentsContainer.cloneNode(true);
    contentClone.style.border = 'none';
    contentClone.style.maxWidth = '100%';

    tempContainer.appendChild(contentClone);

    // 添加到文档以便截图
    document.body.appendChild(tempContainer);

    // 使用html2canvas截图
    loadHtml2Canvas()
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

            // 转换为图片URL
            const imageUrl = canvas.toDataURL('image/png');

            // 设置文件名
            const fileName = `TreeHole${holeId}_${new Date().getTime()}.png`;

            // 创建并触发下载
            const a = document.createElement('a');
            a.href = imageUrl;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();

            // 清理资源
            setTimeout(() => {
                document.body.removeChild(a);
            }, 100);

            updateCommentCollectorStatus(`已导出评论为图片`);
        })
        .catch(error => {
            console.error('导出图片失败:', error);
            alert('导出图片失败，请重试');
        });
}

// 动态加载html2canvas库
function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
        // 检查是否已加载过
        if (window.__html2canvasReady) {
            resolve(window.__html2canvasCaptureFunc);
            return;
        }

        // 注入脚本加载函数
        function injectScript(src, onError) {
            const script = document.createElement('script');
            script.src = src;
            script.onerror = onError;
            document.head.appendChild(script);
            return script;
        }

        // 创建截图函数
        const createCaptureFunction = () => {
            return (element, options) => {
                return new Promise((resolveCapture, rejectCapture) => {
                    const captureId = 'capture_' + Date.now();

                    // 监听结果
                    const captureListener = (event) => {
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

// 在页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadInitialData();
        createFloatingPanel();
        observeSidebarChanges();
        addCommentCollectorStyles();
    });
} else {
    loadInitialData();
    createFloatingPanel();
    observeSidebarChanges();
    addCommentCollectorStyles();
}

// 导出悬浮窗中的树洞数据为文本格式
function exportHolesAsText() {
    if (!holesData || holesData.length === 0) {
        updateGlobalStatus('没有可导出的数据，请先收集数据', true);
        return;
    }

    // 获取当前显示的排序方式
    const sortMethod = document.querySelector('#sort-method').value;

    // 生成文本内容
    let textContent = `# PKU树洞数据导出\n`;
    textContent += `# 导出时间：${new Date().toLocaleString()}\n`;
    textContent += `# 帖子数量：${holesData.length}\n`;
    textContent += `# 排序方式：${getSortMethodName(sortMethod)}\n`;

    // 获取最早和最新的帖子时间
    const timeData = holesData.map(hole => {
        const parts = hole.publishTime.split(' ');
        return parts.length > 1 ? parts[1] + ' ' + parts[0] : hole.publishTime;
    }).sort();

    if (timeData.length > 0) {
        textContent += `# 时间范围：${timeData[0]} 至 ${timeData[timeData.length - 1]}\n`;
    }

    textContent += `\n-------------------------------\n\n`;

    // 根据当前排序方式排序
    let sortedHoles = [...holesData];
    switch (sortMethod) {
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
    }

    // 添加每个树洞的数据
    sortedHoles.forEach((hole, index) => {
        textContent += `[${index + 1}] ID: #${hole.id} | 收藏数: ${hole.likeCount} | 评论数: ${hole.replyCount} | 发布时间: ${hole.publishTime}\n\n`;
        textContent += `${hole.content || '无内容'}\n\n`;
        textContent += `-------------------------------\n\n`;
    });

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

    updateGlobalStatus(`已导出 ${sortedHoles.length} 条帖子数据为文本文件`);
}

// 导出悬浮窗中的树洞数据为图片格式
function exportHolesAsImage() {
    if (!holesData || holesData.length === 0) {
        updateGlobalStatus('没有可导出的数据，请先收集数据', true);
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
            <p style="color: #666; margin: 5px 0;">帖子数量：${holesData.length}</p>
            <p style="color: #666; margin: 5px 0;">排序方式：${getSortMethodName(sortMethod)}</p>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 10px 0;"></div>
    `;

    // 根据当前排序方式排序
    let sortedHoles = [...holesData];
    switch (sortMethod) {
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
    }

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
    loadHtml2Canvas()
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

            // 将canvas转换为图片并下载
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `PKU_TreeHole_导出_${new Date().getTime()}.png`;
            link.click();

            updateGlobalStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}`);
        })
        .catch(error => {
            // 确保在出错时也移除临时容器
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            console.error('导出图片失败:', error);
            updateGlobalStatus('导出图片失败，请重试', true);
        });
}

// 获取排序方式的中文名称
function getSortMethodName(method) {
    switch (method) {
        case 'like': return '按收藏数排序';
        case 'reply': return '按评论数排序';
        case 'time': return '按发布时间排序';
        default: return '未知排序方式';
    }
}

// 在文件末尾添加主贴相关函数
// 新增：专门处理第一条帖子（树洞主贴）的函数
function extractMainPostData(postElement) {
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
