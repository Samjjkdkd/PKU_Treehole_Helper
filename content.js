// 监听页面滚动
let isLoading = false;
let observer = null;

// 存储帖子数据
let holesData = [];
let isCollecting = false;
let autoScrollInterval = null;
let timeLimit = null;
let postsLimit = null;
let startTime = null;

// 创建一个 Intersection Observer 来检测最后一个帖子
function createObserver() {
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading) {
                // 触发加载更多
                const loadMoreButton = document.querySelector('.load-more-button');
                if (loadMoreButton) {
                    loadMoreButton.click();
                }
            }
        });
    }, {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
    });
}

// 自动滚动函数
function autoScroll() {
    window.scrollBy(0, 300);
    processHoles();

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

// 处理帖子数据
function processHoles() {
    const holes = document.querySelectorAll('.flow-item-row');
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
            } else {
                holesData[existingIndex] = holeData;
            }
        }
        
        hole.dataset.processed = 'true';
    });
    
    // 观察最后一个帖子
    const lastHole = holes[holes.length - 1];
    if (lastHole && observer) {
        observer.observe(lastHole);
    }
}

// 创建 MutationObserver 来监听 DOM 变化
const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            processHoles();
        }
    });
});

// 初始化
function init() {
    createObserver();
    processHoles();
    
    // 监听整个页面的变化
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// 开始收集数据
function startCollection(options) {
    holesData = [];
    isCollecting = true;
    timeLimit = options.timeLimit;
    postsLimit = options.postsLimit;
    startTime = Date.now();
    
    // 开始自动滚动
    if (!autoScrollInterval) {
        autoScrollInterval = setInterval(autoScroll, 1000);
    }
    
    // 初始处理
    processHoles();
}

// 停止收集数据
function stopCollection() {
    isCollecting = false;
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.action) {
        case "startCollection":
            startCollection({
                timeLimit: request.timeLimit,
                postsLimit: request.postsLimit
            });
            sendResponse({success: true});
            break;
            
        case "stopCollection":
            stopCollection();
            sendResponse({success: true});
            break;
            
        case "getHolesData":
            sendResponse({
                holes: holesData,
                isFinished: !isCollecting
            });
            break;
    }
    return true;
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processHoles);
} else {
    processHoles();
} 