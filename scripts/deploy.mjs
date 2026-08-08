import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const stateFile = join(root, '.deploy-state.json');

/** Locked production Web App — updated in place on every npm run deploy */
const DEFAULT_DEPLOYMENT_ID = 'AKfycbx7hW5XO0qGwApnthIHOLxevSrGwyxm7K1P1NCbmmZyyDbv1InzKibX2WY-JgE4FSgYWQ';
const SCRIPT_ID = '1zONm-pkadJXG9_JoV7tb9maJeEfX6WlUW8stHSB18FaWrXQgFCWZdw32';

function run(cmd) {
  console.log('> ' + cmd);
  return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
}

let state = {};
if (existsSync(stateFile)) {
  try {
    const raw = readFileSync(stateFile, 'utf8').replace(/^\uFEFF/, '').trim();
    state = JSON.parse(raw);
  } catch {
    state = {};
  }
}

if (!state.deploymentId && process.env.GAS_DEPLOYMENT_ID) {
  state.deploymentId = process.env.GAS_DEPLOYMENT_ID;
}
if (!state.deploymentId) {
  state.deploymentId = DEFAULT_DEPLOYMENT_ID;
}

const stamp = new Date().toISOString();
const description = `GovTaskPro production ${stamp}`;

const out = run(`npx @google/clasp deploy -i ${state.deploymentId} -d "${description}"`);
console.log(out);

state.webAppUrl = `https://script.google.com/macros/s/${state.deploymentId}/exec`;
writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', 'utf8');

console.log(run('npx @google/clasp deployments'));
console.log('\nWeb App URL: ' + state.webAppUrl);
console.log('Editor: https://script.google.com/d/' + SCRIPT_ID + '/edit');
console.log('\nIf URL shows "need access": Deploy → Manage deployments → Edit → Who has access: Anyone → Deploy');
