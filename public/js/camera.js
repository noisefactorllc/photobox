// SPDX-License-Identifier: MIT
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
        this._facingMode = 'user'
    }

    /** The HTMLVideoElement playing the camera feed */
    get video() { return this._video }

    /** True if camera is active */
    get active() { return this._stream !== null }

    /** Current facing mode ('user' or 'environment') */
    get facingMode() { return this._facingMode }

    /** Camera resolution once started */
    get width() { return this._video.videoWidth || 0 }
    get height() { return this._video.videoHeight || 0 }

    /**
     * Start the camera. Requests user permission.
     * @param {object} options - { facingMode, deviceId, width, height }
     */
    async start(options = {}) {
        if (this._stream) this.stop()

        this._facingMode = options.facingMode || this._facingMode || 'user'

        const constraints = {
            video: {
                facingMode: this._facingMode,
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

    /** Toggle between front and rear camera */
    async switchFacingMode() {
        const next = this._facingMode === 'user' ? 'environment' : 'user'
        await this.start({ facingMode: next })
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
