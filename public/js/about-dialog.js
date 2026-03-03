/**
 * About Dialog
 *
 * Displays application info, version, and deployment metadata.
 */

import { BUNDLE_VERSION } from './noisemaker/index.js'

const APP_VERSION = '0.1.0-SNAPSHOT'
const SHADER_CDN = 'https://shaders.noisedeck.app'

class AboutDialog {
    constructor() {
        this._dialog = null
        this._metadata = null
        this._metadataFetched = false
        this._noisemakerVersion = null
    }

    async show() {
        if (!this._dialog) {
            this._createDialog()
        }
        this._dialog.showModal()

        if (!this._metadataFetched) {
            await this._fetchDeploymentMetadata()
        }
    }

    hide() {
        if (this._dialog) {
            this._dialog.close()
        }
    }

    async _fetchDeploymentMetadata() {
        const defaults = { gitHash: 'LOCAL', deployed: 'n/a' }

        try {
            const response = await fetch('./deployment-meta.json', { cache: 'no-store' })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const data = await response.json()
            const rawHash = typeof data?.git_hash === 'string' ? data.git_hash.trim() : ''
            const normalizedHash = rawHash ? rawHash.replace(/\s+/g, '').slice(0, 8) : 'LOCAL'
            const normalizedTimestamp = this._normalizeTimestamp(data?.date)
            const formattedDate = typeof normalizedTimestamp === 'number'
                ? this._formatDate(normalizedTimestamp)
                : 'n/a'

            this._metadata = {
                gitHash: normalizedHash || 'LOCAL',
                deployed: formattedDate
            }
        } catch (error) {
            console.warn('[AboutDialog] Failed to fetch deployment metadata:', error)
            this._metadata = defaults
        }

        this._metadataFetched = true
        this._updateBuildInfo()

        await this._fetchNoisemakerVersion()
    }

    async _fetchNoisemakerVersion() {
        try {
            const response = await fetch(`${SHADER_CDN}/${BUNDLE_VERSION}/noisemaker-shaders-core.esm.js`, { cache: 'no-store' })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const reader = response.body.getReader()
            const { value } = await reader.read()
            reader.cancel()
            const headerText = new TextDecoder().decode(value).slice(0, 500)
            const match = headerText.match(/^\s*\*\s*Build:\s*(\S+)/m)
            if (match) {
                this._noisemakerVersion = match[1]
                this._updateBuildInfo()
            }
        } catch (error) {
            console.warn('[AboutDialog] Failed to fetch noisemaker version:', error)
        }
    }

    _normalizeTimestamp(value) {
        if (typeof value === 'number' && Number.isFinite(value)) return value
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number(value.trim())
            if (Number.isFinite(parsed)) return parsed
        }
        return null
    }

    _formatDate(timestampSeconds) {
        if (!Number.isFinite(timestampSeconds)) return 'n/a'
        const date = new Date(timestampSeconds * 1000)
        if (Number.isNaN(date.getTime())) return 'n/a'

        const pad = (v, len = 2) => String(Math.trunc(v)).padStart(len, '0')
        return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    _updateBuildInfo() {
        if (!this._dialog) return

        const buildInfoEl = this._dialog.querySelector('.about-modal-build:not(.noisemaker-version)')
        if (buildInfoEl && this._metadata) {
            const hash = this._metadata.gitHash
            if (hash && hash !== 'LOCAL') {
                buildInfoEl.innerHTML = `build: <a href="https://github.com/noisedeck/photobox/tree/${hash}" class="about-modal-link" target="_blank" rel="noopener">${hash}</a> / deployed: ${this._metadata.deployed}`
            } else {
                buildInfoEl.textContent = `build: ${hash} / deployed: ${this._metadata.deployed}`
            }
        }

        const nmVersionEl = this._dialog.querySelector('.about-modal-build.noisemaker-version')
        if (nmVersionEl) {
            if (this._noisemakerVersion) {
                nmVersionEl.innerHTML = `noisemaker: <a href="https://github.com/noisedeck/noisemaker/tree/${this._noisemakerVersion}" class="about-modal-link" target="_blank" rel="noopener">${this._noisemakerVersion}</a>`
            } else {
                nmVersionEl.textContent = ''
            }
        }
    }

    _createDialog() {
        this._dialog = document.createElement('dialog')
        this._dialog.className = 'about-modal'
        this._dialog.innerHTML = `
            <div class="about-modal-content">
                <div class="about-modal-graphic" role="presentation">
                    <img class="about-modal-icon" src="icon.svg" alt="Photobox" draggable="false">
                </div>
                <div class="about-modal-details" tabindex="-1">
                    <div class="about-modal-title">Photobox</div>
                    <div class="about-modal-version">version ${APP_VERSION.replace(/-.*$/, '')}</div>
                    <div class="about-modal-copyright">&copy; 2026 <a href="https://noisefactor.io/" class="about-modal-link" target="_blank" rel="noopener">Noise Factor LLC.</a></div>
                    <div class="about-modal-build">build: local / deployed: n/a</div>
                    <div class="about-modal-build noisemaker-version"></div>
                    <div class="about-modal-ecosystem">Photobox is a free tool by <a href="https://noisefactor.io/" target="_blank" rel="noopener">Noise Factor</a>, powered by the <a href="https://noisemaker.app/" target="_blank" rel="noopener">Noisemaker</a> open source engine. <a href="https://noisedeck.app/" target="_blank" rel="noopener">Noisedeck</a> is our video synth. Free to use, with a $4/mo subscription for pro features.</div>
                </div>
            </div>
        `

        document.body.appendChild(this._dialog)

        this._dialog.addEventListener('click', (e) => {
            if (e.target === this._dialog) {
                this.hide()
            }
        })
    }
}

export const aboutDialog = new AboutDialog()
