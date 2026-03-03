/**
 * Photobox — Photo Booth clone powered by Noisemaker
 */

import { PhotoboxRenderer } from './noisemaker/index.js'
import { Camera } from './camera.js'
import { EffectGrid } from './grid.js'
import { TABS, getTabEffects } from './effects.js'
import { capturePhoto, startVideoRecording } from './capture.js'
import { Gallery } from './gallery.js'
import { enableSwipe } from './swipe.js'
import { aboutDialog } from './about-dialog.js'

class PhotoboxApp {
    constructor() {
        this._initialized = false
        this._camera = new Camera()
        this._grid = null
        this._fullsizeRenderer = null
        this._currentTab = 0
        this._currentEffect = null
        this._mode = 'photo' // 'photo' | 'video'
        this._view = 'grid'  // 'grid' | 'fullsize'
        this._recording = null
        this._timerInterval = null
        this._gallery = null
        this._busy = false
        this._swipe = null
    }

    async init() {
        if (this._initialized) return
        console.log('[Photobox] Initializing...')

        // Start camera
        try {
            await this._camera.start()
            console.log(`[Photobox] Camera: ${this._camera.width}x${this._camera.height}`)
        } catch (err) {
            console.error('[Photobox] Camera access denied:', err)
            const stage = document.getElementById('stage')
            stage.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-dim);"><p style="font-size: 18px; margin-bottom: 8px;">Camera access required</p><p>Please allow camera access and reload the page.</p></div>'
            return
        }

        // Initialize gallery
        const filmstrip = document.getElementById('filmstrip-thumbs')
        this._gallery = new Gallery(filmstrip)
        await this._gallery.init()

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
        this._fullsizeRenderer = new PhotoboxRenderer(fullsizeCanvas, {
            width: this._camera.width,
            height: this._camera.height,
            preserveDrawingBuffer: true
        })
        await this._fullsizeRenderer.init()
        this._fullsizeRenderer.setVideoSource(this._camera.video)

        // Wire up controls
        this._setupControls()

        // Show camera flip button if multiple cameras available
        this._checkMultipleCameras()

        this._initialized = true
        console.log('[Photobox] Ready')

        this._showWelcomeToast()
    }

    _showWelcomeToast() {
        const toast = document.createElement('div')
        toast.className = 'welcome-toast'
        toast.innerHTML = 'Welcome to Photobox.<br>All data stays on your machine. Nothing is uploaded or transmitted.'
        document.getElementById('app').appendChild(toast)

        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('visible'))
        })

        setTimeout(() => {
            toast.classList.remove('visible')
            toast.addEventListener('transitionend', () => toast.remove())
            setTimeout(() => { if (toast.parentNode) toast.remove() }, 3000)
        }, 5000)
    }

    _setEffectName(name) {
        document.getElementById('effect-name').textContent = name
        const mobile = document.getElementById('effect-name-mobile')
        if (mobile) mobile.textContent = name
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

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === tabIndex)
        })

        await this._grid.loadEffects(TABS[tabIndex].effects)
    }

    async _enterFullsize(tileIndex) {
        if (this._view === 'fullsize' || this._busy) return
        const effect = TABS[this._currentTab].effects[tileIndex]
        if (!effect) return
        this._busy = true
        try {
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
            this._setEffectName(effect.name)
            gridView.classList.add('hidden')
            gridView.classList.remove('fading')
            fullsizeView.classList.remove('hidden')
            this._view = 'fullsize'

            document.getElementById('tab-bar').classList.add('hidden')
            document.getElementById('filmstrip-thumbs').classList.remove('hidden')

            // Enable swipe gestures
            const canvasWrapper = document.querySelector('.fullsize-canvas-wrapper')
            this._swipe = enableSwipe(canvasWrapper, {
                onSwipeLeft: () => this._cycleEffect(1),
                onSwipeRight: () => this._cycleEffect(-1)
            })
        } finally {
            this._busy = false
        }
    }

    async _exitFullsize() {
        if (this._recording) {
            await this._stopVideoRecording()
        }

        const gridView = document.getElementById('grid-view')
        const fullsizeView = document.getElementById('fullsize-view')

        fullsizeView.classList.add('fading')
        await new Promise(r => setTimeout(r, 200))

        if (this._swipe) {
            this._swipe.destroy()
            this._swipe = null
        }

        this._fullsizeRenderer.stop()

        fullsizeView.classList.add('hidden')
        fullsizeView.classList.remove('fading')
        gridView.classList.remove('hidden')
        this._view = 'grid'

        document.getElementById('tab-bar').classList.remove('hidden')
        document.getElementById('filmstrip-thumbs').classList.add('hidden')

        this._grid.resumeAll()
    }

    async _capturePhoto() {
        if (this._busy) return
        this._busy = true
        try {
            const canvas = document.getElementById('fullsize-canvas')
            const blob = await capturePhoto(canvas)
            const capture = await this._gallery.add('photo', blob, canvas)
            this._gallery.download(capture)
            console.log(`[Photobox] Photo captured: ${(blob.size / 1024).toFixed(0)}KB`)
        } catch (err) {
            console.error('[Photobox] Photo capture failed:', err)
        } finally {
            this._busy = false
        }
    }

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

        const shutter = document.getElementById('shutter-btn')
        shutter.classList.remove('recording')
        document.getElementById('recording-status').classList.add('hidden')
        document.getElementById('recording-timer').textContent = '0:00'

        const canvas = document.getElementById('fullsize-canvas')
        const capture = await this._gallery.add('video', blob, canvas)
        this._gallery.download(capture)
        console.log(`[Photobox] Video captured: ${(blob.size / 1024 / 1024).toFixed(1)}MB`)
    }

    async _cycleEffect(direction) {
        if (this._busy || this._recording) return
        this._busy = true
        try {
            const effects = getTabEffects(this._currentTab, true)
            const currentIndex = effects.findIndex(e => e.name === this._currentEffect.name)
            let nextIndex = currentIndex + direction
            if (nextIndex < 0) nextIndex = effects.length - 1
            if (nextIndex >= effects.length) nextIndex = 0

            const effect = effects[nextIndex]
            this._currentEffect = { ...effect, tileIndex: nextIndex }

            await this._fullsizeRenderer.compile(effect.dsl)
            this._setEffectName(effect.name)
        } finally {
            this._busy = false
        }
    }

    async _checkMultipleCameras() {
        try {
            const devices = await Camera.listDevices()
            if (devices.length >= 2) {
                document.getElementById('camera-flip-btn').classList.remove('hidden')
                document.querySelector('.camera-flip-divider').classList.remove('hidden')
            }
        } catch (err) {
            console.warn('[Photobox] Could not enumerate cameras:', err)
        }
    }

    async _switchCamera() {
        if (this._busy) return
        this._busy = true
        try {
            await this._camera.switchFacingMode()
            this._grid.setVideoSource(this._camera.video)
            this._fullsizeRenderer.setVideoSource(this._camera.video)
            console.log(`[Photobox] Switched to ${this._camera.facingMode} camera`)
        } catch (err) {
            console.error('[Photobox] Camera switch failed:', err)
        } finally {
            this._busy = false
        }
    }

    _setupControls() {
        // Grid back button
        document.getElementById('grid-back-btn').addEventListener('click', () => {
            this._exitFullsize()
        })

        document.getElementById('grid-back-btn-mobile')?.addEventListener('click', () => {
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

        // About button
        document.getElementById('about-btn').addEventListener('click', () => {
            aboutDialog.show()
        })

        // Mirror / flip button
        document.getElementById('mirror-btn').addEventListener('click', () => {
            document.getElementById('app').classList.toggle('mirrored')
            document.getElementById('mirror-btn').classList.toggle('active')
        })

        // Camera flip button
        document.getElementById('camera-flip-btn').addEventListener('click', async () => {
            await this._switchCamera()
        })

        // Shutter button
        document.getElementById('shutter-btn').addEventListener('click', async () => {
            if (this._mode === 'photo') {
                await this._capturePhoto()
            } else {
                this._toggleVideoRecording()
            }
        })
    }
}

const app = new PhotoboxApp()
app.init().catch(err => console.error('[Photobox] Init failed:', err))
