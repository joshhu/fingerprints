// 多重指紋採集系統
class MultiFingerprintApp {
    constructor() {
        this.fp = null;
        this.isInitialized = false;
        this.currentUser = null;
        this.loginRecaptchaId = null;
        this.registerRecaptchaId = null;
        this.clientId = null;
        this.fingerprintData = {};
        this.bindEvents();
        this.setupRealTimeUpdates();
        this.checkAuthStatus();
        this.init();
        this.initRecaptcha();
    }

    // 初始化應用程式
    async init() {
        try {
            console.log('正在初始化多重指紋採集系統...');
            this.updateStatus('正在載入指紋採集系統...', 'ready');
            
            // 初始化 Client ID
            this.initClientId();
            
            // 載入 FingerprintJS
            await this.loadFingerprintJS();
            
            // 初始化 Canvas 指紋
            this.initCanvasFingerprint();
            
            this.isInitialized = true;
            console.log('多重指紋採集系統初始化成功');
            
            // 等待 DOM 完全載入後再更新 UI
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.updateStatus('準備就緒，點擊「開始採集指紋」按鈕開始測試', 'ready');
                    this.clearResults();
                });
            } else {
                this.updateStatus('準備就緒，點擊「開始採集指紋」按鈕開始測試', 'ready');
                this.clearResults();
            }
            
        } catch (error) {
            console.error('多重指紋採集系統初始化失敗:', error);
            this.showError('系統初始化失敗: ' + error.message);
        }
    }

    // 初始化 Client ID
    initClientId() {
        try {
            // 從 localStorage 取得或生成新的 Client ID
            this.clientId = localStorage.getItem('fingerprint_client_id');
            if (!this.clientId) {
                this.clientId = this.generateClientId();
                localStorage.setItem('fingerprint_client_id', this.clientId);
            }
            console.log('Client ID 初始化完成:', this.clientId);
        } catch (error) {
            console.error('Client ID 初始化失敗:', error);
            this.clientId = this.generateClientId();
        }
    }

    // 生成 Client ID
    generateClientId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const userAgent = navigator.userAgent.substring(0, 10);
        return `${timestamp}_${random}_${userAgent}`;
    }

    // 載入 FingerprintJS
    async loadFingerprintJS() {
        try {
            if (window.fingerprintLoader) {
                console.log('使用 FingerprintLoader 載入 FingerprintJS...');
                await window.fingerprintLoader.load();
            } else {
                await this.waitForFingerprintJS();
            }

            if (typeof FingerprintJS === 'undefined') {
                throw new Error('FingerprintJS 載入失敗');
            }

            this.fp = await FingerprintJS.load();
            console.log('FingerprintJS V4 載入成功');
        } catch (error) {
            console.error('FingerprintJS 載入失敗:', error);
            throw error;
        }
    }

    // 等待 FingerprintJS 載入
    async waitForFingerprintJS() {
        let attempts = 0;
        const maxAttempts = 30;
        
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
        
        throw new Error('FingerprintJS 載入超時');
    }

    // 初始化 Canvas 指紋
    initCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 設定 Canvas 大小
            canvas.width = 200;
            canvas.height = 200;
            
            // 繪製複雜的圖形來產生獨特的指紋
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 200, 200);
            
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(10, 10, 50, 50);
            
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(70, 70, 50, 50);
            
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(130, 130, 50, 50);
            
            // 添加文字
            ctx.fillStyle = '#000000';
            ctx.font = '16px Arial';
            ctx.fillText('Canvas Fingerprint', 10, 180);
            
            // 添加複雜的圖形
            ctx.beginPath();
            ctx.arc(100, 100, 30, 0, 2 * Math.PI);
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // 取得 Canvas 指紋
            const canvasFingerprint = canvas.toDataURL();
            this.fingerprintData.canvas = canvasFingerprint;
            
            console.log('Canvas 指紋初始化完成');
        } catch (error) {
            console.error('Canvas 指紋初始化失敗:', error);
            this.fingerprintData.canvas = 'error';
        }
    }

    // 採集多重指紋
    async collectMultiFingerprint() {
        try {
            this.updateStatus('正在採集多重指紋...', 'collecting');
            this.disableButton('collectBtn');
            
            const startTime = Date.now();
            const fingerprintData = {
                timestamp: startTime,
                clientId: this.clientId,
                collectionTime: 0,
                components: {}
            };

            // 1. 採集 FingerprintJS V4 指紋
            console.log('採集 FingerprintJS V4 指紋...');
            if (this.fp) {
                const result = await this.fp.get();
                fingerprintData.visitorId = result.visitorId;
                fingerprintData.confidence = result.confidence;
                fingerprintData.version = result.version;
                fingerprintData.components = result.components;
                console.log('FingerprintJS V4 指紋採集完成');
            }

            // 2. 採集自定義指紋
            console.log('採集自定義指紋...');
            const customFingerprint = await this.collectCustomFingerprint();
            fingerprintData.custom = customFingerprint;

            // 3. 採集 Canvas 指紋
            console.log('採集 Canvas 指紋...');
            fingerprintData.canvas = this.fingerprintData.canvas;

            // 4. 採集 WebGL 指紋
            console.log('採集 WebGL 指紋...');
            fingerprintData.webgl = this.collectWebGLFingerprint();

            // 5. 採集音訊指紋
            console.log('採集音訊指紋...');
            fingerprintData.audio = await this.collectAudioFingerprint();

            // 6. 採集字體指紋
            console.log('採集字體指紋...');
            fingerprintData.fonts = this.collectFontFingerprint();

            // 7. 採集插件指紋
            console.log('採集插件指紋...');
            fingerprintData.plugins = this.collectPluginFingerprint();

            // 8. 採集硬體指紋
            console.log('採集硬體指紋...');
            fingerprintData.hardware = await this.collectHardwareFingerprint();

            // 計算採集時間
            fingerprintData.collectionTime = Date.now() - startTime;

            // 更新系統資訊顯示
            this.updateSystemInfoDisplay(fingerprintData);
            
            // 更新 FingerprintJS V4 結果顯示
            this.updateFingerprintJSDisplay(fingerprintData);
            
            // 更新調試資訊
            this.updateDebugInfo(fingerprintData);
            
            // 顯示結果
            this.displayMultiFingerprintResults(fingerprintData);
            
            // 發送到伺服器
            await this.sendMultiFingerprintToServer(fingerprintData);
            
            this.updateStatus('多重指紋採集完成！', 'success');
            
        } catch (error) {
            console.error('多重指紋採集失敗:', error);
            this.showError('指紋採集失敗: ' + error.message);
        } finally {
            this.enableButton('collectBtn');
        }
    }

    // 採集自定義指紋
    async collectCustomFingerprint() {
        const custom = {};
        
        try {
            // 基本瀏覽器資訊
            custom.userAgent = navigator.userAgent;
            custom.language = navigator.language;
            custom.languages = navigator.languages;
            custom.platform = navigator.platform;
            custom.cookieEnabled = navigator.cookieEnabled;
            custom.onLine = navigator.onLine;
            custom.hardwareConcurrency = navigator.hardwareConcurrency;
            custom.deviceMemory = navigator.deviceMemory;
            custom.maxTouchPoints = navigator.maxTouchPoints;
            
            // 螢幕資訊
            custom.screen = {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            };
            
            // 視窗資訊
            custom.window = {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                outerWidth: window.outerWidth,
                outerHeight: window.outerHeight,
                devicePixelRatio: window.devicePixelRatio
            };
            
            // 時區和時間
            custom.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            custom.timezoneOffset = new Date().getTimezoneOffset();
            
            // 本地化設定
            custom.locale = Intl.DateTimeFormat().resolvedOptions().locale;
            custom.numberFormat = Intl.NumberFormat().resolvedOptions().locale;
            
            // 電池資訊（如果可用）
            if (navigator.getBattery) {
                try {
                    const battery = await navigator.getBattery();
                    custom.battery = {
                        level: battery.level,
                        charging: battery.charging
                    };
                } catch (batteryError) {
                    custom.battery = 'not_supported';
                }
            } else {
                custom.battery = 'not_supported';
            }
            
            // 連接資訊
            if (navigator.connection) {
                custom.connection = {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt
                };
            }
            
        } catch (error) {
            console.error('自定義指紋採集錯誤:', error);
            custom.error = error.message;
        }
        
        return custom;
    }

    // 採集 WebGL 指紋
    collectWebGLFingerprint() {
        const webgl = {};
        
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl) {
                // 基本資訊
                webgl.vendor = gl.getParameter(gl.VENDOR);
                webgl.renderer = gl.getParameter(gl.RENDERER);
                webgl.version = gl.getParameter(gl.VERSION);
                
                // 擴展資訊
                const extensions = gl.getSupportedExtensions();
                webgl.extensions = extensions;
                
                // 參數資訊
                webgl.parameters = {
                    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
                    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
                    aliasedLineWidthRange: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE),
                    aliasedPointSizeRange: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)
                };
                
                // 繪製測試圖形
                gl.clearColor(0.2, 0.3, 0.4, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                
                // 取得像素資料
                const pixels = new Uint8Array(4);
                gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                webgl.pixelData = Array.from(pixels);
                
            } else {
                webgl.error = 'WebGL not supported';
            }
            
        } catch (error) {
            console.error('WebGL 指紋採集錯誤:', error);
            webgl.error = error.message;
        }
        
        return webgl;
    }

    // 採集音訊指紋
    async collectAudioFingerprint() {
        const audio = {};
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 基本資訊
            audio.sampleRate = audioContext.sampleRate;
            audio.state = audioContext.state;
            
            // 如果 AudioContext 被暫停，嘗試恢復
            if (audioContext.state === 'suspended') {
                try {
                    await audioContext.resume();
                } catch (resumeError) {
                    console.warn('無法恢復 AudioContext:', resumeError);
                    audio.fingerprint = 'context_suspended';
                    return audio;
                }
            }
            
            // 創建振盪器
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 設定參數
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            
            // 開始和停止
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            
            // 等待一小段時間讓音訊處理完成
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // 取得頻率資料
            const frequencyData = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(frequencyData);
            
            // 計算雜湊
            let hash = 0;
            for (let i = 0; i < frequencyData.length; i++) {
                hash = ((hash << 5) - hash) + frequencyData[i];
                hash = hash & hash; // 轉換為 32 位整數
            }
            
            audio.fingerprint = hash.toString(16);
            
            // 關閉音訊上下文
            try {
                await audioContext.close();
            } catch (closeError) {
                console.warn('關閉 AudioContext 失敗:', closeError);
            }
            
        } catch (error) {
            console.error('音訊指紋採集錯誤:', error);
            audio.error = error.message;
            audio.fingerprint = 'error';
        }
        
        return audio;
    }

    // 採集字體指紋
    collectFontFingerprint() {
        const fonts = {};
        
        try {
            // 測試字體列表
            const testFonts = [
                'Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New',
                'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
                'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Console',
                'Tahoma', 'Geneva', 'Lucida Sans Unicode', 'Franklin Gothic Medium',
                'Arial Narrow', 'Brush Script MT'
            ];
            
            const testString = 'mmmmmmmmmmlli';
            const testSize = '72px';
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // 基準字體
            context.font = testSize + ' monospace';
            const baseWidth = context.measureText(testString).width;
            
            const availableFonts = [];
            
            testFonts.forEach(font => {
                context.font = testSize + ' ' + font + ', monospace';
                const width = context.measureText(testString).width;
                
                if (width !== baseWidth) {
                    availableFonts.push(font);
                }
            });
            
            fonts.available = availableFonts;
            fonts.count = availableFonts.length;
            
        } catch (error) {
            console.error('字體指紋採集錯誤:', error);
            fonts.error = error.message;
        }
        
        return fonts;
    }

    // 採集插件指紋
    collectPluginFingerprint() {
        const plugins = {};
        
        try {
            // 瀏覽器插件
            if (navigator.plugins) {
                const pluginList = [];
                for (let i = 0; i < navigator.plugins.length; i++) {
                    const plugin = navigator.plugins[i];
                    pluginList.push({
                        name: plugin.name,
                        description: plugin.description,
                        filename: plugin.filename
                    });
                }
                plugins.browser = pluginList;
                plugins.count = pluginList.length;
            }
            
            // MIME 類型
            if (navigator.mimeTypes) {
                const mimeList = [];
                for (let i = 0; i < navigator.mimeTypes.length; i++) {
                    const mime = navigator.mimeTypes[i];
                    mimeList.push({
                        type: mime.type,
                        description: mime.description,
                        enabledPlugin: mime.enabledPlugin ? mime.enabledPlugin.name : null
                    });
                }
                plugins.mimeTypes = mimeList;
            }
            
        } catch (error) {
            console.error('插件指紋採集錯誤:', error);
            plugins.error = error.message;
        }
        
        return plugins;
    }

    // 採集硬體指紋
    async collectHardwareFingerprint() {
        const hardware = {};
        
        try {
            // CPU 核心數
            hardware.cores = navigator.hardwareConcurrency || 'unknown';
            
            // 記憶體
            hardware.memory = navigator.deviceMemory || 'unknown';
            
            // 觸控點數
            hardware.touchPoints = navigator.maxTouchPoints || 0;
            
            // 電池資訊
            if (navigator.getBattery) {
                try {
                    const battery = await navigator.getBattery();
                    hardware.battery = {
                        level: battery.level,
                        charging: battery.charging,
                        chargingTime: battery.chargingTime,
                        dischargingTime: battery.dischargingTime
                    };
                } catch (batteryError) {
                    hardware.battery = 'not_supported';
                }
            } else {
                hardware.battery = 'not_supported';
            }
            
            // 網路連接
            if (navigator.connection) {
                hardware.connection = {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt,
                    saveData: navigator.connection.saveData
                };
            }
            
            // 感測器支援
            hardware.sensors = {
                accelerometer: 'Accelerometer' in window,
                gyroscope: 'Gyroscope' in window,
                magnetometer: 'Magnetometer' in window,
                absoluteOrientation: 'AbsoluteOrientationSensor' in window,
                relativeOrientation: 'RelativeOrientationSensor' in window
            };
            
        } catch (error) {
            console.error('硬體指紋採集錯誤:', error);
            hardware.error = error.message;
        }
        
        return hardware;
    }

    // 更新系統資訊顯示
    updateSystemInfoDisplay(data) {
        try {
            // 更新使用者代理
            const userAgentElement = document.getElementById('userAgent');
            if (userAgentElement && data.custom?.userAgent) {
                userAgentElement.textContent = data.custom.userAgent.substring(0, 50) + '...';
            }
            
            // 更新螢幕解析度
            const screenResolutionElement = document.getElementById('screenResolution');
            if (screenResolutionElement && data.custom?.screen) {
                screenResolutionElement.textContent = `${data.custom.screen.width} × ${data.custom.screen.height}`;
            }
            
            // 更新瀏覽器視窗
            const viewportSizeElement = document.getElementById('viewportSize');
            if (viewportSizeElement && data.custom?.window) {
                viewportSizeElement.textContent = `${data.custom.window.innerWidth} × ${data.custom.window.innerHeight}`;
            }
            
            // 更新時區
            const timezoneElement = document.getElementById('timezone');
            if (timezoneElement && data.custom?.timezone) {
                timezoneElement.textContent = data.custom.timezone;
            }
            
            // 更新語言偏好
            const languageElement = document.getElementById('language');
            if (languageElement && data.custom?.language) {
                languageElement.textContent = data.custom.language;
            }
            
            // 更新作業系統
            const platformElement = document.getElementById('platform');
            if (platformElement && data.custom?.platform) {
                platformElement.textContent = data.custom.platform;
            }
            
            // 更新 CPU 核心數
            const hardwareConcurrencyElement = document.getElementById('hardwareConcurrency');
            if (hardwareConcurrencyElement && data.custom?.hardwareConcurrency) {
                hardwareConcurrencyElement.textContent = `${data.custom.hardwareConcurrency} 核心`;
            }
            
            // 更新裝置記憶體
            const deviceMemoryElement = document.getElementById('deviceMemory');
            if (deviceMemoryElement && data.custom?.deviceMemory) {
                deviceMemoryElement.textContent = `${data.custom.deviceMemory} GB`;
            }
            
            // 更新元件統計
            const totalComponentsElement = document.getElementById('totalComponents');
            const successfulComponentsElement = document.getElementById('successfulComponents');
            const failedComponentsElement = document.getElementById('failedComponents');
            const averageDurationElement = document.getElementById('averageDuration');
            
            if (data.components) {
                const totalComponents = Object.keys(data.components).length;
                const successfulComponents = Object.values(data.components).filter(comp => !comp.error).length;
                const failedComponents = totalComponents - successfulComponents;
                
                if (totalComponentsElement) totalComponentsElement.textContent = totalComponents;
                if (successfulComponentsElement) successfulComponentsElement.textContent = successfulComponents;
                if (failedComponentsElement) failedComponentsElement.textContent = failedComponents;
                if (averageDurationElement) averageDurationElement.textContent = `${data.collectionTime}ms`;
            }
            
        } catch (error) {
            console.error('更新系統資訊顯示失敗:', error);
        }
    }

    // 重置系統資訊顯示
    resetSystemInfoDisplay() {
        try {
            const elements = [
                'userAgent', 'screenResolution', 'viewportSize', 'timezone', 
                'language', 'platform', 'hardwareConcurrency', 'deviceMemory',
                'totalComponents', 'successfulComponents', 'failedComponents', 'averageDuration'
            ];
            
            elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    if (id === 'totalComponents' || id === 'successfulComponents' || id === 'failedComponents') {
                        element.textContent = '0';
                    } else if (id === 'averageDuration') {
                        element.textContent = '0ms';
                    } else {
                        element.textContent = '尚未採集';
                    }
                }
            });
            
            // 重置 FingerprintJS V4 結果顯示
            const fingerprintIds = ['visitorId', 'confidence', 'version', 'collectionTime'];
            fingerprintIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = '尚未採集';
                }
            });
            
            // 重置調試資訊
            const debugOutput = document.getElementById('debugOutput');
            if (debugOutput) {
                debugOutput.textContent = '準備採集...';
            }
            
        } catch (error) {
            console.error('重置系統資訊顯示失敗:', error);
        }
    }

    // 更新 FingerprintJS V4 結果顯示
    updateFingerprintJSDisplay(data) {
        try {
            // 更新訪客 ID
            const visitorIdElement = document.getElementById('visitorId');
            if (visitorIdElement && data.visitorId) {
                visitorIdElement.textContent = data.visitorId;
            }
            
            // 更新信心度
            const confidenceElement = document.getElementById('confidence');
            if (confidenceElement && data.confidence) {
                confidenceElement.textContent = data.confidence;
            }
            
            // 更新版本
            const versionElement = document.getElementById('version');
            if (versionElement && data.version) {
                versionElement.textContent = data.version;
            }
            
            // 更新採集時間
            const collectionTimeElement = document.getElementById('collectionTime');
            if (collectionTimeElement && data.collectionTime) {
                collectionTimeElement.textContent = `${data.collectionTime}ms`;
            }
            
        } catch (error) {
            console.error('更新 FingerprintJS V4 顯示失敗:', error);
        }
    }

    // 更新調試資訊
    updateDebugInfo(data) {
        try {
            const debugOutput = document.getElementById('debugOutput');
            if (debugOutput) {
                const debugInfo = {
                    timestamp: new Date().toISOString(),
                    visitorId: data.visitorId,
                    confidence: data.confidence,
                    collectionTime: data.collectionTime,
                    components: data.components ? Object.keys(data.components).length : 0,
                    custom: data.custom ? '已採集' : '未採集',
                    canvas: data.canvas ? '已採集' : '未採集',
                    webgl: data.webgl ? '已採集' : '未採集',
                    audio: data.audio ? '已採集' : '未採集',
                    fonts: data.fonts ? `已採集 (${data.fonts.count} 個字體)` : '未採集',
                    plugins: data.plugins ? `已採集 (${data.plugins.count} 個插件)` : '未採集',
                    hardware: data.hardware ? '已採集' : '未採集'
                };
                
                debugOutput.textContent = JSON.stringify(debugInfo, null, 2);
            }
        } catch (error) {
            console.error('更新調試資訊失敗:', error);
        }
    }

    // 顯示多重指紋結果
    displayMultiFingerprintResults(data) {
        const resultContainer = document.getElementById('componentsList');
        
        if (!resultContainer) {
            console.error('找不到 componentsList 元素');
            return;
        }
        
        let html = `
            <div class="fingerprintjs-section">
                <h3>FingerprintJS V4 結果</h3>
                <div class="result-grid">
                    <div class="result-item">
                        <strong>訪客 ID:</strong> <span class="highlight">${data.visitorId || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <strong>信心度:</strong> <span class="highlight">${data.confidence || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <strong>版本:</strong> <span class="highlight">${data.version || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <strong>採集時間:</strong> <span class="highlight">${data.collectionTime}ms</span>
                    </div>
                </div>
            </div>

            <div class="fingerprintjs-section">
                <h3>Client ID</h3>
                <div class="result-item">
                    <strong>ID:</strong> <span class="highlight">${data.clientId}</span>
                </div>
            </div>

            <div class="fingerprintjs-section">
                <h3>Canvas 指紋</h3>
                <div class="result-item">
                    <strong>雜湊:</strong> <span class="highlight">${this.hashString(data.canvas || 'N/A')}</span>
                </div>
                <div class="canvas-preview">
                    <img src="${data.canvas || ''}" alt="Canvas 預覽" style="max-width: 200px; border: 1px solid #ddd;">
                </div>
            </div>

            <div class="fingerprintjs-section">
                <h3>WebGL 指紋</h3>
                <div class="result-grid">
                    <div class="result-item">
                        <strong>渲染器:</strong> <span class="highlight">${data.webgl?.renderer || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <strong>供應商:</strong> <span class="highlight">${data.webgl?.vendor || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <strong>版本:</strong> <span class="highlight">${data.webgl?.version || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <strong>擴展數量:</strong> <span class="highlight">${data.webgl?.extensions?.length || 0}</span>
                    </div>
                </div>
            </div>

            <div class="fingerprintjs-section">
                <h3>音訊指紋</h3>
                <div class="result-item">
                    <strong>指紋:</strong> <span class="highlight">${data.audio?.fingerprint || 'N/A'}</span>
                </div>
                <div class="result-item">
                    <strong>採樣率:</strong> <span class="highlight">${data.audio?.sampleRate || 'N/A'}</span>
                </div>
            </div>

            <div class="fingerprintjs-section">
                <h3>字體指紋</h3>
                <div class="result-item">
                    <strong>可用字體數量:</strong> <span class="highlight">${data.fonts?.count || 0}</span>
                </div>
                <div class="components-list">
                    ${(data.fonts?.available || []).slice(0, 10).map(font => 
                        `<div class="component-item">${font}</div>`
                    ).join('')}
                    ${data.fonts?.available?.length > 10 ? `<div class="component-item">... 還有 ${data.fonts.available.length - 10} 個字體</div>` : ''}
                </div>
            </div>

            <div class="fingerprintjs-section">
                <h3>插件指紋</h3>
                <div class="result-item">
                    <strong>插件數量:</strong> <span class="highlight">${data.plugins?.count || 0}</span>
                </div>
                <div class="components-list">
                    ${(data.plugins?.browser || []).slice(0, 5).map(plugin => 
                        `<div class="component-item">${plugin.name}</div>`
                    ).join('')}
                    ${data.plugins?.browser?.length > 5 ? `<div class="component-item">... 還有 ${data.plugins.browser.length - 5} 個插件</div>` : ''}
                </div>
            </div>

            <div class="fingerprintjs-section">
                <h3>硬體指紋</h3>
                <div class="result-grid">
                    <div class="result-item">
                        <strong>CPU 核心:</strong> <span class="highlight">${data.hardware?.cores || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <strong>記憶體:</strong> <span class="highlight">${data.hardware?.memory || 'N/A'} GB</span>
                    </div>
                    <div class="result-item">
                        <strong>觸控點:</strong> <span class="highlight">${data.hardware?.touchPoints || 0}</span>
                    </div>
                </div>
            </div>

            <div class="fingerprintjs-section">
                <h3>自定義指紋統計</h3>
                <div class="result-grid">
                    <div class="result-item">
                        <strong>螢幕解析度:</strong> <span class="highlight">${data.custom?.screen?.width || 'N/A'} x ${data.custom?.screen?.height || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <strong>視窗大小:</strong> <span class="highlight">${data.custom?.window?.innerWidth || 'N/A'} x ${data.custom?.window?.innerHeight || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <strong>像素密度:</strong> <span class="highlight">${data.custom?.window?.devicePixelRatio || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <strong>時區:</strong> <span class="highlight">${data.custom?.timezone || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;

        resultContainer.innerHTML = html;
    }

    // 雜湊字串
    hashString(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString(16);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 轉換為 32 位整數
        }
        return hash.toString(16);
    }

    // 發送多重指紋到伺服器
    async sendMultiFingerprintToServer(data) {
        try {
            const response = await fetch('/api/fingerprint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    visitorId: data.visitorId,
                    confidence: data.confidence,
                    version: data.version,
                    components: data.components,
                    clientId: data.clientId,
                    custom: data.custom,
                    canvas: data.canvas,
                    webgl: data.webgl,
                    audio: data.audio,
                    fonts: data.fonts,
                    plugins: data.plugins,
                    hardware: data.hardware,
                    collectionTime: data.collectionTime
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                if (result.isLoggedIn) {
                    this.updateStatus(result.message, 'logged-in-user');
                } else if (result.isGuest && result.topMatches) {
                    this.updateStatus(result.message, 'smart-correlation');
                } else if (result.isGuest) {
                    this.updateStatus(result.message, 'new-user');
                }
            } else {
                this.showError(result.error || '發送失敗');
            }
        } catch (error) {
            console.error('發送指紋資料失敗:', error);
            this.showError('發送失敗: ' + error.message);
        }
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
                }
                if (privacyModal.classList.contains('show')) {
                    this.closePrivacyModal();
                }
            }
        });
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
        this.collectMultiFingerprint();
    }

    // 不同意隱私聲明
    disagreeToPrivacy() {
        this.closePrivacyModal();
        this.updateStatus('已取消指紋採集', 'cancelled');
    }

    // 顯示認證彈出視窗
    showAuthModal() {
        const authModal = document.getElementById('authModal');
        const modalTitle = document.getElementById('modalTitle');
        
        this.showLoginForm();
        modalTitle.textContent = '用戶登入';
        
        authModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    // 關閉認證彈出視窗
    closeAuthModal() {
        const authModal = document.getElementById('authModal');
        authModal.classList.remove('show');
        document.body.style.overflow = '';
        
        // 清空表單
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        
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
    }

    // 顯示註冊表單
    showRegisterForm() {
        const modalTitle = document.getElementById('modalTitle');
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        modalTitle.textContent = '用戶註冊';
    }

    // 清除結果
    clearResults() {
        const resultContainer = document.getElementById('componentsList');
        if (resultContainer) {
            resultContainer.innerHTML = '';
        }
        
        // 重置系統資訊顯示
        this.resetSystemInfoDisplay();
        
        this.updateStatus('準備就緒，點擊「開始採集指紋」按鈕開始測試', 'ready');
    }

    // 更新狀態
    updateStatus(message, className = 'ready') {
        const statusElement = document.getElementById('userStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `user-status ${className}`;
        } else {
            console.warn('找不到 userStatus 元素');
        }
    }

    // 顯示錯誤
    showError(message) {
        this.updateStatus('錯誤: ' + message, 'error');
    }

    // 禁用按鈕
    disableButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.textContent = '採集中...';
        }
    }

    // 啟用按鈕
    enableButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            button.textContent = '開始採集指紋';
        }
    }

    // 設定即時更新
    setupRealTimeUpdates() {
        const updateViewportSize = () => {
            const viewportInfo = document.getElementById('viewportInfo');
            if (viewportInfo) {
                viewportInfo.textContent = `${window.innerWidth} × ${window.innerHeight}`;
            }
        };

        window.addEventListener('resize', updateViewportSize);
        updateViewportSize();
    }

    // 檢查認證狀態
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateUserDisplay();
            }
        } catch (error) {
            console.error('檢查認證狀態失敗:', error);
        }
    }

    // 更新用戶顯示
    updateUserDisplay() {
        const userStatus = document.getElementById('userStatus');
        if (userStatus) {
            if (this.currentUser) {
                userStatus.textContent = `已登入: ${this.currentUser.username}`;
                userStatus.className = 'user-status logged-in-user';
            } else {
                userStatus.textContent = '未登入';
                userStatus.className = 'user-status ready';
            }
        } else {
            console.warn('找不到 userStatus 元素');
        }
    }

    // 登入
    async login() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const recaptchaResponse = grecaptcha.getResponse(this.loginRecaptchaId);

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
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    recaptchaResponse
                })
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
            console.error('登入失敗:', error);
            alert('登入失敗: ' + error.message);
        }
    }

    // 註冊
    async register() {
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const recaptchaResponse = grecaptcha.getResponse(this.registerRecaptchaId);

        if (!username || !password) {
            alert('請輸入用戶名和密碼');
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
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    recaptchaResponse
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.user;
                this.updateUserDisplay();
                this.closeAuthModal();
                this.updateStatus(`註冊成功，歡迎 ${data.user.username}！`, 'logged-in-user');
            } else {
                alert(data.error || '註冊失敗');
            }
        } catch (error) {
            console.error('註冊失敗:', error);
            alert('註冊失敗: ' + error.message);
        }
    }

    // 登出
    async logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });

            if (response.ok) {
                this.currentUser = null;
                this.updateUserDisplay();
                this.updateStatus('已登出', 'ready');
            }
        } catch (error) {
            console.error('登出失敗:', error);
        }
    }

    // 初始化 reCAPTCHA
    initRecaptcha() {
        if (typeof grecaptcha !== 'undefined') {
            this.loginRecaptchaId = grecaptcha.render('loginRecaptcha', {
                sitekey: '6LcQZXYpAAAAAJqXjqXjqXjqXjqXjqXjqXjqXjqXj',
                callback: () => {}
            });
            
            this.registerRecaptchaId = grecaptcha.render('registerRecaptcha', {
                sitekey: '6LcQZXYpAAAAAJqXjqXjqXjqXjqXjqXjqXjqXjqXj',
                callback: () => {}
            });
        }
    }
}

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    new MultiFingerprintApp();
});
