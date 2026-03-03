// SPDX-License-Identifier: MIT
/**
 * Gallery module — filmstrip of captured photos/videos
 *
 * Stores captures in memory + IndexedDB for persistence.
 * Supports preview, download, and delete.
 */

import { saveCapture, deleteCapture, loadAllCaptures, getMaxId } from './db.js'

export class Gallery {
    /**
     * @param {HTMLElement} container - the filmstrip container element
     */
    constructor(container) {
        this._container = container
        this._captures = [] // { id, type, blob, thumbUrl }
        this._nextId = 1
    }

    /** Load persisted captures from IndexedDB */
    async init() {
        try {
            const saved = await loadAllCaptures()
            this._nextId = (await getMaxId()) + 1
            for (const capture of saved) {
                this._captures.push(capture)
                this._addThumbElement(capture)
            }
            if (saved.length > 0) {
                console.log(`[Gallery] Restored ${saved.length} captures from IndexedDB`)
            }
        } catch (err) {
            console.warn('[Gallery] Failed to load from IndexedDB:', err)
        }
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

        const thumbUrl = this._generateThumbnail(sourceCanvas)

        const capture = { id, type, blob, thumbUrl }
        this._captures.push(capture)
        this._addThumbElement(capture)

        // Scroll to newest
        this._container.scrollLeft = this._container.scrollWidth

        // Persist (fire-and-forget)
        saveCapture({ id, type, blob, thumbUrl }).catch(err =>
            console.warn('[Gallery] Failed to persist capture:', err)
        )

        return capture
    }

    /** Generate a 56x56 center-cropped thumbnail data URL from a canvas */
    _generateThumbnail(sourceCanvas) {
        const thumbCanvas = document.createElement('canvas')
        thumbCanvas.width = 56
        thumbCanvas.height = 56
        const ctx = thumbCanvas.getContext('2d')

        const sw = sourceCanvas.width
        const sh = sourceCanvas.height
        const size = Math.min(sw, sh)
        const sx = (sw - size) / 2
        const sy = (sh - size) / 2
        ctx.drawImage(sourceCanvas, sx, sy, size, size, 0, 0, 56, 56)

        return thumbCanvas.toDataURL('image/jpeg', 0.7)
    }

    /** Create and append a thumbnail DOM element for a capture */
    _addThumbElement(capture) {
        const wrapper = document.createElement('div')
        wrapper.className = 'filmstrip-item'
        wrapper.dataset.id = capture.id

        const thumb = document.createElement('img')
        thumb.className = 'filmstrip-thumb'
        thumb.src = capture.thumbUrl
        thumb.title = `${capture.type === 'photo' ? 'Photo' : 'Video'} ${capture.id}`

        if (capture.type === 'video') {
            thumb.style.border = '2px solid var(--accent)'
        }

        thumb.addEventListener('click', () => this._handleThumbClick(capture))

        const deleteBtn = document.createElement('button')
        deleteBtn.className = 'filmstrip-delete'
        deleteBtn.textContent = '\u00d7'
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this._deleteCapture(capture.id)
        })

        wrapper.appendChild(thumb)
        wrapper.appendChild(deleteBtn)
        this._container.appendChild(wrapper)
    }

    _deleteCapture(id) {
        this._captures = this._captures.filter(c => c.id !== id)
        const wrapper = this._container.querySelector(`.filmstrip-item[data-id="${id}"]`)
        if (wrapper) wrapper.remove()
        deleteCapture(id).catch(err =>
            console.warn('[Gallery] Failed to delete from IndexedDB:', err)
        )
    }

    _handleThumbClick(capture) {
        this.download(capture)
    }

    download(capture) {
        const url = URL.createObjectURL(capture.blob)
        const a = document.createElement('a')
        a.href = url
        const ext = capture.type === 'photo' ? 'png'
            : capture.blob.type.includes('mp4') ? 'mp4' : 'webm'
        a.download = `photobox-${capture.id}.${ext}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    /** Get total capture count */
    get count() { return this._captures.length }
}
