import { test, expect } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const passing = { expected: 1, unexpected: 0, flaky: 0, skipped: 0 }

function run(behavior = {}, args = []) {
    const dir = mkdtempSync(join(tmpdir(), 'photobox-runner-test-'))
    try {
        mkdirSync(join(dir, 'scripts'))
        mkdirSync(join(dir, 'node_modules', '@playwright', 'test'), { recursive: true })
        mkdirSync(join(dir, 'test-results'))
        copyFileSync(new URL('../scripts/run-e2e.mjs', import.meta.url), join(dir, 'scripts', 'run-e2e.mjs'))
        writeFileSync(join(dir, 'behavior.json'), JSON.stringify({ report: { stats: passing }, ...behavior }))
        // A previous successful report must never bless a run that wrote none.
        writeFileSync(join(dir, 'test-results', 'e2e-report.json'), JSON.stringify({ stats: passing }))
        writeFileSync(join(dir, 'node_modules', '@playwright', 'test', 'cli.js'), `
const fs = require('node:fs')
const behavior = JSON.parse(fs.readFileSync('behavior.json', 'utf8'))
if (process.argv[2] === 'install') process.exit(behavior.installExit || 0)
fs.writeFileSync('args.json', JSON.stringify(process.argv.slice(2)))
if (behavior.mode !== 'missing') {
    fs.writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_NAME,
        behavior.mode === 'invalid' ? '{invalid' : JSON.stringify(behavior.report))
}
process.exit(behavior.exit || 0)
`)
        const result = spawnSync(process.execPath, [join(dir, 'scripts', 'run-e2e.mjs'), ...args], {
            cwd: dir,
            env: { ...process.env, GITHUB_STEP_SUMMARY: join(dir, 'summary.md') },
            encoding: 'utf8',
        })
        if (result.error) throw result.error
        return {
            ...result,
            args: existsSync(join(dir, 'args.json')) ? JSON.parse(readFileSync(join(dir, 'args.json'), 'utf8')) : null,
        }
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
}

test('runner accepts a complete passing report and forwards arguments without shell parsing', () => {
    const result = run({}, ['--grep', 'a title with spaces'])
    expect(result.status).toBe(0)
    expect(result.args).toEqual(['test', '--grep', 'a title with spaces', '--reporter=list,json'])
    expect(result.stdout).toContain('1 passed, 0 failed, 0 flaky, 0 skipped')
})

test('runner rejects empty, incomplete, failed, flaky and skipped summaries', () => {
    for (const stats of [
        {}, { ...passing, expected: 0 }, { ...passing, expected: -1 },
        { ...passing, unexpected: 1 }, { ...passing, flaky: 1 }, { ...passing, skipped: 1 },
    ]) {
        expect(run({ report: { stats } }).status, JSON.stringify(stats)).not.toBe(0)
    }
})

test('runner rejects missing and malformed fresh reports despite a stale passing report', () => {
    for (const mode of ['missing', 'invalid']) {
        const result = run({ mode })
        expect(result.status, mode).not.toBe(0)
        expect(result.stderr).toContain('Missing or invalid test report')
    }
})

test('runner preserves installation and test process failures', () => {
    const install = run({ installExit: 7 })
    expect(install.status).toBe(7)
    expect(install.args).toBeNull()
    expect(run({ exit: 9 }).status).toBe(9)
})
