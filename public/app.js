// FingerprintJS V4 應用程式
class FingerprintApp {
    constructor() {
        this.fp = null;
        this.isInitialized = false;
        this.currentUser = null;
        this.loginRecaptchaId = null;
        this.registerRecaptchaId = null;
        this.bindEvents();
        this.setupRealTimeUpdates();
        this.checkAuthStatus();
        this.init();
        this.initRecaptcha();
    }

    // 初始化應用程式
    async init() {
        try {
            console.log('正在初始化應用程式...');
            this.updateStatus('正在載入 FingerprintJS...', 'ready');
            
            // 使用新的載入管理器
            if (window.fingerprintLoader) {
                console.log('使用 FingerprintLoader 載入 FingerprintJS...');
                await window.fingerprintLoader.load();
            } else {
                // 備用方案：直接等待
                console.log('FingerprintLoader 不可用，使用備用載入方案...');
                await this.waitForFingerprintJS();
            }

            // 檢查是否載入成功
            if (typeof FingerprintJS === 'undefined') {
                this.showError('FingerprintJS 載入失敗，請檢查網路連線或重新整理頁面');
                return;
            }

            // 初始化 FingerprintJS
            console.log('開始初始化 FingerprintJS...');
            this.updateStatus('正在初始化 FingerprintJS...', 'collecting');
            
            this.fp = await FingerprintJS.load();
            this.isInitialized = true;
            
            console.log('FingerprintJS V4 初始化成功');
            this.updateStatus('準備就緒，點擊「開始採集指紋」按鈕開始測試', 'ready');
            
            // 初始化顯示基本系統資訊
            this.clearResults();
            
        } catch (error) {
            console.error('FingerprintJS V4 初始化失敗:', error);
            this.showError('FingerprintJS 初始化失敗: ' + error.message);
        }
    }

    // 等待 FingerprintJS 載入
    async waitForFingerprintJS() {
        let attempts = 0;
        const maxAttempts = 30; // 增加到 15 秒
        
        while (attempts < maxAttempts) {
            if (typeof FingerprintJS !== 'undefined') {
                console.log('FingerprintJS 已載入');
                return;
            }
            
            console.log(`等待 FingerprintJS 載入... (${attempts + 1}/${maxAttempts})`);
            this.updateStatus(`等待 FingerprintJS 載入... (${attempts + 1}/${maxAttempts})`, 'collecting');
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        console.error('FingerprintJS 載入超時');
        throw new Error('FingerprintJS 載入超時，請檢查網路連線');
    }



    // 綁定事件
    bindEvents() {
        const collectBtn = document.getElementById('collectBtn');
        const clearBtn = document.getElementById('clearBtn');
        const toggleAuthBtn = document.getElementById('toggleAuthBtn');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const showRegisterBtn = document.getElementById('showRegisterBtn');
        const showLoginBtn = document.getElementById('showLoginBtn');
        const closeModalBtn = document.getElementById('closeModal');
        const authModal = document.getElementById('authModal');
        const agreeBtn = document.getElementById('agreeBtn');
        const disagreeBtn = document.getElementById('disagreeBtn');

        collectBtn.addEventListener('click', () => this.showPrivacyModal());
        clearBtn.addEventListener('click', () => this.clearResults());
        toggleAuthBtn.addEventListener('click', () => this.showAuthModal());
        loginBtn.addEventListener('click', () => this.login());
        registerBtn.addEventListener('click', () => this.register());
        showRegisterBtn.addEventListener('click', () => this.showRegisterForm());
        showLoginBtn.addEventListener('click', () => this.showLoginForm());
        closeModalBtn.addEventListener('click', () => this.closeAuthModal());
        agreeBtn.addEventListener('click', () => this.agreeToPrivacy());
        disagreeBtn.addEventListener('click', () => this.disagreeToPrivacy());
        
        // 點擊背景關閉彈出視窗
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                this.closeAuthModal();
            }
        });

        const privacyModal = document.getElementById('privacyModal');
        privacyModal.addEventListener('click', (e) => {
            if (e.target === privacyModal) {
                this.closePrivacyModal();
            }
        });
        
        // ESC 鍵關閉彈出視窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (authModal.classList.contains('show')) {
                    this.closeAuthModal();
                } else if (privacyModal.classList.contains('show')) {
                    this.closePrivacyModal();
                }
            }
        });
    }

    // 設定即時更新
    setupRealTimeUpdates() {
        // 監聽視窗大小變化
        let resizeTimer;
        window.addEventListener('resize', () => {
            // 使用防抖動，避免頻繁更新
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.updateViewportSize();
            }, 100);
        });

        // 初始化顯示當前視窗大小
        this.updateViewportSize();
    }

    // 更新視窗大小顯示
    updateViewportSize() {
        const viewportElement = document.getElementById('viewportSize');
        if (viewportElement) {
            const size = `${window.innerWidth} x ${window.innerHeight}`;
            viewportElement.textContent = size;
            
            // 如果還沒有採集過指紋，也更新螢幕解析度
            const screenElement = document.getElementById('screenResolution');
            if (screenElement && screenElement.textContent === '尚未採集') {
                screenElement.textContent = `${screen.width} x ${screen.height}`;
            }
        }
    }

    // 採集指紋
    async collectFingerprint() {
        if (!this.isInitialized || !this.fp) {
            this.showError('FingerprintJS 尚未初始化');
            return;
        }

        try {
            this.updateStatus('正在採集指紋...', 'collecting');
            this.disableButton('collectBtn', true);

            console.log('開始採集 FingerprintJS V4 指紋...');
            const startTime = Date.now();

            // 採集指紋
            const result = await this.fp.get();
            const endTime = Date.now();

            console.log('FingerprintJS V4 指紋採集成功:', result);

            // 顯示結果
            this.displayResults(result, endTime - startTime);
            this.updateStatus('指紋採集完成', 'success');

            // 發送到伺服器並處理用戶識別
            await this.sendToServer(result);

        } catch (error) {
            console.error('指紋採集失敗:', error);
            this.showError('指紋採集失敗: ' + error.message);
            this.updateStatus('採集失敗', 'error');
        } finally {
            this.disableButton('collectBtn', false);
        }
    }

    // 顯示結果
    displayResults(result, collectionTime) {
        // 基本資訊
        document.getElementById('visitorId').textContent = result.visitorId;
        document.getElementById('confidence').textContent = `${(result.confidence.score * 100).toFixed(1)}%`;
        document.getElementById('version').textContent = result.version;
        document.getElementById('collectionTime').textContent = `${collectionTime}ms`;

        // 系統資訊 - 從 FingerprintJS 元件中提取
        this.displaySystemInfo(result.components);

        // 統計資訊
        const stats = this.calculateStats(result.components);
        document.getElementById('totalComponents').textContent = stats.totalComponents;
        document.getElementById('successfulComponents').textContent = stats.successfulComponents;
        document.getElementById('failedComponents').textContent = stats.failedComponents;
        document.getElementById('averageDuration').textContent = `${stats.averageDuration.toFixed(1)}ms`;

        // 元件列表
        this.displayComponents(result.components);

        // 調試資訊
        this.displayDebugInfo(result);
    }

    // 計算統計資訊
    calculateStats(components) {
        const stats = {
            totalComponents: Object.keys(components).length,
            successfulComponents: 0,
            failedComponents: 0,
            totalDuration: 0
        };

        for (const [key, component] of Object.entries(components)) {
            if ('error' in component) {
                stats.failedComponents++;
            } else {
                stats.successfulComponents++;
                stats.totalDuration += component.duration;
            }
        }

        stats.averageDuration = stats.successfulComponents > 0 
            ? stats.totalDuration / stats.successfulComponents 
            : 0;

        return stats;
    }

    // 顯示元件列表
    displayComponents(components) {
        const container = document.getElementById('componentsList');
        container.innerHTML = '';

        for (const [key, component] of Object.entries(components)) {
            const componentDiv = document.createElement('div');
            componentDiv.className = 'component-item';

            const status = 'error' in component ? 'error' : 'success';
            const value = 'error' in component ? component.error : component.value;
            const duration = component.duration;

            componentDiv.innerHTML = `
                <div class="component-header">
                    <span class="component-name">${key}</span>
                    <span class="component-status ${status}">${status === 'success' ? '✓' : '✗'}</span>
                    <span class="component-duration">${duration}ms</span>
                </div>
                <div class="component-value">
                    <pre>${this.formatValue(value)}</pre>
                </div>
            `;

            container.appendChild(componentDiv);
        }
    }

    // 格式化值
    formatValue(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    }

    // 顯示系統資訊
    displaySystemInfo(components) {
        // 從 FingerprintJS 元件中提取系統資訊
        const systemInfo = this.extractSystemInfo(components);
        
        // 更新 HTML 元素
        document.getElementById('userAgent').textContent = systemInfo.userAgent || '無法取得';
        document.getElementById('screenResolution').textContent = systemInfo.screenResolution || '無法取得';
        document.getElementById('viewportSize').textContent = systemInfo.viewportSize || '無法取得';
        document.getElementById('timezone').textContent = systemInfo.timezone || '無法取得';
        document.getElementById('language').textContent = systemInfo.language || '無法取得';
        document.getElementById('platform').textContent = systemInfo.platform || '無法取得';
        document.getElementById('hardwareConcurrency').textContent = systemInfo.hardwareConcurrency || '無法取得';
        document.getElementById('deviceMemory').textContent = systemInfo.deviceMemory || '無法取得';
    }

    // 從 FingerprintJS 元件中提取系統資訊
    extractSystemInfo(components) {
        const info = {};
        
        // 使用者代理
        if (components.userAgent && !components.userAgent.error) {
            info.userAgent = components.userAgent.value;
        } else {
            info.userAgent = navigator.userAgent;
        }
        
        // 螢幕解析度
        if (components.screenResolution && !components.screenResolution.error) {
            const resolution = components.screenResolution.value;
            info.screenResolution = `${resolution[0]} x ${resolution[1]}`;
        } else {
            info.screenResolution = `${screen.width} x ${screen.height}`;
        }
        
        // 瀏覽器視窗大小
        info.viewportSize = `${window.innerWidth} x ${window.innerHeight}`;
        
        // 時區
        if (components.timezone && !components.timezone.error) {
            info.timezone = components.timezone.value;
        } else {
            info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        
        // 語言
        if (components.languages && !components.languages.error) {
            info.language = components.languages.value.join(', ');
        } else {
            info.language = navigator.languages ? navigator.languages.join(', ') : navigator.language;
        }
        
        // 平台
        if (components.platform && !components.platform.error) {
            info.platform = components.platform.value;
        } else {
            info.platform = navigator.platform;
        }
        
        // CPU 核心數
        if (components.hardwareConcurrency && !components.hardwareConcurrency.error) {
            info.hardwareConcurrency = `${components.hardwareConcurrency.value} 核心`;
        } else {
            info.hardwareConcurrency = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} 核心` : '無法取得';
        }
        
        // 裝置記憶體
        if (components.deviceMemory && !components.deviceMemory.error) {
            info.deviceMemory = `${components.deviceMemory.value} GB`;
        } else {
            info.deviceMemory = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '無法取得';
        }
        
        return info;
    }

    // 顯示調試資訊
    displayDebugInfo(result) {
        const debugOutput = document.getElementById('debugOutput');
        const debugInfo = {
            visitorId: result.visitorId,
            confidence: result.confidence,
            version: result.version,
            componentsCount: Object.keys(result.components).length,
            timestamp: new Date().toISOString()
        };
        
        debugOutput.textContent = JSON.stringify(debugInfo, null, 2);
    }

    // 發送到伺服器
    async sendToServer(result) {
        try {
            const response = await fetch('/api/fingerprint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    visitorId: result.visitorId,
                    confidence: result.confidence,
                    version: result.version,
                    components: result.components,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.isLoggedIn) {
                    // 已登入用戶
                    this.updateStatus(data.message, 'logged-in-user');
                } else if (data.isGuest && data.topMatches && data.topMatches.length > 0) {
                    // 未登入但找到相似用戶
                    this.updateStatus(data.message, 'smart-correlation');
                } else if (data.isGuest) {
                    // 完全新的訪客
                    this.updateStatus(data.message, 'new-user');
                } else {
                    // 舊邏輯保留（以防萬一）
                    if (data.isNewUser) {
                        this.updateStatus('新使用者', 'new-user');
                    } else {
                        let statusClass = 'existing-user';
                        let message = `使用者 ID: ${data.userId} (相似度: ${data.similarity}%)`;
                        
                        if (data.fingerprintChanged) {
                            statusClass = 'fingerprint-changed';
                            message += ` - ${data.message}`;
                        }
                        
                        this.updateStatus(message, statusClass);
                    }
                }
            } else {
                console.error('伺服器回應錯誤:', response.status);
            }
        } catch (error) {
            console.error('發送到伺服器失敗:', error);
        }
    }

    // 清除結果
    clearResults() {
        document.getElementById('visitorId').textContent = '尚未採集';
        document.getElementById('confidence').textContent = '尚未採集';
        document.getElementById('version').textContent = '尚未採集';
        document.getElementById('collectionTime').textContent = '尚未採集';
        
        // 清除系統資訊並顯示即時可取得的資訊
        document.getElementById('userAgent').textContent = '尚未採集';
        document.getElementById('screenResolution').textContent = `${screen.width} x ${screen.height}`;
        document.getElementById('viewportSize').textContent = `${window.innerWidth} x ${window.innerHeight}`;
        document.getElementById('timezone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
        document.getElementById('language').textContent = navigator.languages ? navigator.languages.join(', ') : navigator.language;
        document.getElementById('platform').textContent = navigator.platform;
        document.getElementById('hardwareConcurrency').textContent = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} 核心` : '無法取得';
        document.getElementById('deviceMemory').textContent = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '無法取得';
        
        document.getElementById('totalComponents').textContent = '0';
        document.getElementById('successfulComponents').textContent = '0';
        document.getElementById('failedComponents').textContent = '0';
        document.getElementById('averageDuration').textContent = '0ms';
        
        document.getElementById('componentsList').innerHTML = '';
        document.getElementById('debugOutput').textContent = '準備採集...';
        
        this.updateStatus('準備採集指紋...', 'ready');
    }

    // 更新狀態
    updateStatus(text, className) {
        const statusElement = document.getElementById('userStatus');
        const textElement = document.getElementById('userStatusText');
        
        statusElement.className = `user-status ${className}`;
        textElement.textContent = text;
    }

    // 顯示錯誤
    showError(message) {
        console.error(message);
        this.updateStatus(message, 'error');
    }

    // 禁用/啟用按鈕
    disableButton(buttonId, disabled) {
        const button = document.getElementById(buttonId);
        button.disabled = disabled;
        button.textContent = disabled ? '採集中...' : '開始採集指紋';
    }

    // 檢查認證狀態
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                const data = await response.json();
                if (data.loggedIn && data.user) {
                    this.currentUser = data.user;
                    this.updateUserDisplay();
                } else {
                    this.currentUser = null;
                    this.updateUserDisplay();
                }
            }
        } catch (error) {
            console.log('未登入或會話過期');
            this.currentUser = null;
            this.updateUserDisplay();
        }
    }

    // 更新用戶顯示
    updateUserDisplay() {
        const userSection = document.getElementById('userSection');
        
        if (this.currentUser) {
            userSection.innerHTML = `
                <div class="user-info">
                    <h4>已登入</h4>
                    <p>用戶ID: ${this.currentUser.id}</p>
                    <p>用戶名: ${this.currentUser.username}</p>
                    <button class="logout-btn" onclick="app.logout()">登出</button>
                </div>
            `;
        } else {
            userSection.innerHTML = `
                <div class="user-info">
                    <h4>未登入</h4>
                    <p>訪客模式</p>
                </div>
            `;
        }
    }

    // 顯示隱私同意視窗
    showPrivacyModal() {
        const privacyModal = document.getElementById('privacyModal');
        privacyModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    // 關閉隱私同意視窗
    closePrivacyModal() {
        const privacyModal = document.getElementById('privacyModal');
        privacyModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    // 同意隱私聲明
    agreeToPrivacy() {
        this.closePrivacyModal();
        this.collectFingerprint();
    }

    // 不同意隱私聲明
    disagreeToPrivacy() {
        this.closePrivacyModal();
        this.updateStatus('已取消指紋採集', 'ready');
    }

    // 顯示認證彈出視窗
    showAuthModal() {
        const authModal = document.getElementById('authModal');
        const modalTitle = document.getElementById('modalTitle');
        
        // 預設顯示登入表單
        this.showLoginForm();
        modalTitle.textContent = '用戶登入';
        
        // 顯示彈出視窗
        authModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // 防止背景滾動
    }

    // 關閉認證彈出視窗
    closeAuthModal() {
        const authModal = document.getElementById('authModal');
        
        // 隱藏彈出視窗
        authModal.classList.remove('show');
        document.body.style.overflow = ''; // 恢復背景滾動
        
        // 清空表單
        this.clearAuthForms();
    }

    // 清空認證表單
    clearAuthForms() {
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // 重置 reCAPTCHA
        if (this.loginRecaptchaId !== null) {
            grecaptcha.reset(this.loginRecaptchaId);
        }
        if (this.registerRecaptchaId !== null) {
            grecaptcha.reset(this.registerRecaptchaId);
        }
    }

    // 顯示登入表單
    showLoginForm() {
        const modalTitle = document.getElementById('modalTitle');
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        modalTitle.textContent = '用戶登入';
        // 重置 reCAPTCHA
        if (this.loginRecaptchaId !== null) {
            grecaptcha.reset(this.loginRecaptchaId);
        }
    }

    // 顯示註冊表單
    showRegisterForm() {
        const modalTitle = document.getElementById('modalTitle');
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        modalTitle.textContent = '用戶註冊';
        // 重置 reCAPTCHA
        if (this.registerRecaptchaId !== null) {
            grecaptcha.reset(this.registerRecaptchaId);
        }
    }

    // 登入
    async login() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const recaptchaResponse = this.loginRecaptchaId !== null ? grecaptcha.getResponse(this.loginRecaptchaId) : '';

        if (!username || !password) {
            alert('請輸入用戶名和密碼');
            return;
        }
        
        if (!recaptchaResponse) {
            alert('請完成 reCAPTCHA 驗證');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, recaptcha: recaptchaResponse })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.updateUserDisplay();
                this.closeAuthModal();
                this.updateStatus(`歡迎回來，${data.user.username}！`, 'logged-in-user');
            } else {
                alert(data.error || '登入失敗');
            }
        } catch (error) {
            console.error('登入錯誤:', error);
            alert('登入失敗，請稍後再試');
        }
    }

    // 註冊
    async register() {
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const recaptchaResponse = this.registerRecaptchaId !== null ? grecaptcha.getResponse(this.registerRecaptchaId) : '';

        if (!username || !password || !confirmPassword) {
            alert('請填寫所有欄位');
            return;
        }

        if (password !== confirmPassword) {
            alert('兩次輸入的密碼不一致');
            return;
        }

        if (password.length < 6) {
            alert('密碼長度至少需要6個字符');
            return;
        }
        
        if (!recaptchaResponse) {
            alert('請完成 reCAPTCHA 驗證');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, recaptcha: recaptchaResponse })
            });

            const data = await response.json();

            if (response.ok) {
                alert('註冊成功！請登入');
                this.showLoginForm();
                
                // 清空表單和 reCAPTCHA
                document.getElementById('registerUsername').value = '';
                document.getElementById('registerPassword').value = '';
                document.getElementById('confirmPassword').value = '';
                if (this.registerRecaptchaId !== null) {
                    grecaptcha.reset(this.registerRecaptchaId);
                }
            } else {
                alert(data.error || '註冊失敗');
            }
        } catch (error) {
            console.error('註冊錯誤:', error);
            alert('註冊失敗，請稍後再試');
        }
    }

    // 登出
    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.currentUser = null;
            this.updateUserDisplay();
            this.updateStatus('已登出', 'ready');
        } catch (error) {
            console.error('登出錯誤:', error);
        }
    }

    // 初始化 reCAPTCHA
    initRecaptcha() {
        // 等待 reCAPTCHA API 載入完成
        const waitForRecaptcha = () => {
            if (typeof grecaptcha !== 'undefined') {
                // 手動渲染 reCAPTCHA 組件
                try {
                    this.loginRecaptchaId = grecaptcha.render('loginRecaptcha', {
                        'sitekey': '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
                    });
                    
                    this.registerRecaptchaId = grecaptcha.render('registerRecaptcha', {
                        'sitekey': '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
                    });
                    
                    console.log('reCAPTCHA 初始化完成');
                } catch (error) {
                    console.error('reCAPTCHA 初始化失敗:', error);
                }
            } else {
                // 如果 reCAPTCHA 尚未載入，等待一段時間後重試
                setTimeout(waitForRecaptcha, 1000);
            }
        };
        
        // 延遲執行以確保 DOM 已載入
        setTimeout(waitForRecaptcha, 1000);
    }

}

// 避免重複初始化
let app = null;

// 初始化應用程式 - 改用 window.onload 確保所有資源載入完成
window.addEventListener('load', () => {
    if (!app) {
        console.log('頁面完全載入，開始初始化應用程式');
        app = new FingerprintApp();
    }
});

// 備用初始化方案
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 載入完成，檢查 FingerprintJS 狀態');
    if (typeof FingerprintJS !== 'undefined' && !app) {
        console.log('FingerprintJS 已在 DOMContentLoaded 時可用，提前初始化');
        app = new FingerprintApp();
    }
});
