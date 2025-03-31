
async function initializePopup(){
  try {
    // 动态导入SettingManager模块
    const SettingUIModule = await import('./Modules/Popup/SettingUI.js');
    const SettingManagerModule = await import('./Modules/Popup/SettingManager.js');
    const SettingManager = SettingManagerModule.default;
    const SettingUI = SettingUIModule.default;

    const settingManager = new SettingManager();
    const settingUI = new SettingUI(settingManager);
    settingUI.init();
  } catch (error) {
    console.error("[PKU TreeHole] 模块加载失败:", error);
  }
}

initializePopup();