# Photobomb Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based Photo Booth clone with live camera effects, photo/video capture, and a filmstrip gallery.

**Architecture:** 9 tile canvases in a CSS grid, each with its own lightweight CanvasRenderer sharing a single camera video element. Full-size mode uses one dedicated canvas/renderer. Camera input via `getUserMedia()` → `<video>` element → external texture updates per frame. No build step — plain ES modules served via http-server.

**Tech Stack:** Noisemaker shader pipeline (CDN), vanilla JS (ES modules), CSS Grid, Web Components (minimal), getUserMedia, MediaRecorder, IndexedDB, Playwright (tests).

**Reference app:** `../layers/` — follow same bundle consumption pattern.

---

## Task 1: Project Scaffold

**Files:**
- Create: `public/index.html`
- Create: `package.json`

**Step 1: Create package.json**

```json
{
  "name": "photobomb",
  "version": "0.1.0",
  "description": "Photo Booth clone powered by Noisemaker shader pipeline",
  "type": "module",
  "scripts": {
    "dev": "npx http-server public -p 3005 -c-1",
    "test": "npx playwright test"
  },
  "devDependencies": {
    "playwright": "^1.58.1"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT"
}
```

**Step 2: Create minimal index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photobomb</title>
    <link rel="preconnect" href="https://shaders.noisedeck.app" crossorigin>
    <link rel="stylesheet" href="css/colors.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/components.css">
</head>
<body>
    <div id="app">
        <header id="title-bar">
            <h1>PHOTOBOMB</h1>
        </header>
        <main id="stage">
            <!-- Grid and full-size views go here -->
        </main>
        <footer id="filmstrip">
            <!-- Gallery thumbnails -->
        </footer>
    </div>
    <script type="module" src="js/app.js"></script>
</body>
</html>
```

**Step 3: Create CSS files**

Create `public/css/colors.css`:
```css
:root {
    --bg: #0a0a0a;
    --bg-elevated: #161616;
    --border: rgba(255, 255, 255, 0.1);
    --border-hover: rgba(255, 255, 255, 0.2);
    --text: #e0e0e0;
    --text-dim: #888;
    --accent: #ff3b30;
    --accent-photo: #ffffff;
    --glass: rgba(20, 20, 20, 0.8);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    overflow: hidden;
    height: 100dvh;
}
```

Create `public/css/layout.css`:
```css
#app {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100dvh;
    width: 100vw;
}

#title-bar {
    text-align: center;
    padding: 12px;
    font-size: 14px;
    letter-spacing: 0.15em;
    color: var(--text-dim);
    border-bottom: 1px solid var(--border);
}

#title-bar h1 {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.15em;
}

#stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 16px;
    overflow: hidden;
}

#filmstrip {
    height: 80px;
    background: var(--glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 8px;
    overflow-x: auto;
}
```

Create `public/css/components.css`:
```css
/* Grid view */
.grid-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    max-width: min(90vw, calc(90vh - 200px));
    max-height: calc(100vh - 200px);
    aspect-ratio: 4 / 3;
}

.grid-tile {
    position: relative;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid var(--border);
    transition: border-color 0.15s;
    aspect-ratio: 4 / 3;
}

.grid-tile:hover {
    border-color: var(--border-hover);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.05);
}

.grid-tile canvas {
    width: 100%;
    height: 100%;
    display: block;
}

.grid-tile .tile-label {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 4px 8px;
    font-size: 11px;
    color: var(--text);
    background: linear-gradient(transparent, rgba(0,0,0,0.6));
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
}

.grid-tile:hover .tile-label {
    opacity: 1;
}

/* Tab buttons */
.tab-bar {
    display: flex;
    gap: 4px;
    justify-content: center;
}

.tab-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 6px 20px;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
}

.tab-btn:hover {
    border-color: var(--border-hover);
    color: var(--text);
}

.tab-btn.active {
    background: var(--bg-elevated);
    border-color: var(--border-hover);
    color: var(--text);
}

/* Full-size view */
.fullsize-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
    height: 100%;
}

.fullsize-canvas-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 0;
}

.fullsize-canvas-wrapper canvas {
    max-width: 100%;
    max-height: 100%;
    border-radius: 6px;
    border: 1px solid var(--border);
}

.fullsize-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding-bottom: 8px;
}

/* Mode toggle */
.mode-toggle {
    display: flex;
    gap: 0;
    border-radius: 16px;
    border: 1px solid var(--border);
    overflow: hidden;
}

.mode-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    padding: 6px 16px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
}

.mode-btn.active {
    background: var(--bg-elevated);
    color: var(--text);
}

/* Shutter button */
.shutter-btn {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 3px solid var(--accent-photo);
    background: transparent;
    cursor: pointer;
    position: relative;
    transition: all 0.15s;
}

.shutter-btn::after {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: var(--accent-photo);
    transition: all 0.15s;
}

.shutter-btn:hover::after {
    inset: 3px;
}

.shutter-btn.video-mode {
    border-color: var(--accent);
}

.shutter-btn.video-mode::after {
    background: var(--accent);
}

.shutter-btn.recording::after {
    border-radius: 4px;
    inset: 16px;
}

/* Back to grid */
.grid-back-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 6px 16px;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
}

.effect-name {
    color: var(--text-dim);
    font-size: 13px;
}

/* Filmstrip thumbnails */
.filmstrip-thumb {
    width: 56px;
    height: 56px;
    border-radius: 4px;
    border: 1px solid var(--border);
    cursor: pointer;
    object-fit: cover;
    flex-shrink: 0;
    transition: border-color 0.15s;
}

.filmstrip-thumb:hover {
    border-color: var(--border-hover);
}

/* Countdown overlay */
.countdown-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    pointer-events: none;
}

.countdown-number {
    font-size: 120px;
    font-weight: 200;
    color: white;
    text-shadow: 0 0 40px rgba(0,0,0,0.5);
    animation: countdown-pulse 1s ease-out;
}

@keyframes countdown-pulse {
    0% { transform: scale(1.5); opacity: 0; }
    30% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.8); opacity: 0; }
}

/* Flash overlay */
.flash-overlay {
    position: fixed;
    inset: 0;
    background: white;
    z-index: 101;
    pointer-events: none;
    animation: flash 0.3s ease-out forwards;
}

@keyframes flash {
    0% { opacity: 0.8; }
    100% { opacity: 0; }
}

/* Recording indicator */
.recording-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--accent);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.recording-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

/* Hidden utility */
.hidden { display: none !important; }
```

**Step 4: Create stub app.js**

Create `public/js/app.js`:
```javascript
/**
 * Photobomb — Photo Booth clone powered by Noisemaker
 */

class PhotobombApp {
    constructor() {
        this._initialized = false
    }

    async init() {
        if (this._initialized) return
        console.log('[Photobomb] Initializing...')
        this._initialized = true
        console.log('[Photobomb] Ready')
    }
}

const app = new PhotobombApp()
app.init().catch(err => console.error('[Photobomb] Init failed:', err))
```

**Step 5: Verify it runs**

Run: `npm run dev`
Open: `http://localhost:3005`
Expected: Dark page with "PHOTOBOMB" title bar, empty stage, frosted filmstrip bar at bottom.

**Step 6: Commit**

```bash
git add -A
git commit -m "scaffold: project structure, HTML shell, CSS foundation"
```

---

## Task 2: Noisemaker Bundle Integration

**Files:**
- Create: `public/js/noisemaker/bundle.js`
- Create: `public/js/noisemaker/index.js`
- Create: `public/js/noisemaker/renderer.js`

**Reference:** `../layers/public/js/noisemaker/bundle.js`

**Step 1: Create bundle.js (CDN loader)**

```javascript
/**
 * ESM bundle loader for Noisemaker Shaders Core
 *
 * Dynamically imports from the appropriate ESM bundle:
 * - Non-minified for local development (localhost, 127.0.0.1, file://)
 * - Minified for production
 */

const SHADER_CDN = 'https://shaders.noisedeck.app/0.8.5'
const BUNDLE_VERSION = SHADER_CDN.split('/').pop()

const isLocalDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:'
)

const bundlePath = isLocalDev
    ? `${SHADER_CDN}/noisemaker-shaders-core.esm.js`
    : `${SHADER_CDN}/noisemaker-shaders-core.esm.min.js`

const bundle = await import(bundlePath)
console.debug(`[bundle.js] Noisemaker bundle v${BUNDLE_VERSION} loaded from ${bundlePath}`)

export const {
    CanvasRenderer,
    ProgramState,
    registerEffect,
    getEffect,
    getAllEffects,
    compile,
    validate,
    extractEffectNamesFromDsl,
    extractEffectsFromDsl,
    cloneParamValue,
    stdEnums
} = bundle

export const _bundle = bundle
```

**Step 2: Create renderer.js (PhotobombRenderer)**

```javascript
/**
 * PhotobombRenderer — wraps CanvasRenderer for Photobomb's use cases
 *
 * Two modes:
 *   - Grid tile: small canvas, single effect, shared camera video element
 *   - Full-size: large canvas, single effect, dedicated view
 */

import { CanvasRenderer } from './bundle.js'

const SHADER_CDN = 'https://shaders.noisedeck.app/0.8.5'

export class PhotobombRenderer {
    constructor(canvas, options = {}) {
        this._canvas = canvas
        this.width = options.width || canvas?.width || 640
        this.height = options.height || canvas?.height || 480

        this._renderer = new CanvasRenderer({
            canvas,
            canvasContainer: canvas?.parentElement || null,
            width: this.width,
            height: this.height,
            basePath: SHADER_CDN,
            preferWebGPU: false,
            useBundles: true,
            bundlePath: `${SHADER_CDN}/effects`,
            alpha: false,
            onError: options.onError
        })

        this._initialized = false
        this._videoSource = null
        this._animRAF = null
        this._currentDsl = ''
    }

    async init() {
        if (this._initialized) return
        await this._renderer.loadManifest()
        this._initialized = true
    }

    /**
     * Set the camera video element as external texture source.
     * Must be called before compile().
     */
    setVideoSource(videoElement) {
        this._videoSource = videoElement
    }

    /**
     * Compile a DSL program and start rendering.
     * @param {string} dsl - Noisemaker DSL code
     */
    async compile(dsl) {
        if (!this._initialized) throw new Error('Not initialized')
        this._currentDsl = dsl
        await this._renderer.compile(dsl)
        this._uploadVideoTexture()
        this._startLoop()
    }

    /**
     * Upload video frame to the GPU texture.
     * Called once before render loop starts and then every frame.
     */
    _uploadVideoTexture() {
        if (!this._videoSource) return
        if (this._videoSource.readyState < 2) return // HAVE_CURRENT_DATA
        this._renderer.updateTextureFromSource?.('imageTex', this._videoSource, { flipY: false })
        // Update imageSize uniform for aspect ratio correction
        const w = this._videoSource.videoWidth || this._videoSource.width
        const h = this._videoSource.videoHeight || this._videoSource.height
        if (w && h) {
            this._renderer.state?.setValue?.('media', 'imageSize', [w, h])
        }
    }

    _startLoop() {
        if (this._animRAF) return
        const tick = () => {
            this._uploadVideoTexture()
            this._animRAF = requestAnimationFrame(tick)
        }
        this._animRAF = requestAnimationFrame(tick)
    }

    stop() {
        if (this._animRAF) {
            cancelAnimationFrame(this._animRAF)
            this._animRAF = null
        }
    }

    resize(width, height) {
        this.width = width
        this.height = height
        this._renderer.resize?.(width, height)
    }

    destroy() {
        this.stop()
        this._renderer.destroy?.()
        this._videoSource = null
    }
}
```

**Step 3: Create index.js (facade)**

```javascript
/**
 * Noisemaker integration for Photobomb
 */

export { PhotobombRenderer } from './renderer.js'
export { CanvasRenderer, compile, getAllEffects } from './bundle.js'
```

**Step 4: Verify bundle loads**

Update `public/js/app.js` to import and test:
```javascript
import { PhotobombRenderer } from './noisemaker/index.js'

class PhotobombApp {
    constructor() {
        this._initialized = false
    }

    async init() {
        if (this._initialized) return
        console.log('[Photobomb] Initializing...')

        // Test: create a renderer with a temp canvas
        const testCanvas = document.createElement('canvas')
        testCanvas.width = 320
        testCanvas.height = 240
        const renderer = new PhotobombRenderer(testCanvas, { width: 320, height: 240 })
        await renderer.init()
        console.log('[Photobomb] Renderer initialized successfully')
        renderer.destroy()

        this._initialized = true
        console.log('[Photobomb] Ready')
    }
}

const app = new PhotobombApp()
app.init().catch(err => console.error('[Photobomb] Init failed:', err))
```

Run: `npm run dev`, open `http://localhost:3005`, check console.
Expected: `[Photobomb] Renderer initialized successfully`

**Step 5: Commit**

```bash
git add public/js/noisemaker/
git commit -m "feat: noisemaker bundle integration with PhotobombRenderer"
```

---

## Task 3: Camera Module

**Files:**
- Create: `public/js/camera.js`

**Step 1: Create camera.js**

```javascript
/**
 * Camera module — wraps getUserMedia for webcam access
 *
 * Creates a hidden <video> element playing the camera stream.
 * Other modules read from the video element as a texture source.
 */

export class Camera {
    constructor() {
        this._video = document.createElement('video')
        this._video.playsInline = true
        this._video.muted = true
        this._video.autoplay = true
        this._stream = null
    }

    /** The HTMLVideoElement playing the camera feed */
    get video() { return this._video }

    /** True if camera is active */
    get active() { return this._stream !== null }

    /** Camera resolution once started */
    get width() { return this._video.videoWidth || 0 }
    get height() { return this._video.videoHeight || 0 }

    /**
     * Start the camera. Requests user permission.
     * @param {object} options - { facingMode, deviceId, width, height }
     */
    async start(options = {}) {
        if (this._stream) this.stop()

        const constraints = {
            video: {
                facingMode: options.facingMode || 'user',
                width: { ideal: options.width || 1280 },
                height: { ideal: options.height || 720 }
            },
            audio: false
        }

        if (options.deviceId) {
            constraints.video = { deviceId: { exact: options.deviceId } }
        }

        this._stream = await navigator.mediaDevices.getUserMedia(constraints)
        this._video.srcObject = this._stream
        await this._video.play()

        // Wait for video dimensions to be available
        await new Promise(resolve => {
            if (this._video.videoWidth > 0) { resolve(); return }
            this._video.addEventListener('loadedmetadata', resolve, { once: true })
        })
    }

    /** Stop the camera and release the stream */
    stop() {
        if (this._stream) {
            this._stream.getTracks().forEach(t => t.stop())
            this._stream = null
        }
        this._video.srcObject = null
    }

    /** List available video input devices */
    static async listDevices() {
        const devices = await navigator.mediaDevices.enumerateDevices()
        return devices.filter(d => d.kind === 'videoinput')
    }
}
```

**Step 2: Wire camera into app.js for testing**

Update `public/js/app.js`:
```javascript
import { PhotobombRenderer } from './noisemaker/index.js'
import { Camera } from './camera.js'

class PhotobombApp {
    constructor() {
        this._initialized = false
        this._camera = new Camera()
    }

    async init() {
        if (this._initialized) return
        console.log('[Photobomb] Initializing...')

        // Start camera
        await this._camera.start()
        console.log(`[Photobomb] Camera: ${this._camera.width}x${this._camera.height}`)

        // Test: render camera through a single renderer
        const stage = document.getElementById('stage')
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = 480
        stage.appendChild(canvas)

        const renderer = new PhotobombRenderer(canvas, { width: 640, height: 480 })
        await renderer.init()
        renderer.setVideoSource(this._camera.video)
        await renderer.compile('search synth\n\nmedia().write(o0)\n\nrender(o0)')

        this._initialized = true
        console.log('[Photobomb] Ready')
    }
}

const app = new PhotobombApp()
app.init().catch(err => console.error('[Photobomb] Init failed:', err))
```

Run: `npm run dev`, open `http://localhost:3005`, allow camera.
Expected: Live camera feed visible on canvas.

**Step 3: Commit**

```bash
git add public/js/camera.js public/js/app.js
git commit -m "feat: camera module with getUserMedia integration"
```

---

## Task 4: Effect Presets

**Files:**
- Create: `public/js/effects.js`

**Step 1: Create effects.js**

This module defines the curated effect tabs with their DSL code. Each effect is a function that returns the DSL string for `media() → effect → write → render`.

```javascript
/**
 * Effect preset definitions for Photobomb
 *
 * Each effect has:
 *   - name: display name
 *   - dsl: full DSL program string (camera → effect → render)
 *
 * DSL pattern: search namespaces, media().effectChain().write(o0), render(o0)
 * The "Normal" center tile has no effect chain.
 */

const NORMAL = {
    name: 'Normal',
    dsl: `search synth\n\nmedia().write(o0)\n\nrender(o0)`
}

export const TABS = [
    {
        name: 'Effects',
        effects: [
            {
                name: 'Sepia',
                dsl: `search synth, filter\n\nmedia().grade(saturation: 0.3, exposure: 0.1).write(o0)\n\nrender(o0)`
            },
            {
                name: 'B&W',
                dsl: `search synth, filter\n\nmedia().grade(saturation: 0).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Glow',
                dsl: `search synth, classicNoisemaker\n\nmedia().vaseline(alpha: 0.6).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Comic Book',
                dsl: `search synth, filter\n\nmedia().edge(amount: 3).posterize(levels: 4).write(o0)\n\nrender(o0)`
            },
            NORMAL,
            {
                name: 'Color Pencil',
                dsl: `search synth, filter\n\nmedia().edge(amount: 2).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Thermal',
                dsl: `search synth, filter\n\nmedia().grade(preset: 5).write(o0)\n\nrender(o0)`
            },
            {
                name: 'X-Ray',
                dsl: `search synth, filter\n\nmedia().grade(preset: 3, exposure: 1).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Pop Art',
                dsl: `search synth, filter\n\nmedia().posterize(levels: 3).grade(saturation: 1.8).write(o0)\n\nrender(o0)`
            }
        ]
    },
    {
        name: 'Distortions',
        effects: [
            {
                name: 'Bulge',
                dsl: `search synth, filter\n\nmedia().bulge(strength: 40).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Dent',
                dsl: `search synth, filter\n\nmedia().pinch(strength: 40).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Twirl',
                dsl: `search synth, filter\n\nmedia().spiral(strength: 50).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Squeeze',
                dsl: `search synth, filter\n\nmedia().lens(displacement: -0.5).write(o0)\n\nrender(o0)`
            },
            NORMAL,
            {
                name: 'Mirror',
                dsl: `search synth, filter\n\nmedia().flipMirror(mode: mirrorLtoR).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Light Tunnel',
                dsl: `search synth, filter\n\nmedia().tunnel(speed: 1, scale: 0).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Fish Eye',
                dsl: `search synth, filter\n\nmedia().lens(displacement: 0.6).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Stretch',
                dsl: `search synth, filter\n\nmedia().waves(strength: 30, scale: 1).write(o0)\n\nrender(o0)`
            }
        ]
    }
]

/** Get the effect at grid position (0-8) for the given tab index */
export function getEffect(tabIndex, tileIndex) {
    return TABS[tabIndex]?.effects[tileIndex] || NORMAL
}

/** Get all effect names for a tab */
export function getEffectNames(tabIndex) {
    return TABS[tabIndex]?.effects.map(e => e.name) || []
}
```

**Step 2: Commit**

```bash
git add public/js/effects.js
git commit -m "feat: curated effect presets for Effects and Distortions tabs"
```

---

## Task 5: Grid View

**Files:**
- Modify: `public/index.html`
- Create: `public/js/grid.js`
- Modify: `public/js/app.js`

**Step 1: Update index.html with grid and tab structure**

Replace the `<main id="stage">` section:

```html
<main id="stage">
    <!-- Grid View -->
    <div id="grid-view">
        <div class="grid-container" id="effect-grid">
            <!-- 9 tiles created by JS -->
        </div>
        <div class="tab-bar" id="tab-bar">
            <!-- Tab buttons created by JS -->
        </div>
    </div>

    <!-- Full-Size View (hidden initially) -->
    <div id="fullsize-view" class="hidden">
        <div class="fullsize-container">
            <div class="fullsize-canvas-wrapper">
                <canvas id="fullsize-canvas"></canvas>
            </div>
            <div class="fullsize-controls">
                <div class="mode-toggle">
                    <button class="mode-btn active" data-mode="photo">Photo</button>
                    <button class="mode-btn" data-mode="video">Video</button>
                </div>
                <div id="recording-status" class="recording-indicator hidden">
                    <span class="recording-dot"></span>
                    <span id="recording-timer">0:00</span>
                </div>
                <button id="shutter-btn" class="shutter-btn"></button>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button id="grid-back-btn" class="grid-back-btn">Grid</button>
                    <span id="effect-name" class="effect-name"></span>
                </div>
            </div>
        </div>
    </div>
</main>
```

**Step 2: Create grid.js**

```javascript
/**
 * Grid module — manages the 3x3 effect preview grid
 *
 * Creates 9 tile elements, each with its own canvas and PhotobombRenderer.
 * All renderers share the same camera video element as texture source.
 */

import { PhotobombRenderer } from './noisemaker/index.js'

const TILE_WIDTH = 320
const TILE_HEIGHT = 240

export class EffectGrid {
    /**
     * @param {HTMLElement} container - the grid container element
     * @param {HTMLVideoElement} videoSource - camera video element
     */
    constructor(container, videoSource) {
        this._container = container
        this._videoSource = videoSource
        this._tiles = []       // { canvas, renderer, name }
        this._initialized = false
        this._onTileClick = null
    }

    /** Set callback for tile clicks: (tileIndex, effectName) => {} */
    set onTileClick(fn) { this._onTileClick = fn }

    /**
     * Initialize the grid with 9 tiles.
     * Each tile gets a canvas and renderer.
     */
    async init() {
        if (this._initialized) return

        this._container.innerHTML = ''

        for (let i = 0; i < 9; i++) {
            const tile = document.createElement('div')
            tile.className = 'grid-tile'
            tile.dataset.index = i

            const canvas = document.createElement('canvas')
            canvas.width = TILE_WIDTH
            canvas.height = TILE_HEIGHT
            tile.appendChild(canvas)

            const label = document.createElement('div')
            label.className = 'tile-label'
            tile.appendChild(label)

            tile.addEventListener('click', () => {
                this._onTileClick?.(i, this._tiles[i]?.name)
            })

            this._container.appendChild(tile)

            const renderer = new PhotobombRenderer(canvas, {
                width: TILE_WIDTH,
                height: TILE_HEIGHT
            })
            await renderer.init()
            renderer.setVideoSource(this._videoSource)

            this._tiles.push({ canvas, renderer, name: '', label })
        }

        this._initialized = true
    }

    /**
     * Load a set of 9 effects into the grid.
     * @param {Array<{name: string, dsl: string}>} effects - 9 effect definitions
     */
    async loadEffects(effects) {
        const promises = effects.map(async (effect, i) => {
            const tile = this._tiles[i]
            if (!tile) return
            tile.name = effect.name
            tile.label.textContent = effect.name
            try {
                await tile.renderer.compile(effect.dsl)
            } catch (err) {
                console.error(`[Grid] Failed to compile effect "${effect.name}":`, err)
            }
        })
        await Promise.all(promises)
    }

    /** Stop all renderers (e.g. when switching to full-size view) */
    stopAll() {
        for (const tile of this._tiles) {
            tile.renderer.stop()
        }
    }

    /** Resume all renderers (e.g. when returning from full-size view) */
    async resumeAll() {
        for (const tile of this._tiles) {
            if (tile.renderer._currentDsl) {
                await tile.renderer.compile(tile.renderer._currentDsl)
            }
        }
    }

    /** Clean up all renderers */
    destroy() {
        for (const tile of this._tiles) {
            tile.renderer.destroy()
        }
        this._tiles = []
        this._container.innerHTML = ''
    }
}
```

**Step 3: Update app.js to wire grid + tabs**

Replace `public/js/app.js` entirely:

```javascript
/**
 * Photobomb — Photo Booth clone powered by Noisemaker
 */

import { PhotobombRenderer } from './noisemaker/index.js'
import { Camera } from './camera.js'
import { EffectGrid } from './grid.js'
import { TABS, getEffect } from './effects.js'

class PhotobombApp {
    constructor() {
        this._initialized = false
        this._camera = new Camera()
        this._grid = null
        this._fullsizeRenderer = null
        this._currentTab = 0
        this._currentEffect = null
        this._mode = 'photo' // 'photo' | 'video'
        this._view = 'grid'  // 'grid' | 'fullsize'
    }

    async init() {
        if (this._initialized) return
        console.log('[Photobomb] Initializing...')

        // Start camera
        await this._camera.start()
        console.log(`[Photobomb] Camera: ${this._camera.width}x${this._camera.height}`)

        // Initialize grid
        const gridContainer = document.getElementById('effect-grid')
        this._grid = new EffectGrid(gridContainer, this._camera.video)
        await this._grid.init()

        // Set up tile click handler
        this._grid.onTileClick = (index, name) => this._enterFullsize(index)

        // Build tab buttons
        this._buildTabs()

        // Load default tab effects
        await this._switchTab(0)

        // Initialize full-size renderer
        const fullsizeCanvas = document.getElementById('fullsize-canvas')
        this._fullsizeRenderer = new PhotobombRenderer(fullsizeCanvas, {
            width: this._camera.width,
            height: this._camera.height
        })
        await this._fullsizeRenderer.init()
        this._fullsizeRenderer.setVideoSource(this._camera.video)

        // Wire up controls
        this._setupControls()

        this._initialized = true
        console.log('[Photobomb] Ready')
    }

    _buildTabs() {
        const tabBar = document.getElementById('tab-bar')
        tabBar.innerHTML = ''
        TABS.forEach((tab, i) => {
            const btn = document.createElement('button')
            btn.className = 'tab-btn' + (i === 0 ? ' active' : '')
            btn.textContent = tab.name
            btn.addEventListener('click', () => this._switchTab(i))
            tabBar.appendChild(btn)
        })
    }

    async _switchTab(tabIndex) {
        this._currentTab = tabIndex
        const effects = TABS[tabIndex].effects

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === tabIndex)
        })

        await this._grid.loadEffects(effects)
    }

    async _enterFullsize(tileIndex) {
        const effect = getEffect(this._currentTab, tileIndex)
        this._currentEffect = { ...effect, tileIndex }

        // Stop grid renderers
        this._grid.stopAll()

        // Compile full-size renderer with selected effect
        const fullsizeCanvas = document.getElementById('fullsize-canvas')
        fullsizeCanvas.width = this._camera.width
        fullsizeCanvas.height = this._camera.height
        this._fullsizeRenderer.resize(this._camera.width, this._camera.height)
        await this._fullsizeRenderer.compile(effect.dsl)

        // Update UI
        document.getElementById('effect-name').textContent = effect.name
        document.getElementById('grid-view').classList.add('hidden')
        document.getElementById('fullsize-view').classList.remove('hidden')
        this._view = 'fullsize'
    }

    async _exitFullsize() {
        // Stop full-size renderer
        this._fullsizeRenderer.stop()

        // Show grid, resume renderers
        document.getElementById('fullsize-view').classList.add('hidden')
        document.getElementById('grid-view').classList.remove('hidden')
        this._view = 'grid'

        await this._grid.resumeAll()
    }

    _setupControls() {
        // Grid back button
        document.getElementById('grid-back-btn').addEventListener('click', () => {
            this._exitFullsize()
        })

        // Mode toggle
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._mode = btn.dataset.mode
                document.querySelectorAll('.mode-btn').forEach(b =>
                    b.classList.toggle('active', b === btn))
                const shutter = document.getElementById('shutter-btn')
                shutter.classList.toggle('video-mode', this._mode === 'video')
            })
        })

        // Shutter button (capture wired in Task 7/8)
        document.getElementById('shutter-btn').addEventListener('click', () => {
            console.log(`[Photobomb] Capture: ${this._mode}`)
        })
    }
}

const app = new PhotobombApp()
app.init().catch(err => console.error('[Photobomb] Init failed:', err))
```

**Step 4: Verify grid renders**

Run: `npm run dev`, open `http://localhost:3005`, allow camera.
Expected: 3x3 grid of live camera previews with different effects. Tab buttons switch between Effects and Distortions. Clicking a tile transitions to full-size view. Grid button returns to grid.

**Step 5: Commit**

```bash
git add public/js/grid.js public/js/app.js public/index.html
git commit -m "feat: 3x3 effect grid with tab switching and fullsize view"
```

---

## Task 6: Full-Size View Polish

**Files:**
- Modify: `public/js/app.js`

This task refines the full-size view: smooth transitions, proper canvas sizing, and mode toggle visual feedback. Most of the structure is already in place from Task 5.

**Step 1: Add CSS transition for view switching**

Add to `public/css/components.css`:

```css
/* View transitions */
#grid-view, #fullsize-view {
    transition: opacity 0.2s ease;
}

#grid-view.fading, #fullsize-view.fading {
    opacity: 0;
}
```

**Step 2: Update view switching in app.js to use fade transition**

Replace `_enterFullsize` and `_exitFullsize` in `app.js` with fade-transition versions:

```javascript
async _enterFullsize(tileIndex) {
    const effect = getEffect(this._currentTab, tileIndex)
    this._currentEffect = { ...effect, tileIndex }

    const gridView = document.getElementById('grid-view')
    const fullsizeView = document.getElementById('fullsize-view')

    // Fade out grid
    gridView.classList.add('fading')
    await new Promise(r => setTimeout(r, 200))

    // Stop grid renderers
    this._grid.stopAll()

    // Compile full-size renderer
    const fullsizeCanvas = document.getElementById('fullsize-canvas')
    fullsizeCanvas.width = this._camera.width
    fullsizeCanvas.height = this._camera.height
    this._fullsizeRenderer.resize(this._camera.width, this._camera.height)
    await this._fullsizeRenderer.compile(effect.dsl)

    // Switch views
    document.getElementById('effect-name').textContent = effect.name
    gridView.classList.add('hidden')
    gridView.classList.remove('fading')
    fullsizeView.classList.remove('hidden')
    this._view = 'fullsize'
}

async _exitFullsize() {
    const gridView = document.getElementById('grid-view')
    const fullsizeView = document.getElementById('fullsize-view')

    fullsizeView.classList.add('fading')
    await new Promise(r => setTimeout(r, 200))

    this._fullsizeRenderer.stop()

    fullsizeView.classList.add('hidden')
    fullsizeView.classList.remove('fading')
    gridView.classList.remove('hidden')
    this._view = 'grid'

    await this._grid.resumeAll()
}
```

**Step 3: Verify transitions**

Run dev server, test view switching. Expected: smooth 200ms fade between grid and fullsize views.

**Step 4: Commit**

```bash
git add public/js/app.js public/css/components.css
git commit -m "feat: smooth fade transitions between grid and fullsize views"
```

---

## Task 7: Photo Capture

**Files:**
- Create: `public/js/capture.js`
- Modify: `public/js/app.js`

**Step 1: Create capture.js**

```javascript
/**
 * Capture module — photo and video capture from canvas
 */

/**
 * Capture a photo from a canvas with countdown and flash.
 * @param {HTMLCanvasElement} canvas - the canvas to capture from
 * @param {object} options - { countdown: boolean }
 * @returns {Promise<Blob>} the captured image blob
 */
export async function capturePhoto(canvas, options = {}) {
    const countdown = options.countdown !== false

    if (countdown) {
        await showCountdown()
    }

    // Flash
    showFlash()

    // Capture
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to capture photo'))
        }, 'image/png')
    })
}

/** Show 3-2-1 countdown overlay */
function showCountdown() {
    return new Promise(resolve => {
        const overlay = document.createElement('div')
        overlay.className = 'countdown-overlay'
        document.body.appendChild(overlay)

        let count = 3
        const tick = () => {
            if (count <= 0) {
                overlay.remove()
                resolve()
                return
            }
            overlay.innerHTML = `<span class="countdown-number">${count}</span>`
            count--
            setTimeout(tick, 1000)
        }
        tick()
    })
}

/** Show white flash overlay */
function showFlash() {
    const flash = document.createElement('div')
    flash.className = 'flash-overlay'
    document.body.appendChild(flash)
    flash.addEventListener('animationend', () => flash.remove())
}

/**
 * Start video recording from a canvas.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ stop: () => Promise<Blob>, elapsed: () => number }}
 */
export function startVideoRecording(canvas) {
    const stream = canvas.captureStream(30)
    const chunks = []
    const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
    })
    const startTime = Date.now()

    recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data)
    }

    recorder.start(100) // 100ms timeslice

    return {
        /** Elapsed recording time in seconds */
        elapsed: () => (Date.now() - startTime) / 1000,

        /** Stop recording and return the video blob */
        stop: () => new Promise(resolve => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' })
                resolve(blob)
            }
            recorder.stop()
        })
    }
}
```

**Step 2: Wire photo capture into app.js**

Add to the `_setupControls` method, replacing the shutter click handler:

```javascript
// Shutter button
document.getElementById('shutter-btn').addEventListener('click', async () => {
    if (this._mode === 'photo') {
        await this._capturePhoto()
    } else {
        this._toggleVideoRecording()
    }
})
```

Add capture methods to `PhotobombApp`:

```javascript
async _capturePhoto() {
    const canvas = document.getElementById('fullsize-canvas')
    const blob = await capturePhoto(canvas)
    console.log(`[Photobomb] Photo captured: ${(blob.size / 1024).toFixed(0)}KB`)
    // Gallery integration in Task 9
}
```

Don't forget the import at top of app.js:
```javascript
import { capturePhoto, startVideoRecording } from './capture.js'
```

**Step 3: Verify photo capture**

Run dev server, click into fullsize view, click shutter.
Expected: 3-2-1 countdown, white flash, console logs blob size.

**Step 4: Commit**

```bash
git add public/js/capture.js public/js/app.js
git commit -m "feat: photo capture with countdown and flash"
```

---

## Task 8: Video Recording

**Files:**
- Modify: `public/js/app.js`

**Step 1: Add video recording methods to PhotobombApp**

```javascript
_toggleVideoRecording() {
    if (this._recording) {
        this._stopVideoRecording()
    } else {
        this._startVideoRecording()
    }
}

_startVideoRecording() {
    const canvas = document.getElementById('fullsize-canvas')
    this._recording = startVideoRecording(canvas)

    // Update UI
    const shutter = document.getElementById('shutter-btn')
    shutter.classList.add('recording')
    document.getElementById('recording-status').classList.remove('hidden')

    // Update timer
    this._timerInterval = setInterval(() => {
        const secs = Math.floor(this._recording.elapsed())
        const mins = Math.floor(secs / 60)
        const remainder = secs % 60
        document.getElementById('recording-timer').textContent =
            `${mins}:${String(remainder).padStart(2, '0')}`
    }, 250)
}

async _stopVideoRecording() {
    if (!this._recording) return

    clearInterval(this._timerInterval)
    const blob = await this._recording.stop()
    this._recording = null

    // Update UI
    const shutter = document.getElementById('shutter-btn')
    shutter.classList.remove('recording')
    document.getElementById('recording-status').classList.add('hidden')
    document.getElementById('recording-timer').textContent = '0:00'

    console.log(`[Photobomb] Video captured: ${(blob.size / 1024 / 1024).toFixed(1)}MB`)
    // Gallery integration in Task 9
}
```

Also add `this._recording = null` and `this._timerInterval = null` to the constructor.

**Step 2: Verify video recording**

Run dev server, switch to Video mode, click shutter to start recording, click again to stop.
Expected: Red square appears in shutter button, recording indicator with timer, console logs blob size on stop.

**Step 3: Commit**

```bash
git add public/js/app.js
git commit -m "feat: video recording with timer and recording indicator"
```

---

## Task 9: Gallery Filmstrip

**Files:**
- Create: `public/js/gallery.js`
- Modify: `public/js/app.js`

**Step 1: Create gallery.js**

```javascript
/**
 * Gallery module — filmstrip of captured photos/videos
 *
 * Stores captures in memory with thumbnails displayed in the filmstrip.
 * Supports preview, download, and delete.
 */

export class Gallery {
    /**
     * @param {HTMLElement} container - the filmstrip container element
     */
    constructor(container) {
        this._container = container
        this._captures = [] // { id, type, blob, thumbUrl, url }
        this._nextId = 1
    }

    /**
     * Add a captured photo or video to the gallery.
     * @param {'photo'|'video'} type
     * @param {Blob} blob
     * @param {HTMLCanvasElement} sourceCanvas - canvas to generate thumbnail from
     */
    async add(type, blob, sourceCanvas) {
        const id = this._nextId++
        const url = URL.createObjectURL(blob)

        // Generate thumbnail from canvas
        const thumbCanvas = document.createElement('canvas')
        thumbCanvas.width = 56
        thumbCanvas.height = 56
        const ctx = thumbCanvas.getContext('2d')

        // Center-crop to square
        const sw = sourceCanvas.width
        const sh = sourceCanvas.height
        const size = Math.min(sw, sh)
        const sx = (sw - size) / 2
        const sy = (sh - size) / 2
        ctx.drawImage(sourceCanvas, sx, sy, size, size, 0, 0, 56, 56)

        const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.7)

        const capture = { id, type, blob, thumbUrl, url }
        this._captures.push(capture)

        // Add thumbnail to filmstrip
        const thumb = document.createElement('img')
        thumb.className = 'filmstrip-thumb'
        thumb.src = thumbUrl
        thumb.title = `${type === 'photo' ? 'Photo' : 'Video'} ${id}`
        thumb.dataset.id = id

        // Video indicator
        if (type === 'video') {
            thumb.style.border = '2px solid var(--accent)'
        }

        thumb.addEventListener('click', () => this._handleThumbClick(capture))
        this._container.appendChild(thumb)

        // Scroll to newest
        this._container.scrollLeft = this._container.scrollWidth

        return capture
    }

    _handleThumbClick(capture) {
        // Download on click
        const a = document.createElement('a')
        a.href = capture.url
        a.download = `photobomb-${capture.id}.${capture.type === 'photo' ? 'png' : 'webm'}`
        a.click()
    }

    /** Get total capture count */
    get count() { return this._captures.length }
}
```

**Step 2: Wire gallery into app.js**

Add import:
```javascript
import { Gallery } from './gallery.js'
```

In constructor:
```javascript
this._gallery = null
```

In `init()`, after camera start:
```javascript
// Initialize gallery
const filmstrip = document.getElementById('filmstrip')
this._gallery = new Gallery(filmstrip)
```

Update `_capturePhoto`:
```javascript
async _capturePhoto() {
    const canvas = document.getElementById('fullsize-canvas')
    const blob = await capturePhoto(canvas)
    await this._gallery.add('photo', blob, canvas)
    console.log(`[Photobomb] Photo captured: ${(blob.size / 1024).toFixed(0)}KB`)
}
```

Update `_stopVideoRecording`:
```javascript
async _stopVideoRecording() {
    if (!this._recording) return

    clearInterval(this._timerInterval)
    const blob = await this._recording.stop()
    this._recording = null

    const shutter = document.getElementById('shutter-btn')
    shutter.classList.remove('recording')
    document.getElementById('recording-status').classList.add('hidden')
    document.getElementById('recording-timer').textContent = '0:00'

    const canvas = document.getElementById('fullsize-canvas')
    await this._gallery.add('video', blob, canvas)
    console.log(`[Photobomb] Video captured: ${(blob.size / 1024 / 1024).toFixed(1)}MB`)
}
```

**Step 3: Verify gallery**

Run dev server, capture a photo and video. Expected: thumbnails appear in filmstrip with scroll. Clicking a thumbnail downloads the file. Videos have red border.

**Step 4: Commit**

```bash
git add public/js/gallery.js public/js/app.js
git commit -m "feat: gallery filmstrip with capture thumbnails and download"
```

---

## Task 10: End-to-End Verification and Polish

**Files:**
- Modify: various CSS/JS as needed

**Step 1: Full workflow test**

Manual test checklist:
1. App loads, camera permission requested
2. 3x3 grid shows 9 live effect previews
3. "Effects" tab is active by default
4. Click "Distortions" tab — grid updates with distortion effects
5. Hover over tile — effect name label fades in
6. Click tile — smooth fade to fullsize view with effect name displayed
7. Photo mode: shutter is white, click → 3-2-1 → flash → thumbnail in filmstrip
8. Switch to Video mode: shutter turns red
9. Click shutter → recording indicator + timer → click again → stop → thumbnail in filmstrip (red border)
10. Click "Grid" → smooth fade back to grid view
11. Click thumbnail in filmstrip → downloads file

**Step 2: Fix any issues found during testing**

Address rendering, layout, or timing issues discovered in Step 1.

**Step 3: Commit**

```bash
git add -A
git commit -m "polish: end-to-end verification and fixes"
```

---

## Task 11: Playwright E2E Test

**Files:**
- Create: `tests/app.spec.js`
- Create: `playwright.config.js`

**Step 1: Create playwright.config.js**

```javascript
import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:3005',
        permissions: ['camera'],
    },
    webServer: {
        command: 'npx http-server public -p 3005 -c-1',
        port: 3005,
        reuseExistingServer: true,
    },
})
```

**Step 2: Create basic E2E test**

```javascript
import { test, expect } from '@playwright/test'

test.describe('Photobomb', () => {
    test('loads and shows grid view', async ({ page, context }) => {
        // Grant camera permission with fake device
        await context.grantPermissions(['camera'])

        await page.goto('/')
        await expect(page.locator('#title-bar')).toContainText('PHOTOBOMB')
        await expect(page.locator('.grid-container')).toBeVisible()
        await expect(page.locator('.grid-tile')).toHaveCount(9)
        await expect(page.locator('.tab-btn')).toHaveCount(2)
    })

    test('switches tabs', async ({ page, context }) => {
        await context.grantPermissions(['camera'])
        await page.goto('/')

        const distortionsTab = page.locator('.tab-btn', { hasText: 'Distortions' })
        await distortionsTab.click()
        await expect(distortionsTab).toHaveClass(/active/)
    })
})
```

**Step 3: Run tests**

Run: `npx playwright test`
Expected: Both tests pass.

**Step 4: Commit**

```bash
git add tests/ playwright.config.js
git commit -m "test: playwright E2E tests for grid view and tab switching"
```
