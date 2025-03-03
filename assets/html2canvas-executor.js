// 监听来自内容脚本的消息
window.addEventListener('message', function(event) {
    // 确保消息来自同一窗口并且是捕获请求
    if (event.source !== window || !event.data || event.data.type !== 'HTML2CANVAS_CAPTURE_REQUEST') return;
    
    const { captureId, selector, options } = event.data;
    const element = document.querySelector(selector);
    
    // 错误处理
    if (!element) {
        sendResult(captureId, null, '找不到要捕获的元素');
        return;
    }
    
    if (typeof html2canvas !== 'function') {
        sendResult(captureId, null, 'html2canvas不是一个函数');
        return;
    }
    
    // 执行截图
    try {
        html2canvas(element, options)
            .then(canvas => sendResult(captureId, canvas.toDataURL()))
            .catch(error => sendResult(captureId, null, error.message || 'html2canvas捕获失败'));
    } catch (error) {
        sendResult(captureId, null, error.message || '执行html2canvas时出错');
    }
});

// 发送结果的辅助函数
function sendResult(captureId, dataUrl, error) {
    window.postMessage({
        type: 'HTML2CANVAS_RESULT',
        captureId: captureId,
        dataUrl: dataUrl,
        error: error
    }, '*');
}

// 通知内容脚本此执行器已加载
window.postMessage({ type: 'HTML2CANVAS_EXECUTOR_LOADED' }, '*'); 