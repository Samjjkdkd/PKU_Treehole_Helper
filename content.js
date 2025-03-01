// 存储帖子数据
let holesData = [];
let isCollecting = false;
let timeLimit = null;
let postsLimit = null;
let startTime = null;
let checkInterval = null;

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

// 页面加载完成后处理当前可见的帖子
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadInitialData);
} else {
    loadInitialData();
} 
