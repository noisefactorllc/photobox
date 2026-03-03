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

export const NORMAL = {
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
                name: 'Comic',
                dsl: `search synth, filter\n\nmedia().celShading(mix: 0.75, edgeThreshold: 0.25).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Noir',
                dsl: `search synth, filter\n\nmedia().grade(preset: noir).write(o0)\n\nrender(o0)`
            },
            NORMAL,
            {
                name: 'Bloom',
                dsl: `search synth, filter\n\nmedia().bloom(threshold: 0.65, softKnee: 0.1, intensity: 0.55, radius: 69, taps: 25).vignette(brightness: 0.17, alpha: 0.85).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Edge',
                dsl: `search synth, filter\n\nmedia().edge(threshold: 20).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Cinema',
                dsl: `search synth, filter\n\nmedia().grade(preset: cinematic).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Invert',
                dsl: `search synth, filter\n\nmedia().inv().write(o0)\n\nrender(o0)`
            }
        ]
    },
    {
        name: 'Distortions',
        effects: [
            {
                name: 'Bulge',
                dsl: `search synth, filter\n\nmedia().bulge().write(o0)\n\nrender(o0)`
            },
            {
                name: 'Pinch',
                dsl: `search synth, filter\n\nmedia().pinch(strength: 42).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Spiral',
                dsl: `search synth, filter\n\nmedia().spiral(strength: -100, speed: 1).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Mirror',
                dsl: `search synth, filter\n\nmedia().flipMirror(mode: mirrorRtoL).write(o0)\n\nrender(o0)`
            },
            NORMAL,
            {
                name: 'Warp',
                dsl: `search synth, filter\n\nmedia().warp(strength: 30, speed: 5).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Wavy',
                dsl: `search synth, filter\n\nmedia().waves(strength: 9.25, speed: 5, rotation: -45).waves(strength: 5.66, speed: 5, rotation: 45).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Legion',
                dsl: `search synth, filter\n\nmedia().seamless(blend: 0.5, repeat: 3).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Bizarro',
                dsl: `search synth, filter, classicNoisedeck\n\nmedia().cellRefract(amount: 14.2, speed: 5, shape: triangle, scale: 51.43, cellScale: 100).write(o0)\n\nrender(o0)`
            }
        ]
    }
]

/**
 * Get effects for a tab, optionally excluding Normal.
 * @param {number} tabIndex
 * @param {boolean} excludeNormal - if true, filter out the Normal effect
 * @returns {Array<{name: string, dsl: string}>}
 */
export function getTabEffects(tabIndex, excludeNormal = false) {
    const effects = TABS[tabIndex]?.effects || []
    if (!excludeNormal) return effects
    return effects.filter(e => e !== NORMAL)
}
