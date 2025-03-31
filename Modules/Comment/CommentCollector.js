class CommentCollector{
    constructor(dataManager, statusUpdater, commentUI){
        this.dataManager = dataManager;
        this.statusUpdater = statusUpdater;
        this.commentUI = commentUI;
        this.speakerList = new Set(); // 存储所有发言人列表

        // 评论自动滚动相关变量
        this.commentsScrollInterval = null;
        this.isCommentsScrolling = false;

        // 评论收集相关变量
        this.isCollectingComments = false;
        this.commentCollectionStartTime = 0;
        this.commentCollectionTimer = null;
        this.collectedCommentIds = new Set();
        this.earliestCommentTime = null;
        this.latestCommentTime = null; // 新增：用于记录最晚评论时间
        this.totalExpectedComments = 0; // 预期的总评论数量

    }
    // 收集评论
    collectComments(isInitialCollection = false) {
        console.log("[DEBUG] collectComments 被调用");
        // 获取评论容器
        const commentsContainer = document.querySelector(".sidebar-content");
        if (!commentsContainer) {
                this.statusUpdater.updateCommentStatus("无法找到评论容器", true);
            return;
        }

        // 获取所有评论元素
        const commentElements = commentsContainer.querySelectorAll(".box:not(.box-tip):not(.box33)");
        if (!commentElements || commentElements.length === 0) {
                this.statusUpdater.updateCommentStatus("未找到评论", true);
            return;
        }

            this.statusUpdater.updateCommentStatus(`找到 ${commentElements.length} 条评论，正在处理...`);

        // 收集评论数据
        const comments = [];
        const processedIds = new Set(); // 用于跟踪已处理的评论ID
        
        // 标记是否找到了主贴
        let foundMainPost = false;
        let mainPostData = null;
        
        // 记录这次处理的非主贴评论
        const nonMainPostComments = [];

        // 处理评论元素
        commentElements.forEach((element, index) => {
            // 提取评论ID
            const idElement = element.querySelector(".box-id");
            if (!idElement) return;

            const commentId = idElement.textContent.trim();

            // 跳过已处理的评论
            if (processedIds.has(commentId)) return;
            
            // 获取发布时间
            const headerElement = element.querySelector(".box-header");
            let publishTime = null;
            if (headerElement) {
                const timeMatch = headerElement.textContent.match(/(\d{2}-\d{2} \d{2}:\d{2})/);
                if (timeMatch && timeMatch[1]) {
                    publishTime = timeMatch[1];
                    
                    // 更新最早评论时间
                        if (!this.earliestCommentTime || publishTime < this.earliestCommentTime) {
                            this.earliestCommentTime = publishTime;
                    }
                    
                    // 更新最晚评论时间
                        if (!this.latestCommentTime || publishTime > this.latestCommentTime) {
                            this.latestCommentTime = publishTime;
                    }
                }
            }
            
            let commentData;
            
            // 检查是否为主贴
            // 策略1：第一条评论总是尝试作为主贴处理
            // 策略2：检查是否有收藏按钮/数量来判断是否为主贴
            const isLikelyMainPost = index === 0 || 
                                    element.querySelector('.box-header-badge .icon-star') || 
                                    element.querySelector('.box-header-badge .icon-star-ok');
            
            if (isLikelyMainPost) {
                // 尝试提取为主贴
                    commentData = this.extractMainPostData(element);
                
                // 如果成功提取为主贴且包含必要数据，标记为找到主贴
                if (commentData && (commentData.stars > 0 || commentData.comments > 0)) {
                    foundMainPost = true;
                    mainPostData = commentData;
                } else if (commentData) {
                    // 即使没有收藏数/评论数，如果是第一条也视为主贴
                    if (index === 0) {
                        foundMainPost = true;
                        mainPostData = commentData;
                    } else {
                        // 否则按普通评论处理
                            commentData = this.extractCommentData(element);
                        if (commentData) {
                            nonMainPostComments.push(commentData);
                        }
                    }
                }
            } else {
                // 处理普通评论
                    commentData = this.extractCommentData(element);
                if (commentData) {
                    nonMainPostComments.push(commentData);
                }
            }
            
            if (commentData) {
                if (publishTime) {
                    commentData.publishTime = publishTime;
                }
                comments.push(commentData);
                processedIds.add(commentId);
                
                // 将收集到的评论ID添加到全局集合
                    this.collectedCommentIds.add(commentId);
                
                // 如果不是主贴，将发言人添加到全局集合
                if (!commentData.isMainPost && commentData.speaker) {
                        this.speakerList.add(commentData.speaker);
                }
            }
        });
        
        // 将非主贴评论添加到全局数组
        // 使用Set去重，避免重复添加同一条评论
        if (foundMainPost && mainPostData 
                && !this.dataManager.allCommentsData.find(comment => comment.isMainPost)) {
                this.dataManager.allCommentsData.push(mainPostData);
        }

        nonMainPostComments.forEach(comment => {
            // 检查评论是否已经存在于dataManager.allCommentsData中
                const isDuplicate = this.dataManager.allCommentsData.some(existingComment => 
                existingComment.id === comment.id);
            
            if (!isDuplicate) {
                    this.dataManager.allCommentsData.push(comment);
            }
        });
        
        // 如果找到了主贴，更新全局统计信息
        if (foundMainPost && mainPostData) {
            // 更新全局统计信息
                this.totalExpectedComments = mainPostData.comments || 0;
            
            // 根据是否有评论显示不同的信息
                if (this.totalExpectedComments > 0) {
                    this.statusUpdater.updateCommentStatus(`开始收集评论 (共 ${this.totalExpectedComments} 条)`);
            } else {
                    this.statusUpdater.updateCommentStatus(`开始收集评论 (暂无其他评论)`);
            }
        }

        // 显示收集到的评论
        const dialogCommentsContainer = document.getElementById("comments-container");
        if (dialogCommentsContainer) {
            // 不再需要在这里清空容器，因为displayComments函数已经会清空容器
            // 显示评论
            this.commentUI.displayComments(comments, dialogCommentsContainer);

            // 更新状态信息（包括主贴中的总数信息）
            const collectedCount = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost).length; // 使用非主贴评论的数量
            let statusMessage = '';
            
                if (this.totalExpectedComments > 0) {
                    const progressInfo = this.totalExpectedComments ? 
                        ` (${Math.round((collectedCount / this.totalExpectedComments) * 100)}%)` : "";
                    statusMessage = `已收集 ${collectedCount}/${this.totalExpectedComments} 条评论${progressInfo}`;
            } else {
                statusMessage = `已收集 ${collectedCount} 条评论`;
            }
            
                this.statusUpdater.updateCommentStatus(statusMessage);
            
            // 更新评论统计数据
                this.updateCommentStats(
                collectedCount,
                    Math.floor((Date.now() - this.commentCollectionStartTime) / 1000),
                    this.latestCommentTime || '未知'
            );
            
            // 检查进度是否到达100%，如果是则自动停止收集
                if (this.totalExpectedComments > 0 && collectedCount >= this.totalExpectedComments) {
                    this.statusUpdater.updateCommentStatus("已收集全部评论，自动停止收集");
                // 使用setTimeout来避免在collectComments函数执行过程中直接调用stopCollectComments
                setTimeout(() => {
                        if (this.isCollectingComments) {
                            this.stopCollectComments();
                    }
                }, 500);
            }
        }
        
        return comments;
    }

    // 专门处理第一条帖子（树洞主贴）的函数
    extractMainPostData(postElement) {
        console.log("[DEBUG] extractMainPostData 被调用");
        try {
            // 获取帖子ID
            const idElement = postElement.querySelector('.box-id');
            const id = idElement ? idElement.textContent.trim().replace('#', '') : '';

            // 获取帖子内容
            const contentElement = postElement.querySelector('.box-content');
            if (!contentElement) return null;
            
            // 获取主贴内容文本
            const content = contentElement.innerText.trim();
            
            // 提取收藏数和评论数
            const headerElement = postElement.querySelector('.box-header');
            let stars = 0;
            let comments = 0;
            let publishTime = '';
            
            if (headerElement) {
                // 提取收藏数 (检查两种可能的图标类名)
                const starBadge = headerElement.querySelector('.box-header-badge .icon-star-ok') || 
                                headerElement.querySelector('.box-header-badge .icon-star');
                
                if (starBadge && starBadge.parentElement) {
                    const starText = starBadge.parentElement.textContent.trim();
                    stars = parseInt(starText) || 0;
                }
                
                // 提取评论数 (可能不存在)
                const replyBadge = headerElement.querySelector('.box-header-badge .icon-reply');
                if (replyBadge && replyBadge.parentElement) {
                    const replyText = replyBadge.parentElement.textContent.trim();
                    comments = parseInt(replyText) || 0;
                }
                
                // 提取发布时间 (格式：刚刚&nbsp;03-04 21:35 或 2分钟前&nbsp;03-04 21:35)
                // 我们优先使用日期部分 (xx-xx xx:xx)
                const dateTimeMatch = headerElement.textContent.match(/(\d{2}-\d{2} \d{2}:\d{2})/);
                if (dateTimeMatch) {
                    publishTime = dateTimeMatch[1];
                } else {
                    // 如果没有匹配到日期格式，尝试提取整个时间信息
                    const timeText = headerElement.textContent.trim().split('        ')[1];
                    if (timeText) {
                        publishTime = timeText.trim();
                    }
                }
            }
            
            // 提取图片元素
            const images = [];
            const imgElements = contentElement.querySelectorAll('img');
            imgElements.forEach(img => {
                if (img.src) {
                    images.push(img.src);
                }
            });
            
            console.log('提取主贴数据:', { id, stars, comments, publishTime });
            
            return {
                id,
                speaker: '洞主',  // 主贴发言人一定是洞主
                content,
                publishTime: publishTime || '',
                images,
                isMainPost: true,  // 标记为主贴
                stars,            // 收藏数
                comments          // 评论数
            };
        } catch (error) {
            console.error('[PKU TreeHole] 提取主贴数据出错:', error);
            return null;
        }
    }

    // 提取评论数据
    extractCommentData(commentElement) {
        console.log("[DEBUG] extractCommentData 被调用");
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

            // 提取图片元素
            const images = [];
            const imgElements = contentElement.querySelectorAll('img');
            imgElements.forEach(img => {
                if (img.src) {
                    images.push(img.src);
                }
            });

            return {
                id,
                speaker,
                content,
                quote,
                publishTime,
                images,  // 添加图片数组到返回数据中
            };
        } catch (error) {
            console.error('[PKU TreeHole] 提取评论数据出错:', error);
            return null;
        }
    }


    // 开始自动滚动评论页面
    startCommentsAutoScroll() {
        console.log("[DEBUG] startCommentsAutoScroll 被调用");
        if (this.isCommentsScrolling) return;

        this.isCommentsScrolling = true;

        // 获取评论容器
        const scrollContainer = document.querySelector(".sidebar-content");
        if (!scrollContainer) {
            console.error("[PKU TreeHole] 无法找到评论滚动容器");
                this.isCommentsScrolling = false;
            return;
        }

        console.log("[PKU TreeHole] 开始自动滚动评论...");

        // 清除可能存在的上一个滚动计时器
            if (this.commentsScrollInterval) {
                clearInterval(this.commentsScrollInterval);
        }

        // 记录上次评论数量，用于检测是否还在加载新评论
        let lastCommentCount = 0;
        let stableCount = 0;

        // 设置滚动间隔
            this.commentsScrollInterval = setInterval(() => {
            // 如果已不再收集评论，停止滚动
                if (!this.isCollectingComments) {
                    this.stopCommentsAutoScroll(false);
                return;
            }

            // 滚动到页面底部以加载更多评论
            scrollContainer.scrollBy({
                top: 3000,
                behavior: 'smooth'
            });

            // 更新评论收集状态
                this.statusUpdater.updateCommentStatus("正在自动滚动加载评论...");

            // 收集当前可见的评论
                this.collectComments();

            // 检查是否已加载完全部评论（到达底部且评论数量不再增加）
                const currentCommentCount = this.collectedCommentIds.size;
                const isAtBottom = this.isScrolledToBottom(scrollContainer);

            // 检查进度是否达到100%
                const nonMainPostCount = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost).length;
                const progressReached100 = this.totalExpectedComments > 0 && nonMainPostCount >= this.totalExpectedComments;
            
            // 如果进度达到100%，停止滚动和收集
            if (progressReached100) {
                    this.statusUpdater.updateCommentStatus("已收集全部评论，自动停止收集");
                    this.stopCollectComments(); // 停止收集评论（也会停止滚动）
                return;
            }

            if (isAtBottom) {
                // 如果评论数量与上次相同，累加稳定计数
                if (currentCommentCount === lastCommentCount) {
                    stableCount++;

                    // 如果连续3次检测到评论数量不变且在底部，认为已收集完成
                    if (stableCount >= 3) {
                            this.collectComments(); // 最后再收集一次
                            this.statusUpdater.updateCommentStatus("已滚动到底部，评论加载完成，停止收集");
                            this.stopCollectComments(); // 停止收集评论（也会停止滚动）
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
    stopCommentsAutoScroll(updateCheckbox = true) {
        console.log("[DEBUG] stopCommentsAutoScroll 被调用");
        if (this.commentsScrollInterval) {
            clearInterval(this.commentsScrollInterval);
            this.commentsScrollInterval = null;
        }
        this.isCommentsScrolling = false;

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
    isScrolledToBottom(element) {
        console.log("[DEBUG] isScrolledToBottom 被调用");
        // 当滚动位置 + 可视高度 >= 总滚动高度 - 5像素（容差）时，认为已滚动到底部
        return element.scrollTop + element.clientHeight >= element.scrollHeight - 5;
    }

    // 开始收集评论
    startCollectComments() {
        console.log("[DEBUG] startCollectComments 被调用");
        if (this.isCollectingComments) return;

        // 重置变量
        this.isCollectingComments = true;
        this.commentCollectionStartTime = Date.now();
        this.collectedCommentIds.clear();
        this.earliestCommentTime = null;
        this.latestCommentTime = null; // 新增：用于记录最晚评论时间
        this.dataManager.allCommentsData = []; // 清空所有评论数据
        this.speakerList.clear(); // 清空发言人列表

        // 删除总结容器（如果存在）
        const summaryContainer = document.getElementById('summary-container');
        if (summaryContainer) {
            summaryContainer.remove();
        }

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

        // 隐藏导出控件（收集过程中不显示）
        const exportControls = document.getElementById('export-controls');
        if (exportControls) {
            exportControls.style.display = 'none';
        }

        // 显示统计信息区域
        const commentStats = document.getElementById('comment-stats');
        if (commentStats) {
            commentStats.style.display = 'block';
        }

        // 重置统计信息
            this.updateCommentStats(0, 0, '-');

        // 开始收集
            this.statusUpdater.updateCommentStatus('开始收集评论...');
            this.collectComments(true);
        
        // 立即检查是否已经收集完毕
            const nonMainPostCount = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost).length;
            if ((this.totalExpectedComments > 0 && nonMainPostCount >= this.totalExpectedComments) || this.totalExpectedComments === 0) {
                this.statusUpdater.updateCommentStatus("已收集全部评论，自动停止收集");
            setTimeout(() => {
                    if (this.isCollectingComments) {
                        this.stopCollectComments();
                }
            }, 500);
            return;
        }

        // 设置计时器，定期更新用时
            this.commentCollectionTimer = setInterval(() => {
                const elapsedSeconds = Math.floor((Date.now() - this.commentCollectionStartTime) / 1000);
                this.updateCollectionTime(elapsedSeconds);
        }, 1000);

        // 检查自动滚动选项是否已勾选
        const autoScrollCheckbox = document.getElementById('auto-scroll-comments');
        const isAutoScrollEnabled = autoScrollCheckbox && autoScrollCheckbox.checked;

        // 如果自动滚动选项已勾选，则开始自动滚动
        if (isAutoScrollEnabled) {
                this.startCommentsAutoScroll();
        } else {
            // 如果没有启用自动滚动，添加评论数量检测计时器
            // 用于检测评论数量是否在一段时间内无变化，如果是则停止收集
            
            // 保存上一次检查时的评论数量
            let lastCommentCount = nonMainPostCount;
            // 记录评论数量连续无变化的次数
            let unchangedCount = 0;
            // 连续无变化的阈值，达到此值时停止收集
            const MAX_UNCHANGED_COUNT = 3; // 连续3次无变化后停止
            
            // 创建评论数量检测计时器
            let noChangeDetectionTimer = setInterval(() => {
                    if (!this.isCollectingComments) {
                    clearInterval(noChangeDetectionTimer);
                    return;
                }
                
                    const currentCommentCount = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost).length;
                
                // 如果评论数量无变化
                if (currentCommentCount === lastCommentCount) {
                    unchangedCount++;
                    
                    // 如果有预期总数且已达到，则立即停止
                        if (this.totalExpectedComments > 0 && currentCommentCount >= this.totalExpectedComments) {
                            this.statusUpdater.updateCommentStatus("已收集全部评论，自动停止收集");
                            if (this.isCollectingComments) {
                                this.stopCollectComments();
                        }
                        clearInterval(noChangeDetectionTimer);
                    } 
                    // 如果连续多次检测到评论数量无变化，且已经收集了一些评论，则停止收集
                    else if (currentCommentCount > 0 && unchangedCount >= MAX_UNCHANGED_COUNT) {
                            this.statusUpdater.updateCommentStatus(`评论数量 ${currentCommentCount} 在${MAX_UNCHANGED_COUNT}秒内无变化，停止收集`);
                            if (this.isCollectingComments) {
                                this.stopCollectComments();
                        }
                        clearInterval(noChangeDetectionTimer);
                    }
                } else {
                    // 评论数量有变化，重置连续无变化计数
                    unchangedCount = 0;
                }
                
                // 更新上一次检查的评论数量
                lastCommentCount = currentCommentCount;
            }, 600); // 每0.6秒检查一次
        }
    }

    // 停止收集评论
    stopCollectComments() {
        console.log("[DEBUG] stopCollectComments 被调用");
        if (!this.isCollectingComments) return;

        this.isCollectingComments = false;

        // 停止计时器
            if (this.commentCollectionTimer) {
                clearInterval(this.commentCollectionTimer);
                this.commentCollectionTimer = null;
        }

        // 清除可能存在的其他计时器（通过名称检测和清除不可靠，此处只是注释说明）
        // 所有计时器变量应在startCollectComments中创建时保存在闭包内，在这里不需要额外操作
        // noChangeDetectionTimer会在其自己的逻辑中检测isCollectingComments并自动退出

        // 停止自动滚动（但不取消复选框勾选）
            this.stopCommentsAutoScroll(false);

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

        // 显示导出控件
        const exportControls = document.getElementById('export-controls');
        if (exportControls) {
            exportControls.style.display = 'block';
        }
        
        // 确保统计信息区域也显示
        const commentStats = document.getElementById('comment-stats');
        if (commentStats) {
            commentStats.style.display = 'block';
        }

        // 更新筛选下拉框
            this.updateSpeakerFilter();

        // 添加筛选下拉框的事件监听
        const speakerFilter = document.getElementById('speaker-filter');
        if (speakerFilter) {
            // 先移除可能存在的旧监听器
                speakerFilter.removeEventListener('change', this.filterAndDisplayComments);
            // 添加新的监听器
                speakerFilter.addEventListener('change', () => this.filterAndDisplayComments());
        }

        // 更新最终的评论数统计
            const collectedCount = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost).length;
            this.updateCommentStats(
            collectedCount,
                Math.floor((Date.now() - this.commentCollectionStartTime) / 1000),
                this.latestCommentTime || '未知'
        );

        this.statusUpdater.updateCommentStatus(`收集完成，共 ${collectedCount} 条评论`);
    }

    // 更新评论统计信息
    updateCommentStats(count, timeInSeconds, latestTime) {
        console.log("[DEBUG] updateCommentStats 被调用");
        const countElement = document.getElementById('comment-count');
        const timeElement = document.getElementById('collection-time');
        const latestTimeElement = document.getElementById('earliest-comment-time');
        
        // 计算进度百分比
        let progressPercentage = '';
            if (this.totalExpectedComments > 0) {
                const percentage = Math.round((count / this.totalExpectedComments) * 100);
            progressPercentage = ` (${percentage}%)`;
        }

        if (countElement) countElement.textContent = `${count}${progressPercentage}`;
        if (timeElement) timeElement.textContent = this.formatTime(timeInSeconds);
        if (latestTimeElement) latestTimeElement.textContent = latestTime;
    }

    // 更新收集用时
    updateCollectionTime(timeInSeconds) {
        console.log("[DEBUG] updateCollectionTime 被调用");
        const timeElement = document.getElementById('collection-time');
        if (timeElement) {
                timeElement.textContent = this.formatTime(timeInSeconds);
        }
    }

    // 格式化时间
    formatTime(seconds) {
        console.log("[DEBUG] formatTime 被调用");
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
    updateSpeakerFilter() {
        console.log("[DEBUG] updateSpeakerFilter 被调用");
        // 获取所有唯一的发言者
        const speakers = new Set();
        
        // 保存当前选中的值
        const speakerFilter = document.getElementById('speaker-filter');
            const replyTargetFilter = document.getElementById('reply-target');
            
        // 默认值设为'all'，即全部评论
            const selectedSpeakerValue = speakerFilter && speakerFilter.value ? speakerFilter.value : 'all';
            const selectedReplyTargetValue = replyTargetFilter && replyTargetFilter.value ? replyTargetFilter.value : 'all';
        
            // 清空"只看"下拉框
        if (speakerFilter) {
            speakerFilter.innerHTML = '';
            
            // 添加"全部"选项
            const allOption = document.createElement('option');
            allOption.value = 'all';
            
            // 使用非主贴评论的数量
                const nonMainPostComments = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost);
            allOption.textContent = `全部 (${nonMainPostComments.length}条)`;
            speakerFilter.appendChild(allOption);
            }
            
            // 清空"回复对象"下拉框
            if (replyTargetFilter) {
                replyTargetFilter.innerHTML = '';
                
                // 添加"整体讨论"选项
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = '整体讨论';
                replyTargetFilter.appendChild(allOption);
                
                // 添加"洞主"选项 - 这里我们使用固定的"author"值来表示洞主
                const authorOption = document.createElement('option');
                authorOption.value = 'author';
                authorOption.textContent = '洞主';
                replyTargetFilter.appendChild(authorOption);
            }
            
            // 遍历评论获取发言者，排除主贴
            this.dataManager.allCommentsData.forEach(comment => {
                if (!comment.isMainPost && comment.speaker && !speakers.has(comment.speaker)) {
                    speakers.add(comment.speaker);
                }
            });
            
            // 为每个发言者创建选项并添加到两个下拉框中
            speakers.forEach(speaker => {
                // 计算该发言者的评论数，排除主贴
                const speakerCommentCount = this.dataManager.allCommentsData.filter(comment => 
                    !comment.isMainPost && comment.speaker === speaker).length;
                
                // 为"只看"下拉框添加选项
                if (speakerFilter) {
                    const speakerOption = document.createElement('option');
                    speakerOption.value = speaker;
                    speakerOption.textContent = `${speaker} (${speakerCommentCount}条)`;
                    speakerFilter.appendChild(speakerOption);
                }
                
                // 为"回复对象"下拉框添加选项，但跳过"洞主"（因为已经添加过固定的洞主选项）
                if (replyTargetFilter && speaker !== '洞主') {
                    const replyOption = document.createElement('option');
                    replyOption.value = speaker;
                    replyOption.textContent = speaker;
                    replyTargetFilter.appendChild(replyOption);
                }
            });
            
            // 恢复选中的值
            if (speakerFilter) {
                speakerFilter.value = selectedSpeakerValue;
            }
            
            if (replyTargetFilter) {
                replyTargetFilter.value = selectedReplyTargetValue;
        }
    }

    // 筛选并显示评论
    filterAndDisplayComments() {
        console.log("[DEBUG] filterAndDisplayComments 被调用");
        // 获取筛选条件
        const speakerFilter = document.getElementById('speaker-filter');
        const selectedSpeaker = speakerFilter ? speakerFilter.value : 'all';
        
        // 查找主贴
            const mainPost = this.dataManager.allCommentsData.find(comment => comment.isMainPost);

        // 筛选评论（不包括主贴）
            let filteredComments = this.dataManager.allCommentsData.filter(comment => !comment.isMainPost);
        
        // 根据发言者筛选普通评论
        if (selectedSpeaker !== 'all') {
            filteredComments = filteredComments.filter(comment => 
                comment.speaker === selectedSpeaker);
        }
        
        // 如果找到主贴，将其添加到筛选结果的开头
        if (mainPost) {
            filteredComments = [mainPost, ...filteredComments];
        }
        
        // 显示筛选后的评论
        const commentsContainer = document.getElementById('comments-container');
        if (commentsContainer) {
                // 不需要在这里清空容器，因为displayComments函数已经会清空容器
                this.commentUI.displayComments(filteredComments, commentsContainer);
            
            // 更新评论数显示 (主贴不计入评论数)
            const nonMainPostCount = filteredComments.filter(comment => !comment.isMainPost).length;
                this.statusUpdater.updateCommentStatus(`已筛选 ${nonMainPostCount} 条评论`);
        }
    }
}

export default CommentCollector;
