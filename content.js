async function initializeApp() {
    try {
        // 动态导入PostUI模块
        const PageInitializerModule = await import('./Modules/PageInitializer.js');

        const PostUIModule = await import('./Modules/Post/PostUI.js');
        const PostCollectorModule = await import('./Modules/Post/PostCollector.js');
        const PostClassifierModule = await import('./Modules/Post/PostClassifier.js');

        const CommentUIModule = await import('./Modules/Comment/CommentUI.js');
        const CommentCollectorModule = await import('./Modules/Comment/CommentCollector.js');
        const CommentSummarizerModule = await import('./Modules/Comment/CommentSummarizer.js');
        const CommentReplierModule = await import('./Modules/Comment/CommentReplier.js');

        const StatusUpdaterModule = await import('./Modules/General/StatusUpdater.js');
        const ExportManagerModule = await import('./Modules/General/ExportManager.js');
        const DataManagerModule = await import('./Modules/General/DataManager.js');

        // 获取模块中的默认导出
        const PageInitializer = PageInitializerModule.default;

        const PostUI = PostUIModule.default;
        const PostCollector = PostCollectorModule.default;
        const PostClassifier = PostClassifierModule.default;

        const CommentUI = CommentUIModule.default;
        const CommentCollector = CommentCollectorModule.default;
        const CommentSummarizer = CommentSummarizerModule.default;
        const CommentReplier = CommentReplierModule.default;

        const StatusUpdater = StatusUpdaterModule.default;
        const ExportManager = ExportManagerModule.default;
        const DataManager = DataManagerModule.default;

        // 初始化应用
        const statusUpdater = new StatusUpdater();
        const dataManager = new DataManager();
        const postUI = new PostUI(dataManager, statusUpdater);
        const postCollector = new PostCollector(dataManager, statusUpdater, postUI);
        const postClassifier = new PostClassifier(dataManager, statusUpdater, postUI);

        const commentUI = new CommentUI(dataManager, statusUpdater);
        const commentCollector = new CommentCollector(dataManager, statusUpdater, commentUI);
        const commentSummarizer = new CommentSummarizer(dataManager, statusUpdater);
        const commentReplier = new CommentReplier(dataManager, statusUpdater);

        const exportManager = new ExportManager(dataManager, statusUpdater, postUI, commentCollector);
        
        const pageInitializer = new PageInitializer(postUI, commentUI, postCollector);
        postUI.setModules(exportManager, postCollector, postClassifier);
        commentUI.setModules(exportManager, commentCollector, commentSummarizer, commentReplier);
        postCollector.setModules(pageInitializer);

        pageInitializer.start();
    } catch (error) {
        console.error("[PKU TreeHole] 模块加载失败:", error);
    }
}

// 启动应用
initializeApp();
