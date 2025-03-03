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
let allCommentsData = []; // 存储所有收集到的评论数据
let speakerList = new Set(); // 存储所有发言人列表

// 评论自动滚动相关变量
let commentsScrollInterval = null;
let isCommentsScrolling = false;

// 评论收集相关变量
let isCollectingComments = false;
let commentCollectionStartTime = 0;
let commentCollectionTimer = null;
let collectedCommentIds = new Set();
let earliestCommentTime = null;

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
                scrollContainer.scrollTo({top: 0, behavior: 'smooth'});
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
    console.log("[PKU TreeHole] 开始收集数据，时间限制:", options.timeLimit/1000, "秒，数量限制:", options.postsLimit);
    
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
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("[PKU TreeHole] 收到消息:", request.action);
    
    switch (request.action) {
        case "startCollection":
            try {
                const currentCount = startCollection({
                    timeLimit: request.timeLimit,
                    postsLimit: request.postsLimit
                });
                sendResponse({success: true, currentCount: currentCount});
            } catch (error) {
                console.error("[PKU TreeHole] 启动收集出错:", error);
                sendResponse({success: false, error: error.message});
            }
            break;
            
        case "stopCollection":
            stopCollection();
            sendResponse({success: true});
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
            sendResponse({success: true});
            break;
    }
    return true;
});

// 在文件开头添加面板创建代码
function createFloatingPanel() {
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
                    <button id="clear-time" class="small-btn">清除</button>
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
                <button id="start-btn">开始收集数据</button>
                <button id="stop-btn">停止收集</button>
                <button id="clear-btn">清空数据</button>
            </div>
            <div class="status" id="status-text"></div>
            <div id="holes-container">
                <div class="loading">正在收集数据...</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // 添加事件监听器
    const startBtn = panel.querySelector('#start-btn');
    const stopBtn = panel.querySelector('#stop-btn');
    const clearBtn = panel.querySelector('#clear-btn');
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
        statusText.style.display = 'block';
        statusText.style.background = isError ? '#ffebee' : '#e8f5e9';
        statusText.textContent = text;
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
            holeDiv.className = 'hole-item';
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
    });

    startBtn.addEventListener('click', function() {
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

    stopBtn.addEventListener('click', function() {
        stopCollection();
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        loadingDiv.style.display = 'none';
        
        // 获取最后一条帖子的发布时间
        const lastTime = holesData.length > 0 ? holesData[holesData.length - 1].publishTime : '';
        updateStatus(`收集完成，共 ${holesData.length} 条数据${lastTime ? '，最后帖子发布于 ' + lastTime : ''}`);
        displayHoles(holesData);
    });

    clearBtn.addEventListener('click', function() {
        clearHolesData();
        displayHoles([]);
        updateStatus("数据已清空");
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
    button.className = 'comment-collector-btn no-underline mr10';
    button.innerHTML = `<img src="${chrome.runtime.getURL('icon/icon48.png')}" alt="收集评论" style="width: 20px; height: 20px; vertical-align: middle;">`;
    button.style.cursor = 'pointer';
    button.title = '收集树洞评论';
    
    // 将按钮添加到标题栏
    const titleActions = sidebarTitle.querySelector('div');
    if (titleActions) {
        titleActions.appendChild(button);
    }
    
    // 添加点击事件
    button.addEventListener('click', function() {
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
    
    dialog.innerHTML = `
        <div id="comment-dialog-header" style="display: flex; justify-content: space-between; align-items: center; background-color: #f5f5f5; padding: 10px 15px; border-radius: 8px 8px 0 0; cursor: move; user-select: none; flex-shrink: 0;">
            <h3 style="margin: 0; font-size: 16px; color: #333;">收集树洞评论</h3>
            <button id="close-comment-dialog" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #666;">&times;</button>
        </div>
        <div id="comment-dialog-content" style="padding: 15px; flex-grow: 1; overflow-y: auto;">
            <div id="comment-collector-controls" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <button id="toggle-collect-comments" class="action-button" style="background-color: #1a73e8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 14px; min-width: 100px;">开始收集</button>
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
                        <span>最早评论时间：</span>
                        <span id="earliest-comment-time">-</span>
                    </div>
                </div>
                
                <div id="comment-filter" style="display: none; margin-top: 10px;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <label for="speaker-filter" style="margin-right: 8px; font-size: 13px;">只看：</label>
                        <select id="speaker-filter" style="flex-grow: 1; padding: 5px; border-radius: 4px; border: 1px solid #ddd; font-size: 13px;">
                            <option value="">全部评论</option>
                        </select>
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
    document.getElementById('close-comment-dialog').addEventListener('click', function() {
        // 停止自动滚动
        stopCommentsAutoScroll(false);
        // 停止收集评论（如果正在进行）
        stopCollectComments();
        // 只隐藏对话框，不改变其布局属性
        dialog.style.display = 'none';
    });
    
    // 添加收集评论按钮事件
    document.getElementById('toggle-collect-comments').addEventListener('click', function() {
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
    autoScrollCheckbox.addEventListener('change', function() {
        // 改为仅设置状态，不触发滚动
        console.log("[PKU TreeHole] 自动滚动设置: " + (this.checked ? "开启" : "关闭"));
    });
    
    // 添加筛选下拉框事件（初始状态下隐藏）
    const speakerFilter = document.getElementById('speaker-filter');
    if (speakerFilter) {
        speakerFilter.addEventListener('change', filterAndDisplayComments);
    }
    
    // 添加拖拽功能
    const dialogHeader = document.getElementById('comment-dialog-header');
    let isDragging = false;
    let offsetX, offsetY;
    
    dialogHeader.addEventListener('mousedown', function(e) {
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
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        // 计算新位置
        const newLeft = e.clientX - offsetX;
        const newTop = e.clientY - offsetY;
        
        // 应用新位置
        dialog.style.left = newLeft + 'px';
        dialog.style.top = newTop + 'px';
    });
    
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            dialogHeader.style.cursor = 'move';
        }
    });
    
    // 添加调整大小功能
    const resizeHandle = document.getElementById('resize-handle');
    let isResizing = false;
    let originalWidth, originalHeight, originalX, originalY;
    
    resizeHandle.addEventListener('mousedown', function(e) {
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
    
    document.addEventListener('mousemove', function(e) {
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
    
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
        }
    });
}

// 收集评论
function collectComments() {
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
    
    commentElements.forEach(element => {
        // 提取评论ID
        const idElement = element.querySelector(".box-id");
        if (!idElement) return;
        
        const commentId = idElement.textContent.trim();
        
        // 跳过已处理的评论
        if (processedIds.has(commentId)) return;
        processedIds.add(commentId);
        
        // 提取评论数据
        const commentData = extractCommentData(element);
        if (commentData) {
            comments.push(commentData);
        }
    });
    
    // 显示收集到的评论
    const dialogCommentsContainer = document.getElementById("comments-container");
    if (dialogCommentsContainer) {
        // 清空之前的内容
        if (!isCommentsScrolling) {
            dialogCommentsContainer.innerHTML = "";
        }
        
        // 显示评论
        displayComments(comments, dialogCommentsContainer);
        
        // 更新状态
        updateCommentCollectorStatus(`已收集 ${processedIds.size} 条评论`);
    }
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
        
        return {
            id,
            speaker,
            content,
            quote,
            publishTime
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
        commentDiv.style.padding = '10px';
        commentDiv.style.borderBottom = '1px solid #eee';
        commentDiv.style.marginBottom = '8px';
        commentDiv.style.borderRadius = '4px';
        commentDiv.style.backgroundColor = getColorForSpeaker(comment.speaker, speakerColors);
        
        let html = `
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
        
        commentDiv.innerHTML = html;
        container.appendChild(commentDiv);
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
            top: 500,
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
    
    updateCommentCollectorStatus(`收集完成，共 ${collectedCommentIds.size} 条评论`);
}

// 收集评论
function collectComments(isInitialCollection = false) {
    if (!isCollectingComments && !isInitialCollection) return;
    
    // 获取评论容器
    const commentsContainer = document.querySelector(".sidebar-content");
    if (!commentsContainer) {
        updateCommentCollectorStatus("无法找到评论容器", true);
        stopCollectComments();
        return;
    }
    
    // 获取所有评论元素
    const commentElements = commentsContainer.querySelectorAll(".box:not(.box-tip):not(.box33)");
    if (!commentElements || commentElements.length === 0) {
        updateCommentCollectorStatus("未找到评论", true);
        if (isInitialCollection) {
            stopCollectComments();
        }
        return;
    }
    
    // 收集评论数据
    const newComments = [];
    let newCommentsCount = 0;
    
    commentElements.forEach(element => {
        // 提取评论ID
        const idElement = element.querySelector(".box-id");
        if (!idElement) return;
        
        const commentId = idElement.textContent.trim();
        
        // 跳过已处理的评论
        if (collectedCommentIds.has(commentId)) return;
        
        // 获取发布时间
        const headerElement = element.querySelector(".box-header");
        let publishTime = null;
        if (headerElement) {
            const timeText = headerElement.textContent.match(/(\d{2}-\d{2} \d{2}:\d{2})/);
            if (timeText && timeText[1]) {
                publishTime = timeText[1];
                
                // 更新最早评论时间
                if (!earliestCommentTime || publishTime < earliestCommentTime) {
                    earliestCommentTime = publishTime;
                }
            }
        }
        
        // 提取评论数据
        const commentData = extractCommentData(element);
        if (commentData) {
            // 添加评论ID和发布时间
            commentData.id = commentId;
            commentData.publishTime = publishTime;
            
            // 添加到新评论列表
            newComments.push(commentData);
            collectedCommentIds.add(commentId);
            newCommentsCount++;
            
            // 将发言人添加到列表中
            if (commentData.speaker) {
                speakerList.add(commentData.speaker);
            }
            
            // 添加到全部评论数据中
            allCommentsData.push(commentData);
        }
    });
    
    // 显示收集到的评论
    if (newCommentsCount > 0) {
        const dialogCommentsContainer = document.getElementById("comments-container");
        if (dialogCommentsContainer) {
            // 清空现有评论并显示全部
            dialogCommentsContainer.innerHTML = '';
            displayComments(allCommentsData, dialogCommentsContainer);
            
            // 更新统计信息
            updateCommentStats(
                collectedCommentIds.size,
                Math.floor((Date.now() - commentCollectionStartTime) / 1000),
                earliestCommentTime || '-'
            );
            
            // 更新状态
            updateCommentCollectorStatus(`已收集 ${collectedCommentIds.size} 条评论`);
        }
    }
}

// 更新评论统计信息
function updateCommentStats(count, timeInSeconds, earliestTime) {
    const countElement = document.getElementById('comment-count');
    const timeElement = document.getElementById('collection-time');
    const earliestTimeElement = document.getElementById('earliest-comment-time');
    
    if (countElement) countElement.textContent = count;
    if (timeElement) timeElement.textContent = formatTime(timeInSeconds);
    if (earliestTimeElement) earliestTimeElement.textContent = earliestTime;
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
    const speakerFilter = document.getElementById('speaker-filter');
    if (!speakerFilter) return;
    
    // 保存当前选择
    const currentSelection = speakerFilter.value;
    
    // 清空现有选项，只保留"全部评论"
    while (speakerFilter.options.length > 1) {
        speakerFilter.remove(1);
    }
    
    // 添加所有发言人作为选项
    speakerList.forEach(speaker => {
        const option = document.createElement('option');
        option.value = speaker;
        option.textContent = speaker;
        speakerFilter.appendChild(option);
    });
    
    // 恢复之前的选择（如果存在于新列表中）
    if (currentSelection && speakerList.has(currentSelection)) {
        speakerFilter.value = currentSelection;
    }
}

// 筛选并显示评论
function filterAndDisplayComments() {
    const speakerFilter = document.getElementById('speaker-filter');
    const selectedSpeaker = speakerFilter ? speakerFilter.value : '';
    const commentsContainer = document.getElementById('comments-container');
    
    if (!commentsContainer) return;
    
    // 筛选评论
    let filteredComments = allCommentsData;
    if (selectedSpeaker) {
        filteredComments = allCommentsData.filter(comment => comment.speaker === selectedSpeaker);
    }
    
    // 显示筛选后的评论
    commentsContainer.innerHTML = ''; // 清空容器
    
    if (filteredComments.length === 0) {
        commentsContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">没有找到符合条件的评论</div>';
        return;
    }
    
    displayComments(filteredComments, commentsContainer);
    
    // 更新状态信息
    if (selectedSpeaker) {
        updateCommentCollectorStatus(`显示 ${selectedSpeaker} 的 ${filteredComments.length} 条评论（共收集 ${allCommentsData.length} 条）`);
    } else {
        updateCommentCollectorStatus(`显示全部 ${allCommentsData.length} 条评论`);
    }
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
