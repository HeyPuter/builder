import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: the shipped tools and Claude's strict-tool limit -------
// Claude accepts at most 20 tools with strict inputs in one request, and one
// over fails every request. Loads the actual shipped registry, so adding a tool
// cannot silently exceed it. Simple reads reserve strict mode for mutations and
// complex inputs; every tool remains available.

let checks = 0;
async function test(name, run) {
    await run(); checks++; console.log(`ok - ${name}`);
}

function loadTools() {
    const context = vm.createContext({ window: {} });
    vm.runInContext(fs.readFileSync(new URL('../src/js/tools.js', import.meta.url), 'utf8'), context);
    return context;
}

await test('the shipped tools stay within Claude’s strict-tool limit', () => {
    const context = loadTools();
    const config = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
    const scripts = config.match(/const SCRIPTS = \[([\s\S]*?)\];/);
    assert.ok(scripts, 'Could not find the shipped script list');
    const toolFiles = [...scripts[1].matchAll(/'(tools\/[^']+\.js)'/g)].map(match => match[1]);
    assert.ok(toolFiles.length > 20, 'Expected to exercise a tool list larger than the strict limit');
    for (const file of toolFiles) {
        vm.runInContext(fs.readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
    }
    const { window } = context;
    assert.equal(window.tools.length, toolFiles.length, 'All shipped tools must register');
    const strictTools = window.builtinTools().filter(tool => tool.function.strict === true);
    assert.ok(strictTools.length <= 20,
        `Too many strict tools (${strictTools.length}): ${strictTools.map(tool => tool.function.name).join(', ')}`);
    for (const name of ['write', 'edit', 'multi_edit', 'delete', 'mkdir', 'rename', 'copy', 'move',
        'create_worker', 'delete_worker', 'publish_site', 'TodoWrite', 'AskClarifyingQuestions']) {
        assert.equal(window.findTool(name)?.function.strict, true, `${name} must keep strict inputs`);
    }
});

await test('a turn dispatches to the tools it started with', async () => {
    const context = loadTools();
    const { window } = context;
    window.tools.push({ function: { name: 'fixture' }, exec: () => 'new' });
    const snapshot = [{ function: { name: 'fixture' }, exec: () => 'captured' }];
    assert.equal(await window.executeFunction('fixture', {}, { tools: snapshot }), 'captured');
    const history = [];
    context.addToolResultToHistory(history, 'call', { error: 'x' }, true);
    assert.equal(history[0].content.is_error, true);
    const app = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
    assert.ok(app.includes('tools: turnTools'));
});

console.log(`\n${checks} strict-tool checks passed.`);
