document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const holesContainer = document.getElementById('holes-container');
    const loadingDiv = document.querySelector('.loading');
    const statusText = document.getElementById('status-text');
    const timeLimitInput = document.getElementById('time-limit');
    const postsLimitInput = document.getElementById('posts-limit');

    let collectionInterval = null;

    function updateStatus(text, isError = false) {
        statusText.style.display = 'block';
        statusText.style.background = isError ? '#ffebee' : '#e8f5e9';
        statusText.textContent = text;
    }

    function displayHoles(holes) {
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

    async function startCollection() {
        const timeLimit = parseInt(timeLimitInput.value);
        const postsLimit = parseInt(postsLimitInput.value);

        // 获取当前标签页
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        const activeTab = tabs[0];

        if (!activeTab.url.includes('treehole.pku.edu.cn')) {
            updateStatus('请在树洞页面使用此插件', true);
            return;
        }

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        loadingDiv.style.display = 'block';
        
        const startTime = Date.now();
        
        // 发送开始收集消息
        chrome.tabs.sendMessage(activeTab.id, {
            action: "startCollection",
            timeLimit: timeLimit * 60 * 1000,
            postsLimit: postsLimit
        });

        // 定期获取数据
        collectionInterval = setInterval(async () => {
            const elapsedTime = (Date.now() - startTime) / 1000;
            
            chrome.tabs.sendMessage(activeTab.id, {action: "getHolesData"}, function(response) {
                if (response && response.holes) {
                    displayHoles(response.holes);
                    updateStatus(`已收集 ${response.holes.length} 条数据，用时 ${elapsedTime.toFixed(1)} 秒`);
                }
                
                if (response && response.isFinished) {
                    stopCollection();
                }
            });
        }, 1000);
    }

    function stopCollection() {
        if (collectionInterval) {
            clearInterval(collectionInterval);
            collectionInterval = null;
        }
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "stopCollection"});
        });

        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        loadingDiv.style.display = 'none';
    }

    startBtn.addEventListener('click', startCollection);
    stopBtn.addEventListener('click', stopCollection);
}); 