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
    const deployed = data.date ? new Date(data.date * 1000) : null
    about.setBuild({ hash, deployed })
}).catch(() => {})

fetch(`${SHADER_CDN}/${BUNDLE_VERSION}/noisemaker-shaders-core.esm.js`, { cache: 'no-store' }).then(async (res) => {
    if (!res.ok) return
    const reader = res.body.getReader()
    const { value } = await reader.read()
    reader.cancel()
    const headerText = new TextDecoder().decode(value).slice(0, 500)
    const hashMatch = headerText.match(/^\s*\*\s*Build:\s*(\S+)/m)
    const dateMatch = headerText.match(/^\s*\*\s*Date:\s*(\S+)/m)
    about.setNoisemaker({
        version: BUNDLE_VERSION,
        hash: hashMatch ? hashMatch[1] : null,
        deployed: dateMatch ? new Date(dateMatch[1]) : null,
    })
}).catch(() => {})

export { about as aboutDialog }
