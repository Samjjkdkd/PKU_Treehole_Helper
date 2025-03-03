// 存储帖子数据
let holesData = [];
let isCollecting = false;
let timeLimit = null;
let postsLimit = null;
let startTime = null;
let checkInterval = null;
let scrollInterval = null;
let isScrolling = false;

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
        scrollContainer.scrollBy(0, 10000);
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
    
    holes.forEach(hole => {
        if (hole.dataset.processed) return;
        
        const likeNum = hole.querySelector('.box-header-badge.likenum');
        const idElement = hole.querySelector('.box-id');
        const contentElement = hole.querySelector('.box-content');
        
        if (likeNum && idElement && contentElement) {
            const count = parseInt(likeNum.textContent.trim());
            const id = idElement.textContent.trim().replace('#', '').trim();
            const content = contentElement.textContent.trim();
            
            // 存储数据
            const holeData = {
                id: id,
                content: content,
                likeCount: count
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
        
        if (timeExpired || reachedLimit) {
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
    
    // 开始自动滚动
    autoScroll();
    
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
        <div class="tab">收藏统计</div>
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
        const sortedHoles = holes.sort((a, b) => b.likeCount - a.likeCount);
        
        sortedHoles.forEach(hole => {
            const holeDiv = document.createElement('div');
            holeDiv.className = 'hole-item';
            holeDiv.innerHTML = `
                <div>
                    <span class="hole-id">#${hole.id}</span>
                    <span class="like-count">收藏数：${hole.likeCount}</span>
                </div>
                <div class="content">${hole.content}</div>
            `;
            holesContainer.appendChild(holeDiv);
        });
    }

    startBtn.addEventListener('click', function() {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        loadingDiv.style.display = 'block';
        
        const timeLimit = parseInt(timeLimitInput.value);
        const postsLimit = parseInt(postsLimitInput.value);
        
        try {
            const currentCount = startCollection({
                timeLimit: timeLimit * 60 * 1000,
                postsLimit: postsLimit
            });
            updateStatus(`开始收集数据，当前已有 ${currentCount || 0} 条数据`);
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
        updateStatus(`收集完成，共 ${holesData.length} 条数据`);
        displayHoles(holesData);
    });

    clearBtn.addEventListener('click', function() {
        clearHolesData();
        displayHoles([]);
        updateStatus("数据已清空");
    });

    // 定期更新显示
    setInterval(() => {
        if (isCollecting) {
            displayHoles(holesData);
            updateStatus(`已收集 ${holesData.length} 条数据`);
        }
    }, 1000);
}

// 在原有代码后面添加初始化调用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadInitialData();
        createFloatingPanel();
    });
} else {
    loadInitialData();
    createFloatingPanel();
} 
