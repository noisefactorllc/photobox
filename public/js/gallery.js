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

        // Force GPU flush before reading WebGL canvas
        const gl = sourceCanvas.getContext('webgl2') || sourceCanvas.getContext('webgl')
        if (gl) gl.finish()

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

        const capture = { id, type, blob, thumbUrl }
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
        const url = URL.createObjectURL(capture.blob)
        const a = document.createElement('a')
        a.href = url
        const ext = capture.type === 'photo' ? 'png'
            : capture.blob.type.includes('mp4') ? 'mp4' : 'webm'
        a.download = `photobomb-${capture.id}.${ext}`
        a.click()
        URL.revokeObjectURL(url)
    }

    /** Get total capture count */
    get count() { return this._captures.length }
}
