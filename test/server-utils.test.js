const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const {
    db,
    generateMathCaptcha,
    verifyMathCaptcha,
    calculateMultiFingerprintSimilarity,
    findChangedComponents,
    calculateArraySimilarity
} = require('../server');

function buildFingerprintDataset() {
    return {
        components: {
            canvas: { value: 'canvas-hash' },
            audio: { value: 'audio-fp' },
            fonts: { value: ['Arial', 'Roboto'] },
            hardwareConcurrency: { value: 8 },
            deviceMemory: { value: 16 },
            platform: { value: 'MacIntel' },
            screenResolution: { value: '1920x1080' }
        },
        canvas: 'canvas-hash',
        webgl: {
            renderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)',
            vendor: 'Apple',
            version: 'WebGL 2.0',
            extensions: ['EXT_color_buffer_float', 'WEBGL_debug_renderer_info']
        },
        audio: { fingerprint: 'audio-fp', sampleRate: 48000 },
        fonts: { available: ['Arial', 'Roboto'] },
        plugins: { names: ['Chrome PDF Viewer'] },
        hardware: { cores: 8, memory: 16, touchPoints: 0 },
        custom: {
            screen: { width: 1920, height: 1080, colorDepth: 24 },
            timezone: 'UTC'
        }
    };
}

test('generateMathCaptcha returns consistent question and answer', () => {
    const { question, answer } = generateMathCaptcha();
    assert.match(question, /^\d+ [+\-*] \d+ = \?$/);

    const parts = question.replace(' = ?', '').split(' ');
    const num1 = parseInt(parts[0], 10);
    const operator = parts[1];
    const num2 = parseInt(parts[2], 10);

    let expected;
    switch (operator) {
        case '+':
            expected = num1 + num2;
            break;
        case '-':
            expected = Math.abs(num1 - num2);
            break;
        case '*':
            expected = num1 * num2;
            break;
        default:
            throw new Error('Unexpected operator in CAPTCHA');
    }

    assert.equal(answer, expected);
});

test('verifyMathCaptcha accepts correct answers and rejects incorrect ones', () => {
    assert.equal(verifyMathCaptcha('5', '5'), true);
    assert.equal(verifyMathCaptcha('7', '3'), false);
    assert.equal(verifyMathCaptcha(null, '2'), false);
});

test('calculateMultiFingerprintSimilarity returns 100 for identical fingerprints', () => {
    const baseline = buildFingerprintDataset();
    const result = calculateMultiFingerprintSimilarity(baseline, buildFingerprintDataset());
    assert.equal(result, 100);
});

test('calculateMultiFingerprintSimilarity drops when key traits differ', () => {
    const baseline = buildFingerprintDataset();
    const modified = buildFingerprintDataset();
    modified.canvas = 'different-canvas';
    modified.webgl = {
        renderer: 'Other Renderer',
        vendor: 'Other Vendor',
        version: 'WebGL 1.0',
        extensions: []
    };
    modified.audio = { fingerprint: 'other-fp', sampleRate: 44100 };
    modified.fonts = { available: ['Courier New'] };
    modified.hardware = { cores: 4, memory: 8, touchPoints: 2 };
    modified.custom = {
        screen: { width: 1366, height: 768, colorDepth: 24 },
        timezone: 'Asia/Taipei'
    };

    const result = calculateMultiFingerprintSimilarity(baseline, modified);
    assert.ok(result < 100);
    assert.ok(result >= 0);
});

test('findChangedComponents reports added, changed, and removed entries', () => {
    const previous = {
        canvas: { value: 'canvas-hash' },
        fonts: { value: ['Arial'] },
        plugins: { value: ['PluginA'] }
    };
    const current = {
        canvas: { value: 'other-canvas' },
        fonts: { value: ['Arial', 'Roboto'] },
        extra: { value: 123 }
    };
    const changes = findChangedComponents(previous, current);

    assert.ok(changes.some(change => change.component === 'canvas' && change.type === 'changed'));
    assert.ok(changes.some(change => change.component === 'plugins' && change.type === 'removed'));
    assert.ok(changes.some(change => change.component === 'extra' && change.type === 'added'));
});

test('calculateArraySimilarity handles partial overlap', () => {
    const similarity = calculateArraySimilarity(['A', 'B', 'C'], ['B', 'C', 'D']);
    assert.equal(similarity, (2 / 4) * 100);
});

after(() => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
});
