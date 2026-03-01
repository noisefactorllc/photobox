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

const NORMAL = {
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
                name: 'Glow',
                dsl: `search synth, classicNoisemaker\n\nmedia().vaseline(alpha: 0.6).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Comic Book',
                dsl: `search synth, filter\n\nmedia().edge(amount: 3).posterize(levels: 4).write(o0)\n\nrender(o0)`
            },
            NORMAL,
            {
                name: 'Color Pencil',
                dsl: `search synth, filter\n\nmedia().edge(amount: 2).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Thermal',
                dsl: `search synth, filter\n\nmedia().grade(preset: 5).write(o0)\n\nrender(o0)`
            },
            {
                name: 'X-Ray',
                dsl: `search synth, filter\n\nmedia().grade(preset: 3, exposure: 1).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Pop Art',
                dsl: `search synth, filter\n\nmedia().posterize(levels: 3).grade(saturation: 1.8).write(o0)\n\nrender(o0)`
            }
        ]
    },
    {
        name: 'Distortions',
        effects: [
            {
                name: 'Bulge',
                dsl: `search synth, filter\n\nmedia().bulge(strength: 40).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Dent',
                dsl: `search synth, filter\n\nmedia().pinch(strength: 40).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Twirl',
                dsl: `search synth, filter\n\nmedia().spiral(strength: 50).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Squeeze',
                dsl: `search synth, filter\n\nmedia().lens(displacement: -0.5).write(o0)\n\nrender(o0)`
            },
            NORMAL,
            {
                name: 'Mirror',
                dsl: `search synth, filter\n\nmedia().flipMirror(mode: mirrorLtoR).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Light Tunnel',
                dsl: `search synth, filter\n\nmedia().tunnel(speed: 1, scale: 0).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Fish Eye',
                dsl: `search synth, filter\n\nmedia().lens(displacement: 0.6).write(o0)\n\nrender(o0)`
            },
            {
                name: 'Stretch',
                dsl: `search synth, filter\n\nmedia().waves(strength: 30, scale: 1).write(o0)\n\nrender(o0)`
            }
        ]
    }
]

/** Get the effect at grid position (0-8) for the given tab index */
export function getEffect(tabIndex, tileIndex) {
    return TABS[tabIndex]?.effects[tileIndex] || NORMAL
}

/** Get all effect names for a tab */
export function getEffectNames(tabIndex) {
    return TABS[tabIndex]?.effects.map(e => e.name) || []
}
