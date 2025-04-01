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

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.postUI.createFloatingPanel();
                this.commentUI.observeSidebarChanges();
            });
        } else {
            this.postUI.createFloatingPanel();
            this.commentUI.observeSidebarChanges();
        }
    }
}

export default PageInitializer;
