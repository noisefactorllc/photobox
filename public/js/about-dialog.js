import { AboutDialog } from 'handfish'

const APP_VERSION = '0.9.0-SNAPSHOT'

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

// Noisemaker engine metadata: the AboutDialog fetches it directly from
// shaders.noisedeck.app/1/deployment-meta.json (a proper JSON file
// emitted by the scaffold library-release workflow on every noisemaker
// release). The /0/ rolling symlink auto-tracks the latest patch within
// major 0.
about.setNoisemakerFromUrl('https://shaders.noisedeck.app/1/deployment-meta.json')

export { about as aboutDialog }
