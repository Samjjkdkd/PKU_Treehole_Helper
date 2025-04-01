class PageInitializer {
    constructor(postUI, commentUI, postCollector){
        this.postUI = postUI;
        this.commentUI = commentUI;
        this.postCollector = postCollector;
        this.mutationObserver = null;
    }

    // 初始化页面监视器
    initPageObserver() {
        // 监听整个页面的变化
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
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
                this.postCollector.processHoles();
            }
        });

        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

            switch (request.action) {
                case "startCollection":
                    try {
                        const currentCount = this.postCollector.startCollection({
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
                    this.postCollector.stopCollection(true, '从弹出窗口停止');
                    sendResponse({ success: true });
                    break;

                case "getholesData":
                    sendResponse({
                        holes: this.dataManager.holesData,
                        isFinished: !this.postCollector.isCollecting,
                        count: this.dataManager.holesData.length
                    });
                    break;
            }
            return true;
        });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.postCollector.loadInitialData();
                this.postUI.createFloatingPanel();
                this.commentUI.observeSidebarChanges();
            });
        } else {
            this.postCollector.loadInitialData();
            this.postUI.createFloatingPanel();
            this.commentUI.observeSidebarChanges();
        }
    }
}

export default PageInitializer;
