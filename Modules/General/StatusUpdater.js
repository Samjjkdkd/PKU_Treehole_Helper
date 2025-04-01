class StatusUpdater{
    constructor(){
        this.statusTextElement = null;
    }

    // 初始化状态文本元素的引用
    initStatusElement () {
        // 首先尝试从特定ID获取元素
        this.statusTextElement = document.getElementById('status-text');
        
        // 如果找不到，尝试从面板获取
        if (!this.statusTextElement) {
            const panel = document.getElementById('pku-treehole-panel');
            if (panel) {
                this.statusTextElement = panel.querySelector('#status-text');
            }
        }
        
        return this.statusTextElement;
    }    
    
    // 确保状态文本元素存在的函数
    ensureStatusElement() {
        
        // 如果已经有引用，直接返回
        if (this.statusTextElement) {
            return this.statusTextElement;
        }
        
        // 尝试从DOM获取状态元素
        return this.initStatusElement();
    } 

    // 全局状态更新函数
    updatePostStatus(text, isError = false) {
        
        // 确保状态元素已找到
        const statusElement = this.ensureStatusElement();
        
        if (statusElement) {
            statusElement.style.display = 'block';
            statusElement.style.background = isError ? '#ffebee' : '#e8f5e9';
            statusElement.textContent = text;
        }
    }

    // 更新评论收集器状态显示
    updateCommentStatus(text, isError = false) {
        const statusElement = document.getElementById('comment-collector-status');
        if (statusElement) {
            statusElement.textContent = text;
            statusElement.style.color = isError ? '#e53935' : '#333';
        }
    }
}

// 导出StatusUpdater类，以便在其他文件中引用
export default StatusUpdater; 