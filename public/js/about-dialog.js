import { BUNDLE_VERSION } from './noisemaker/index.js'
import { AboutDialog } from 'handfish'

const APP_VERSION = '0.9.0-SNAPSHOT'
const SHADER_CDN = 'https://shaders.noisedeck.app'

const about = new AboutDialog({
    name: 'Photobox',
    version: APP_VERSION,
    logo: '<img src="icon.svg" alt="Photobox" draggable="false">',
    repo: 'noisefactorllc/photobox',
    ecosystem: 'Photobox is a free tool by <a href="https://noisefactor.io/" target="_blank" rel="noopener">Noise Factor</a>, powered by the <a href="https://noisemaker.app/" target="_blank" rel="noopener">Noisemaker</a> open source engine. <a href="https://noisedeck.app/" target="_blank" rel="noopener">Noisedeck</a> is our video synth. Free to use, with a $4/mo subscription for pro features.',
})

fetch('./deployment-meta.json', { cache: 'no-store' }).then(async (res) => {
    if (!res.ok) return
    const data = await res.json()
    const hash = data.git_hash?.trim().slice(0, 8) || 'LOCAL'
    let deployed = 'n/a'
    if (data.date) {
        const d = new Date(data.date * 1000)
        const pad = (n) => String(n).padStart(2, '0')
        deployed = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    about.setBuild({ hash, deployed })
}).catch(() => {})

fetch(`${SHADER_CDN}/${BUNDLE_VERSION}/noisemaker-shaders-core.esm.js`, { cache: 'no-store' }).then(async (res) => {
    if (!res.ok) return
    const reader = res.body.getReader()
    const { value } = await reader.read()
    reader.cancel()
    const match = new TextDecoder().decode(value).slice(0, 500).match(/^\s*\*\s*Build:\s*(\S+)/m)
    if (match) about.setNoisemaker(match[1])
}).catch(() => {})

export { about as aboutDialog }
