const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// reCAPTCHA 配置 (使用測試用的密鑰)
const RECAPTCHA_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // Google 測試用密鑰

// 驗證 reCAPTCHA 的函數
async function verifyRecaptcha(token) {
    try {
        const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
            params: {
                secret: RECAPTCHA_SECRET_KEY,
                response: token
            }
        });
        
        return response.data.success;
    } catch (error) {
        console.error('reCAPTCHA 驗證錯誤:', error);
        return false;
    }
}

// 中間件
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'fingerprint-session-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // 開發環境設為 false
        maxAge: 24 * 60 * 60 * 1000 // 24 小時
    }
}));
app.use(express.static('public'));

// 資料庫初始化
const db = new sqlite3.Database('fingerprints.db');

// 建立資料表
db.serialize(() => {
    // 指紋資料表（重新命名為 fingerprints）
    db.run(`
        CREATE TABLE IF NOT EXISTS fingerprints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitor_id TEXT UNIQUE,
            confidence_score REAL,
            confidence_comment TEXT,
            version TEXT,
            components TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            linked_user_id INTEGER,
            FOREIGN KEY (linked_user_id) REFERENCES accounts(id)
        )
    `);
    
    // 用戶帳號資料表
    db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);
    
    // 資料庫初始化完成
});

console.log('伺服器運行在 http://localhost:' + PORT);
console.log('FingerprintJS V4 指紋採集測試網站已啟動');

// 計算指紋相似度函數
function calculateSimilarity(oldComponents, newComponents) {
    const oldKeys = Object.keys(oldComponents);
    const newKeys = Object.keys(newComponents);
    
    if (oldKeys.length === 0 || newKeys.length === 0) {
        return 0;
    }
    
    let totalComponents = 0;
    let matchingComponents = 0;
    let importantMatches = 0;
    let importantTotal = 0;
    
    // 重要的指紋元件（權重較高）
    const importantComponents = [
        'canvas', 'webgl', 'audio', 'fonts', 'screenResolution', 
        'hardwareConcurrency', 'deviceMemory', 'platform'
    ];
    
    // 容易變化的元件（權重較低或忽略）
    const volatileComponents = ['viewport', 'timezone'];
    
    // 會因為瀏覽器重啟而變化的元件（完全忽略）
    const sessionBasedComponents = ['domBlockers', 'sessionStorage', 'localStorage', 'indexedDB'];
    
    const allKeys = new Set([...oldKeys, ...newKeys]);
    
    for (const key of allKeys) {
        const oldValue = oldComponents[key];
        const newValue = newComponents[key];
        
        // 跳過錯誤的元件和會話相關元件
        if ((oldValue && oldValue.error) || (newValue && newValue.error) || sessionBasedComponents.includes(key)) {
            continue;
        }
        
        totalComponents++;
        const isImportant = importantComponents.includes(key);
        const isVolatile = volatileComponents.includes(key);
        
        if (isImportant) {
            importantTotal++;
        }
        
        // 比較值（忽略 duration 差異）
        if (oldValue && newValue) {
            const oldVal = JSON.stringify(oldValue.value);
            const newVal = JSON.stringify(newValue.value);
            
            if (oldVal === newVal) {
                matchingComponents++;
                if (isImportant) {
                    importantMatches++;
                }
            } else if (isVolatile) {
                // 對於容易變化的元件，給予部分分數
                matchingComponents += 0.5;
            }
        }
    }
    
    if (totalComponents === 0) {
        return 0;
    }
    
    // 計算基本相似度
    const basicSimilarity = (matchingComponents / totalComponents) * 100;
    
    // 如果重要元件匹配度很高，提升整體分數
    const importantSimilarity = importantTotal > 0 ? (importantMatches / importantTotal) * 100 : 100;
    
    // 綜合計算（重要元件權重 70%，一般元件權重 30%）
    const finalSimilarity = (importantSimilarity * 0.7) + (basicSimilarity * 0.3);
    
    return Math.round(finalSimilarity * 10) / 10;
}

// 中間件：檢查是否已登入
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: '未登入' });
    }
}

// 找出變化的元件
function findChangedComponents(oldComponents, newComponents) {
    const changes = [];
    const allKeys = new Set([...Object.keys(oldComponents), ...Object.keys(newComponents)]);
    
    for (const key of allKeys) {
        const oldValue = oldComponents[key];
        const newValue = newComponents[key];
        
        if (!oldValue && newValue) {
            changes.push({ component: key, type: 'added', newValue: newValue.value });
        } else if (oldValue && !newValue) {
            changes.push({ component: key, type: 'removed', oldValue: oldValue.value });
        } else if (oldValue && newValue) {
            const oldVal = JSON.stringify(oldValue.value);
            const newVal = JSON.stringify(newValue.value);
            
            if (oldVal !== newVal) {
                changes.push({ 
                    component: key, 
                    type: 'changed', 
                    oldValue: oldValue.value, 
                    newValue: newValue.value 
                });
            }
        }
    }
    
    return changes;
}

// API 路由：用戶註冊
app.post('/api/auth/register', async (req, res) => {
    const { username, password, recaptcha } = req.body;
    
    // 驗證輸入
    if (!username || !password) {
        return res.status(400).json({ error: '請填寫所有欄位' });
    }
    
    // 驗證 reCAPTCHA
    if (!recaptcha) {
        return res.status(400).json({ error: '請完成 reCAPTCHA 驗證' });
    }
    
    const recaptchaValid = await verifyRecaptcha(recaptcha);
    if (!recaptchaValid) {
        return res.status(400).json({ error: 'reCAPTCHA 驗證失敗，請重試' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ error: '使用者名稱至少需要 3 個字元' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: '密碼至少需要 6 個字元' });
    }
    
    try {
        // 檢查使用者名稱是否已存在
        db.get('SELECT id FROM accounts WHERE username = ?', [username], async (err, existingUser) => {
            if (err) {
                console.error('檢查用戶錯誤:', err);
                return res.status(500).json({ error: '系統錯誤' });
            }
            
            if (existingUser) {
                return res.status(400).json({ error: '使用者名稱已存在' });
            }
            
            // 加密密碼
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            // 建立新用戶
            db.run(
                'INSERT INTO accounts (username, password_hash) VALUES (?, ?)',
                [username, hashedPassword],
                function(insertErr) {
                    if (insertErr) {
                        console.error('建立用戶錯誤:', insertErr);
                        return res.status(500).json({ error: '註冊失敗' });
                    }
                    
                    console.log('新用戶註冊成功:', { id: this.lastID, username });
                    res.json({
                        success: true,
                        message: '註冊成功！',
                        userId: this.lastID
                    });
                }
            );
        });
    } catch (error) {
        console.error('註冊錯誤:', error);
        res.status(500).json({ error: '註冊失敗' });
    }
});

// API 路由：用戶登入
app.post('/api/auth/login', async (req, res) => {
    const { username, password, recaptcha } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: '請輸入使用者名稱和密碼' });
    }
    
    // 驗證 reCAPTCHA
    if (!recaptcha) {
        return res.status(400).json({ error: '請完成 reCAPTCHA 驗證' });
    }
    
    const recaptchaValid = await verifyRecaptcha(recaptcha);
    if (!recaptchaValid) {
        return res.status(400).json({ error: 'reCAPTCHA 驗證失敗，請重試' });
    }
    
    // 查找用戶
    db.get('SELECT * FROM accounts WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('登入查詢錯誤:', err);
            return res.status(500).json({ error: '登入失敗' });
        }
        
        if (!user) {
            return res.status(401).json({ error: '使用者名稱或密碼錯誤' });
        }
        
        try {
            // 驗證密碼
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            
            if (!passwordMatch) {
                return res.status(401).json({ error: '使用者名稱或密碼錯誤' });
            }
            
            // 設定 session
            req.session.userId = user.id;
            req.session.username = user.username;
            
            // 更新最後登入時間
            db.run('UPDATE accounts SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            
            console.log('用戶登入成功:', { id: user.id, username: user.username });
            
            res.json({
                success: true,
                message: '登入成功！',
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        } catch (error) {
            console.error('密碼驗證錯誤:', error);
            res.status(500).json({ error: '登入失敗' });
        }
    });
});

// API 路由：用戶登出
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('登出錯誤:', err);
            return res.status(500).json({ error: '登出失敗' });
        }
        
        res.json({ success: true, message: '登出成功！' });
    });
});

// API 路由：獲取當前用戶資訊
app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId) {
        return res.json({ loggedIn: false });
    }
    
    db.get('SELECT id, username, created_at, last_login FROM accounts WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user) {
            return res.json({ loggedIn: false });
        }
        
        res.json({
            loggedIn: true,
            user: {
                id: user.id,
                username: user.username,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });
    });
});

// API 路由：處理指紋資料
app.post('/api/fingerprint', (req, res) => {
    const { visitorId, confidence, version, components, timestamp } = req.body;

    if (!visitorId) {
        return res.status(400).json({ error: '缺少訪客 ID' });
    }

    console.log('收到指紋資料:', {
        visitorId,
        confidence: confidence?.score,
        version,
        componentsCount: Object.keys(components || {}).length,
        isLoggedIn: !!req.session.userId,
        userId: req.session.userId
    });
    
    // 調試：顯示所有元件名稱
    console.log('採集的元件:', Object.keys(components || {}).sort().join(', '));
    
    // **新邏輯：區分登入和未登入用戶**
    if (req.session.userId) {
        // **已登入用戶：將指紋關聯到該用戶帳號**
        handleLoggedInUserFingerprint(req, res, visitorId, confidence, version, components);
    } else {
        // **未登入用戶：比對現有指紋並顯示相似度**
        handleGuestUserFingerprint(req, res, visitorId, confidence, version, components);
    }
});

// 處理登入用戶的指紋
function handleLoggedInUserFingerprint(req, res, visitorId, confidence, version, components) {
    const userId = req.session.userId;
    
    // 檢查該用戶是否已有指紋記錄
    db.get(
        'SELECT id, visitor_id, components FROM fingerprints WHERE linked_user_id = ?',
        [userId],
        (err, existingRecord) => {
            if (err) {
                console.error('查詢用戶指紋錯誤:', err);
                return res.status(500).json({ error: '資料庫查詢失敗' });
            }
            
            if (existingRecord) {
                // 更新現有指紋
                const oldComponents = JSON.parse(existingRecord.components || '{}');
                const similarity = calculateSimilarity(oldComponents, components || {});
                
                db.run(
                    'UPDATE fingerprints SET visitor_id = ?, confidence_score = ?, confidence_comment = ?, version = ?, components = ?, last_seen = CURRENT_TIMESTAMP WHERE linked_user_id = ?',
                    [
                        visitorId,
                        confidence?.score || 0,
                        confidence?.comment || '',
                        version || '',
                        JSON.stringify(components || {}),
                        userId
                    ],
                    function(updateErr) {
                        if (updateErr) {
                            console.error('更新用戶指紋錯誤:', updateErr);
                            return res.status(500).json({ error: '更新失敗' });
                        }
                        
                        console.log(`更新登入用戶 ${userId} 的指紋, 相似度: ${similarity.toFixed(1)}%`);
                        
                        // 查詢用戶名稱
                        db.get('SELECT username FROM accounts WHERE id = ?', [userId], (userErr, user) => {
                            res.json({
                                isNewUser: false,
                                userId: existingRecord.id,
                                similarity: similarity,
                                message: `已登入用戶 ${user?.username || userId} 的指紋已更新`,
                                fingerprintChanged: similarity < 90,
                                isLoggedIn: true
                            });
                        });
                    }
                );
            } else {
                // 新增指紋記錄
                db.run(
                    'INSERT INTO fingerprints (visitor_id, confidence_score, confidence_comment, version, components, linked_user_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        visitorId,
                        confidence?.score || 0,
                        confidence?.comment || '',
                        version || '',
                        JSON.stringify(components || {}),
                        userId
                    ],
                    function(insertErr) {
                        if (insertErr) {
                            console.error('新增用戶指紋錯誤:', insertErr);
                            return res.status(500).json({ error: '新增失敗' });
                        }
                        
                        console.log(`新增登入用戶 ${userId} 的指紋記錄`);
                        
                        // 查詢用戶名稱
                        db.get('SELECT username FROM accounts WHERE id = ?', [userId], (userErr, user) => {
                            res.json({
                                isNewUser: true,
                                userId: this.lastID,
                                message: `已登入用戶 ${user?.username || userId} 的指紋已存儲`,
                                isLoggedIn: true
                            });
                        });
                    }
                );
            }
        }
    );
}

// 處理訪客的指紋(未登入)
function handleGuestUserFingerprint(req, res, visitorId, confidence, version, components) {

    // 比對現有所有指紋，找出相似度最高的前5個
    db.all(
        'SELECT f.id, f.visitor_id, f.components, f.linked_user_id, a.username FROM fingerprints f LEFT JOIN accounts a ON f.linked_user_id = a.id',
        (err, allUsers) => {
            if (err) {
                console.error('查詢所有指紋錯誤:', err);
                return res.status(500).json({ error: '資料庫查詢失敗' });
            }

            // 計算與所有用戶的相似度並排序
            const similarityResults = [];
            
            for (const user of allUsers) {
                const userComponents = JSON.parse(user.components || '{}');
                const similarity = calculateSimilarity(userComponents, components || {});
                
                console.log(`與指紋 ID ${user.id} (用戶: ${user.username || '未登入'}) 相似度: ${similarity.toFixed(1)}%`);
                
                if (similarity > 0) { // 只記錄有相似度的結果
                    similarityResults.push({
                        id: user.linked_user_id || user.id,
                        username: user.username || `ID-${user.linked_user_id || user.id}`,
                        fingerprintId: user.id,
                        similarity: similarity
                    });
                }
            }

            // 按相似度降序排序，取前5個
            similarityResults.sort((a, b) => b.similarity - a.similarity);
            const top5Matches = similarityResults.slice(0, 5);

            // **關鍵：返回前5個最相似的用戶**
            if (top5Matches.length > 0 && top5Matches[0].similarity >= 50) { // 50% 以上顯示相似度
                console.log(`找到 ${top5Matches.length} 個相似用戶，最高相似度: ${top5Matches[0].similarity.toFixed(1)}%`);
                
                // 生成相似度列表訊息
                const similarityList = top5Matches.map((match, index) => 
                    `${index + 1}. 用戶${match.username}: ${match.similarity.toFixed(1)}%`
                ).join('\n');
                
                // 不存儲訪客指紋，只返回比對結果
                res.json({
                    isNewUser: true, // 訪客是新的，但找到相似的
                    similarity: top5Matches[0].similarity,
                    topMatches: top5Matches,
                    message: `找到 ${top5Matches.length} 個相似用戶：\n${similarityList}`,
                    isGuest: true
                });
            } else {
                // 沒有找到相似的指紋
                console.log('沒有找到相似的指紋');
                
                res.json({
                    isNewUser: true,
                    similarity: 0,
                    topMatches: [],
                    message: '完全新的訪客，沒有找到相似的指紋',
                    isGuest: true
                });
            }
        }
    );
}

// API 路由：獲取所有指紋記錄
app.get('/api/fingerprints', (req, res) => {
    db.all(
        'SELECT f.id, f.visitor_id, f.confidence_score, f.version, f.created_at, f.last_seen, f.linked_user_id, a.username FROM fingerprints f LEFT JOIN accounts a ON f.linked_user_id = a.id ORDER BY f.last_seen DESC',
        (err, rows) => {
            if (err) {
                console.error('查詢錯誤:', err);
                return res.status(500).json({ error: '查詢失敗' });
            }

            res.json(rows);
        }
    );
});

// API 路由：獲取指紋詳細資料（用於調試）
app.get('/api/debug/fingerprint/:id', (req, res) => {
    const fingerprintId = req.params.id;
    
    db.get(
        'SELECT f.*, a.username FROM fingerprints f LEFT JOIN accounts a ON f.linked_user_id = a.id WHERE f.id = ?',
        [fingerprintId],
        (err, row) => {
            if (err) {
                console.error('查詢錯誤:', err);
                return res.status(500).json({ error: '查詢失敗' });
            }
            
            if (!row) {
                return res.status(404).json({ error: '找不到指紋記錄' });
            }
            
            const components = JSON.parse(row.components || '{}');
            const componentNames = Object.keys(components).sort();
            
            res.json({
                ...row,
                components: components,
                componentNames: componentNames,
                componentCount: componentNames.length
            });
        }
    );
});

// API 路由：獲取統計資料
app.get('/api/stats', (req, res) => {
    db.get(
        'SELECT COUNT(*) as total_fingerprints, AVG(confidence_score) as avg_confidence, COUNT(DISTINCT linked_user_id) as total_linked_users FROM fingerprints',
        (err, row) => {
            if (err) {
                console.error('統計查詢錯誤:', err);
                return res.status(500).json({ error: '統計查詢失敗' });
            }

            res.json({
                totalFingerprints: row.total_fingerprints,
                totalLinkedUsers: row.total_linked_users,
                averageConfidence: row.avg_confidence ? (row.avg_confidence * 100).toFixed(1) : 0
            });
        }
    );
});

// API 路由：獲取最可能的用戶關聯（未登入用戶使用）
app.get('/api/identify', (req, res) => {
    // 如果已經登入，直接返回已登入狀態
    if (req.session.userId) {
        return res.json({ 
            loggedIn: true,
            user: {
                id: req.session.userId,
                username: req.session.username
            }
        });
    }
    
    // 獲取當前指紋的 visitorId（從 session 或最新記錄）
    const currentVisitorId = req.query.visitorId;
    if (!currentVisitorId) {
        return res.json({ loggedIn: false, message: '沒有指紋資料' });
    }
    
    // 查找當前指紋
    db.get(
        'SELECT id, components FROM fingerprints WHERE visitor_id = ?',
        [currentVisitorId],
        (err, currentFingerprint) => {
            if (err || !currentFingerprint) {
                return res.json({ loggedIn: false, message: '找不到當前指紋' });
            }
            
            // 查找所有已關聯用戶的指紋
            db.all(
                'SELECT f.id, f.visitor_id, f.components, f.linked_user_id, a.username FROM fingerprints f INNER JOIN accounts a ON f.linked_user_id = a.id',
                (err, linkedFingerprints) => {
                    if (err || !linkedFingerprints.length) {
                        return res.json({ loggedIn: false, message: '沒有已關聯的用戶' });
                    }
                    
                    const currentComponents = JSON.parse(currentFingerprint.components || '{}');
                    let bestMatch = null;
                    let highestSimilarity = 0;
                    
                    // 計算與所有已關聯用戶的相似度
                    for (const linkedFingerprint of linkedFingerprints) {
                        const linkedComponents = JSON.parse(linkedFingerprint.components || '{}');
                        const similarity = calculateSimilarity(linkedComponents, currentComponents);
                        
                        if (similarity > highestSimilarity) {
                            highestSimilarity = similarity;
                            bestMatch = linkedFingerprint;
                        }
                    }
                    
                    if (bestMatch && highestSimilarity >= 70) { // 70% 以上才顯示
                        res.json({
                            loggedIn: false,
                            likelyUser: {
                                userId: bestMatch.linked_user_id,
                                username: bestMatch.username,
                                similarity: Math.round(highestSimilarity)
                            },
                            message: `新使用者，最可能是 ${bestMatch.username} (${Math.round(highestSimilarity)}%)`
                        });
                    } else {
                        res.json({ 
                            loggedIn: false, 
                            message: '新使用者，無法關聯到已知用戶' 
                        });
                    }
                }
            );
        }
    );
});

// 首頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
    console.error('伺服器錯誤:', err);
    res.status(500).json({ error: '內部伺服器錯誤' });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行在 http://localhost:${PORT}`);
    console.log('FingerprintJS V4 指紋採集測試網站已啟動');
});

// 優雅關閉
process.on('SIGINT', () => {
    console.log('\n正在關閉伺服器...');
    db.close((err) => {
        if (err) {
            console.error('關閉資料庫時發生錯誤:', err);
        } else {
            console.log('資料庫已關閉');
        }
        process.exit(0);
    });
});
