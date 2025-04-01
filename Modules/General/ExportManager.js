class ExportManager {
    constructor(dataManager, statusUpdater, postUI, commentCollector) {
        this.dataManager = dataManager;
        this.statusUpdater = statusUpdater;
        this.postUI = postUI;
        this.commentCollector = commentCollector;
    }

    // 获取排序方式的中文名称
    getSortMethodName(method) {
        switch (method) {
            case 'like': return '按收藏数排序';
            case 'reply': return '按评论数排序';
            case 'time': return '按发布时间排序';
                case 'comprehensive': return '按综合关注程度排序';
            default: return '未知排序方式';
        }
    }

    // 导出为文本格式
    exportAsText() {
        // 获取当前显示的评论
        const speakerFilter = document.getElementById('speaker-filter');
        const selectedSpeaker = speakerFilter ? speakerFilter.value : 'all';

        // 查找主贴
        const mainPost = this.dataManager.allCommentsData.find(comment => comment.isMainPost);

        // 筛选评论，排除主贴
        let comments = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost);

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
            textContent += `# 最晚评论时间：${this.commentCollector.latestCommentTime || '未知'}\n`;
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

        // 获取导出设置并执行导出
        this.dataManager.getExportSettings().then(exportMode => {
        let saveToLocal = exportMode === 'save' || exportMode === 'both';
        let copyToClipboard = exportMode === 'copy' || exportMode === 'both';
        
        // 根据设置保存到本地
        if (saveToLocal) {
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
        }
        
        // 根据设置复制到剪贴板
        if (copyToClipboard) {
            try {
                navigator.clipboard.writeText(textContent).then(() => {
                    if (saveToLocal) {
                            this.statusUpdater.updateCommentStatus(`已导出 ${totalComments} 条评论为文本文件，并已复制到剪贴板`);
                    } else {
                            this.statusUpdater.updateCommentStatus(`已复制 ${totalComments} 条评论到剪贴板`);
                    }
                }).catch(err => {
                    console.error('无法复制到剪贴板: ', err);
                    if (saveToLocal) {
                            this.statusUpdater.updateCommentStatus(`已导出 ${totalComments} 条评论为文本文件（复制到剪贴板失败）`);
                    } else {
                            this.statusUpdater.updateCommentStatus(`复制到剪贴板失败`);
                    }
                });
            } catch (err) {
                console.error('不支持clipboard API: ', err);
                if (saveToLocal) {
                        this.statusUpdater.updateCommentStatus(`已导出 ${totalComments} 条评论为文本文件`);
                } else {
                        this.statusUpdater.updateCommentStatus(`复制到剪贴板失败（不支持clipboard API）`);
                }
            }
        } else {
                this.statusUpdater.updateCommentStatus(`已导出 ${totalComments} 条评论为文本文件`);
        }
    });
    }

    // 导出为图片格式
    exportAsImage() {
        this.statusUpdater.updateCommentStatus(`导出评论数据为图片...`);
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

        // 获取当前筛选后的评论数量
        const filteredComments = document.querySelectorAll('#comments-container .collected-comment');
        const totalFilteredComments = filteredComments.length;
            
        // 计算实际评论数量（不包括主贴）
        const actualCommentCount = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost).length;

        // 设置最大显示条数限制
        const MAX_COMMENTS_TO_DISPLAY = 101;
        const displayCount = Math.min(totalFilteredComments, MAX_COMMENTS_TO_DISPLAY);

        //<h2 style="margin: 0 0 10px 0;">${holeId}</h2>
        header.innerHTML = `
            <div style="color: #666; font-size: 14px;">
                <div>导出时间：${new Date().toLocaleString()}</div>
                    <div>评论数量：${actualCommentCount} (显示: ${displaySpeaker})</div>
                    <div>最晚评论时间：${this.commentCollector.latestCommentTime || '未知'}</div>
            </div>
        `;

        tempContainer.appendChild(header);

        // 复制评论内容（仅复制有限数量的评论）
        const contentClone = document.createElement('div');
        contentClone.style.border = 'none';
        contentClone.style.maxWidth = '100%';

        // 特殊处理第一条评论（主贴）
        if (filteredComments.length > 0 && this.dataManager.allCommentsData.length > 0) {
            // 找到主贴数据
            const mainPost = this.dataManager.allCommentsData.find(comment => comment.isMainPost);
            
            if (mainPost && filteredComments[0]) {
                // 创建主贴元素，使用与CommentUI.js相同的格式
                const mainPostElement = document.createElement('div');
                mainPostElement.className = 'collected-comment main-post';
                mainPostElement.style.padding = '15px';
                mainPostElement.style.marginBottom = '15px';
                mainPostElement.style.border = '1px solid #e0e0e0';
                mainPostElement.style.borderRadius = '8px';
                mainPostElement.style.backgroundColor = '#f9f9f9';
                
                // 使用与CommentUI.js相同的HTML结构
                mainPostElement.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center;">
                            <span style="font-size: 18px; font-weight: bold; color: #1a1a1a;">#${mainPost.id}</span>
                            <span style="margin-left: 8px; padding: 2px 6px; background-color:rgb(139, 139, 139); color: white; border-radius: 4px; font-size: 12px;">树洞主贴</span>
                        </div>
                        <span style="color: #666; font-size: 13px;">${mainPost.publishTime}</span>
                    </div>
                    
                    <div style="font-size: 16px; line-height: 1.6; margin-bottom: 18px; color: #333; font-weight: 500;">${mainPost.content}</div>
                    
                    <div style="display: flex; gap: 20px; margin-top: 10px;">
                        <div style="display: flex; align-items: center;">
                            <div style="color: #ff9800; margin-right: 5px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                </svg>
                            </div>
                            <span style="font-weight: 500; color: #555;">${mainPost.stars || 0} 收藏</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <div style="color: #2196f3; margin-right: 5px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;">
                                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                </svg>
                            </div>
                            <span style="font-weight: 500; color: #555;">${mainPost.comments || 0} 评论</span>
                        </div>
                    </div>
                `;
                
                // 添加图片显示（如果存在）
                if (mainPost.images && mainPost.images.length > 0) {
                    const imagesDiv = document.createElement('div');
                    imagesDiv.style.marginTop = '15px';
                    
                    mainPost.images.forEach(imgSrc => {
                        const img = document.createElement('img');
                        img.src = imgSrc;
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '400px';
                        img.style.objectFit = 'contain';
                        img.style.margin = '10px 0';
                        img.style.borderRadius = '6px';
                        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                        imagesDiv.appendChild(img);
                    });
                    
                    mainPostElement.appendChild(imagesDiv);
                }
                
                contentClone.appendChild(mainPostElement);
                
                // 只复制其余评论（从索引1开始）
                for (let i = 1; i < displayCount; i++) {
                    if (i < filteredComments.length) {
                        contentClone.appendChild(filteredComments[i].cloneNode(true));
                    }
                }
            } else {
                // 如果找不到主贴或第一条不是主贴，按原来方式处理
                for (let i = 0; i < displayCount; i++) {
                    if (i < filteredComments.length) {
                        contentClone.appendChild(filteredComments[i].cloneNode(true));
                    }
                }
            }
        } else {
            // 按原来方式处理
            for (let i = 0; i < displayCount; i++) {
                if (i < filteredComments.length) {
                    contentClone.appendChild(filteredComments[i].cloneNode(true));
                }
            }
        }

        // 如果有更多评论但没有显示，添加提示信息
        if (totalFilteredComments > MAX_COMMENTS_TO_DISPLAY) {
            const moreInfo = document.createElement('div');
            moreInfo.style.textAlign = 'center';
            moreInfo.style.color = '#666';
            moreInfo.style.padding = '15px';
            moreInfo.style.marginTop = '10px';
            moreInfo.style.borderTop = '1px dashed #ddd';
                moreInfo.textContent = `注：图片中仅显示前${MAX_COMMENTS_TO_DISPLAY - 1}条评论，共有 ${actualCommentCount} 条评论。请使用文本导出获取完整数据。`;
            contentClone.appendChild(moreInfo);
        }

        tempContainer.appendChild(contentClone);

        // 添加到文档以便截图
        document.body.appendChild(tempContainer);

        // 使用html2canvas截图
        this.loadHtml2Canvas()
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

            // 获取导出设置并执行导出
                this.dataManager.getExportSettings().then(exportMode => {
                let saveToLocal = exportMode === 'save' || exportMode === 'both';
                let copyToClipboard = exportMode === 'copy' || exportMode === 'both';
                
                // 将canvas转换为图片数据
                const imgData = canvas.toDataURL('image/png');
                
                // 根据设置保存到本地
                if (saveToLocal) {
                    // 设置文件名
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = `PKU_TreeHole_导出_${new Date().getTime()}.png`;
                    link.click();
                }
                
                // 根据设置复制到剪贴板
                if (copyToClipboard) {
                    try {
                        // 在某些浏览器中，可以直接从canvas获取剪贴板项
                        canvas.toBlob(blob => {
                            try {
                                const item = new ClipboardItem({ 'image/png': blob });
                                navigator.clipboard.write([item]).then(() => {
                                    if (saveToLocal) {
                                            this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}，并已复制到剪贴板`);
                                        } else if (exportMode === 'copy') {
                                            this.statusUpdater.updateCommentStatus(`已复制 ${displayCount - 1} 条评论数据为图片${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}到剪贴板`);
                                    } else {
                                            this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}（复制到剪贴板失败）`);
                                    }
                                }).catch(err => {
                                    console.error('无法复制图片到剪贴板: ', err);
                                    if (saveToLocal) {
                                            this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}（复制到剪贴板失败）`);
                                    } else {
                                            this.statusUpdater.updateCommentStatus(`复制评论数据图片到剪贴板失败`);
                                    }
                                });
                            } catch (err) {
                                console.error('ClipboardItem不受支持: ', err);
                                if (saveToLocal) {
                                        this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}`);
                                } else {
                                        this.statusUpdater.updateCommentStatus(`复制到剪贴板失败（ClipboardItem不受支持）`);
                                }
                            }
                        });
                    } catch (err) {
                        console.error('无法使用剪贴板功能: ', err);
                        if (saveToLocal) {
                                this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}`);
                        } else {
                                this.statusUpdater.updateCommentStatus(`复制到剪贴板失败（无法使用剪贴板功能）`);
                        }
                    }
                } else {
                        this.statusUpdater.updateCommentStatus(`已导出 ${displayCount - 1} 条评论数据为图片文件${displayCount > MAX_COMMENTS_TO_DISPLAY ? `（仅展示前${MAX_COMMENTS_TO_DISPLAY - 1}条，共${actualCommentCount}条）` : ''}`);
                }
            });
        })
        .catch(error => {
            console.error('导出图片失败:', error);
            alert('导出图片失败，请重试');
        });
    }

    // 动态加载html2canvas库
    loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            // 检查是否已加载过
            if (window.__html2canvasReady) {
                resolve(window.__html2canvasCaptureFunc);
                return;
            }

            // 注入脚本加载函数
            const injectScript = (src, onError) => {
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

    // 导出悬浮窗中的树洞数据为文本格式
    exportHolesAsText() {
        if (!this.dataManager.holesData || this.dataManager.holesData.length === 0) {
            this.statusUpdater.updatePostStatus('没有可导出的数据，请先收集数据', true);
            return;
        }

        // 获取当前显示的排序方式
        const sortMethod = document.querySelector('#sort-method').value;

        // 生成文本内容
        let textContent = ``;
        //textContent += `# PKU树洞数据导出\n`;
        textContent += `# 导出时间：${new Date().toLocaleString()}\n`;
        textContent += `# 帖子数量：${this.dataManager.holesData.length}\n`;
        textContent += `# 排序方式：${this.getSortMethodName(sortMethod)}\n`;

        // 获取最早和最新的帖子时间
        const timeData = this.dataManager.holesData.map(hole => {
            const parts = hole.publishTime.split(' ');
            return parts.length > 1 ? parts[1] + ' ' + parts[0] : hole.publishTime;
        }).sort();

        if (timeData.length > 0) {
            textContent += `# 时间范围：${timeData[0]} 至 ${timeData[timeData.length - 1]}\n`;
        }

        textContent += `\n-------------------------------\n\n`;

        // 根据当前排序方式排序
        let sortedHoles = [...this.dataManager.holesData];
        sortedHoles = this.postUI.sortHolesByMethod(sortedHoles, sortMethod);

        // 添加每个树洞的数据
        sortedHoles.forEach((hole, index) => {
            //textContent += `[${index + 1}] ID: #${hole.id} | 分类: ${hole.category ? `[${hole.category}]` : '未分类'} | 收藏数: ${hole.likeCount} | 评论数: ${hole.replyCount} | 发布时间: ${hole.publishTime}\n\n`;
            //textContent += `${hole.content || '无内容'}\n\n`;
            //textContent += `-------------------------------\n\n`;
            textContent += `#${hole.id} | 收藏:${hole.likeCount} | 评论:${hole.replyCount} | ${hole.publishTime}\n`;
            textContent += `${(hole.content || '无内容').replace(/\n/g, ' ').replace(/\r/g, ' ').slice(0,20)}\n`;
        });

        // 获取导出设置并执行导出
        this.dataManager.getExportSettings().then(exportMode => {
            let saveToLocal = exportMode === 'save' || exportMode === 'both';
            let copyToClipboard = exportMode === 'copy' || exportMode === 'both';
            
            // 根据设置保存到本地
            if (saveToLocal) {
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
            }
            
            // 根据设置复制到剪贴板
            if (copyToClipboard) {
                try {
                    navigator.clipboard.writeText(textContent).then(() => {
                        if (saveToLocal) {
                                this.statusUpdater.updatePostStatus(`已导出 ${sortedHoles.length} 条帖子数据为文本文件，并已复制到剪贴板`);
                        } else {
                                this.statusUpdater.updatePostStatus(`已复制 ${sortedHoles.length} 条帖子数据到剪贴板`);
                        }
                    }).catch(err => {
                        console.error('无法复制到剪贴板: ', err);
                        if (saveToLocal) {
                                this.statusUpdater.updatePostStatus(`已导出 ${sortedHoles.length} 条帖子数据为文本文件（复制到剪贴板失败）`);
                        } else {
                                this.statusUpdater.updatePostStatus(`复制到剪贴板失败`);
                        }
                    });
                } catch (err) {
                    console.error('不支持clipboard API: ', err);
                    if (saveToLocal) {
                            this.statusUpdater.updatePostStatus(`已导出 ${sortedHoles.length} 条帖子数据为文本文件`);
                    } else {
                            this.statusUpdater.updatePostStatus(`复制到剪贴板失败（不支持clipboard API）`);
                    }
                }
            } else {
                    this.statusUpdater.updatePostStatus(`已导出 ${sortedHoles.length} 条帖子数据为文本文件`);
            }
        });
    }

    // 导出悬浮窗中的树洞数据为图片格式
    exportHolesAsImage() {
        this.statusUpdater.updatePostStatus(`导出树洞数据为图片...`);
        if (!this.dataManager.holesData || this.dataManager.holesData.length === 0) {
            this.statusUpdater.updatePostStatus('没有可导出的数据，请先收集数据', true);
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
                    <p style="color: #666; margin: 5px 0;">帖子数量：${this.dataManager.holesData.length}</p>
                    <p style="color: #666; margin: 5px 0;">排序方式：${this.getSortMethodName(sortMethod)}</p>
            </div>
            <div style="border-top: 1px solid #ddd; margin: 10px 0;"></div>
        `;

        // 根据当前排序方式排序
        let sortedHoles = [...this.dataManager.holesData];
        sortedHoles = this.postUI.sortHolesByMethod(sortedHoles, sortMethod);

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
                        ${hole.category ? `<span style="margin-right: 15px; color: #9C27B0;">[${hole.category}]</span>` : ''}
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
        this.loadHtml2Canvas()
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

            // 获取导出设置并执行导出
                this.dataManager.getExportSettings().then(exportMode => {
                let saveToLocal = exportMode === 'save' || exportMode === 'both';
                let copyToClipboard = exportMode === 'copy' || exportMode === 'both';
                
                // 将canvas转换为图片数据
                const imgData = canvas.toDataURL('image/png');
                
                // 根据设置保存到本地
                if (saveToLocal) {
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = `PKU_TreeHole_导出_${new Date().getTime()}.png`;
                    link.click();
                }
                
                // 根据设置复制到剪贴板
                if (copyToClipboard) {
                    try {
                        canvas.toBlob(blob => {
                            try {
                                const item = new ClipboardItem({ 'image/png': blob });
                                navigator.clipboard.write([item]).then(() => {
                                    if (saveToLocal) {
                                            this.statusUpdater.updatePostStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}，并已复制到剪贴板`);
                                    } else {
                                            this.statusUpdater.updatePostStatus(`已复制 ${displayHoles.length} 条帖子数据为图片${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}到剪贴板`);
                                    }
                                }).catch(err => {
                                    console.error('无法复制图片到剪贴板: ', err);
                                    if (saveToLocal) {
                                            this.statusUpdater.updatePostStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}（复制到剪贴板失败）`);
                                    } else {
                                            this.statusUpdater.updatePostStatus(`复制帖子数据图片到剪贴板失败`);
                                    }
                                });
                            } catch (err) {
                                console.error('ClipboardItem不受支持: ', err);
                                if (saveToLocal) {
                                        this.statusUpdater.updatePostStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}`);
                                } else {
                                        this.statusUpdater.updatePostStatus(`复制到剪贴板失败（ClipboardItem不受支持）`);
                                }
                            }
                        });
                    } catch (err) {
                        console.error('无法使用剪贴板功能: ', err);
                        if (saveToLocal) {
                                this.statusUpdater.updatePostStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}`);
                        } else {
                                this.statusUpdater.updatePostStatus(`复制到剪贴板失败（无法使用剪贴板功能）`);
                        }
                    }
                } else {
                        this.statusUpdater.updatePostStatus(`已导出 ${displayHoles.length} 条帖子数据为图片文件${sortedHoles.length > 30 ? '（仅展示前30条）' : ''}`);
                }
            });
        })
        .catch(error => {
            // 确保在出错时也移除临时容器
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            console.error('导出图片失败:', error);
                this.statusUpdater.updatePostStatus('导出图片失败，请重试', true);
        });
    }
}

// 导出ExportManager类，以便在其他文件中引用
export default ExportManager;
