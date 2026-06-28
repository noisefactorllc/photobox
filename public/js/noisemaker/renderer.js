// SPDX-License-Identifier: MIT
/**
 * PhotoboxRenderer — wraps CanvasRenderer for Photobox's use cases
 *
 * Two modes:
 *   - Grid tile: small canvas, single effect, shared camera video element
 *   - Full-size: large canvas, single effect, dedicated view
 */

import { CanvasRenderer, extractEffectNamesFromDsl, getAllEffects } from './bundle.js'

const SHADER_CDN = 'https://shaders.noisedeck.app/1'

// Reused per-frame texture-upload options — avoids allocating a fresh object
// on every animation frame for every renderer.
const FLIP_Y_FALSE = { flipY: false }

export class PhotoboxRenderer {
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
            preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
            onError: options.onError
        })

        this._initialized = false
        this._videoSource = null
        this._animRAF = null
        this._currentDsl = ''
        // imageSize is constant between resize/compile; track when it needs
        // re-applying so we don't re-walk every pipeline pass on every frame.
        this._imageSizeDirty = true
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

        // Load any unregistered effects referenced by the DSL
        const effectData = extractEffectNamesFromDsl(dsl, this._renderer.manifest || {})
        const registeredEffects = getAllEffects()
        const effectIdsToLoad = effectData
            .map(e => e.effectId)
            .filter(id => {
                const dotKey = id.replace('/', '.')
                return !registeredEffects.has(id) && !registeredEffects.has(dotKey)
            })
        if (effectIdsToLoad.length > 0) {
            await this._renderer.loadEffects(effectIdsToLoad)
        }

        await this._renderer.compile(dsl)
        this._imageSizeDirty = true // fresh pipeline — imageSize must be re-applied
        this._renderer.start()
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
        // Texture ID must match compiled step: media() is always step 0
        this._renderer.updateTextureFromSource?.('imageTex_step_0', this._videoSource, FLIP_Y_FALSE)
        // imageSize must match canvas resolution (shader maps gl_FragCoord.xy /
        // imageSize). It's constant between resize/compile, and applying it walks
        // every pipeline pass, so apply only when it actually changed.
        if (this._imageSizeDirty) {
            this._renderer.applyStepParameterValues?.({ step_0: { imageSize: [this.width, this.height] } })
            this._imageSizeDirty = false
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

    /** Resume rendering (lightweight restart without recompiling) */
    resume() {
        if (!this._currentDsl) return
        // imageSize is intentionally NOT marked dirty here: start()/stop() only
        // toggle the render loop and leave the pipeline's uniforms intact, so the
        // value applied at the last compile/resize is still in effect.
        this._renderer.start()
        this._uploadVideoTexture()
        this._startLoop()
    }

    stop() {
        if (this._animRAF) {
            cancelAnimationFrame(this._animRAF)
            this._animRAF = null
        }
        this._renderer.stop?.()
    }

    resize(width, height) {
        this.width = width
        this.height = height
        this._imageSizeDirty = true // imageSize tracks canvas resolution
        this._renderer.resize?.(width, height)
    }

    destroy() {
        this.stop()
        this._renderer.destroy?.()
        this._videoSource = null
    }
}
