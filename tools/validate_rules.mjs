// Portable Node adapter for the existing rules suite in validate.js.
// The WSH runner remains available for direct Windows comparison.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const projectRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const suitePath = fileURLToPath(new URL('./validate.js', import.meta.url));
const runnerPath = fileURLToPath(import.meta.url);

class LegacyQuit extends Error {
  constructor(code) {
    super(`WSH suite exited with code ${code}`);
    this.code = code;
  }
}

class MissingRuleData extends Error {
  constructor(rootDirectory, filePath) {
    super(`Required generated rule data is missing: ${path.relative(rootDirectory, filePath)}`);
    this.filePath = filePath;
  }
}

function nativePath(legacyPath) {
  return path.resolve(String(legacyPath).replace(/[\\/]/g, path.sep));
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function fileSystemObject(rootDirectory) {
  return {
    GetParentFolderName(value) {
      return path.dirname(nativePath(value)).replace(/[\\/]/g, '\\');
    },
    GetFolder(value) {
      const folderPath = nativePath(value);
      let entries;
      try {
        entries = readdirSync(folderPath, {withFileTypes: true});
      } catch (error) {
        if (error.code === 'ENOENT' && isWithin(path.join(rootDirectory, 'resources'), folderPath)) {
          throw new MissingRuleData(rootDirectory, folderPath);
        }
        throw error;
      }
      const files = entries
        .filter(entry => entry.isFile())
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(entry => ({
          Name: entry.name,
          Path: path.join(folderPath, entry.name).replace(/[\\/]/g, '\\'),
        }));
      return {Files: files};
    },
  };
}

function activeXObject(name, rootDirectory) {
  if (name === 'Scripting.FileSystemObject') return fileSystemObject(rootDirectory);
  if (name === 'ADODB.Stream') {
    let contents = '';
    return {
      Type: 0,
      Charset: 'utf-8',
      Open() {},
      LoadFromFile(value) {
        const filePath = nativePath(value);
        try {
          contents = readFileSync(filePath, 'utf8');
        } catch (error) {
          const resourcesPath = path.join(rootDirectory, 'resources');
          if (error.code === 'ENOENT' && isWithin(resourcesPath, filePath)) {
            throw new MissingRuleData(rootDirectory, filePath);
          }
          throw error;
        }
      },
      ReadText() {
        return contents;
      },
      Close() {},
    };
  }
  throw new Error(`Unsupported ActiveX object requested by legacy suite: ${name}`);
}

function executeLegacyScript(source, rootDirectory, label) {
  const context = vm.createContext({
    window: {},
    WScript: {
      ScriptFullName: path.join(rootDirectory, 'tools', 'validate.js'),
      Echo(value) {
        console.log(String(value));
      },
      Quit(code = 0) {
        throw new LegacyQuit(Number(code));
      },
    },
    ActiveXObject: function(name) {
      return activeXObject(name, rootDirectory);
    },
    Enumerator: function(items) {
      let position = 0;
      return {
        atEnd() {
          return position >= items.length;
        },
        moveNext() {
          position += 1;
        },
        item() {
          return items[position];
        },
      };
    },
    console,
  });
  try {
    vm.runInContext(source, context, {filename: label});
    return 0;
  } catch (error) {
    if (error instanceof LegacyQuit) return error.code;
    throw error;
  }
}

function executeFullSuite(rootDirectory = projectRoot) {
  try {
    return executeLegacyScript(readFileSync(suitePath, 'utf8'), rootDirectory, suitePath);
  } catch (error) {
    if (error instanceof MissingRuleData) {
      console.error(`${error.message}. Generate resources locally using DEVELOPMENT.md; no data was downloaded.`);
      return 2;
    }
    console.error(error.stack || error);
    return 1;
  }
}

function withTemporaryDirectory(callback) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'cc-rules-smoke-'));
  try {
    return callback(directory);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
}

function runSyntheticSmoke() {
  return withTemporaryDirectory(rootDirectory => {
    mkdirSync(path.join(rootDirectory, 'tools'), {recursive: true});
    mkdirSync(path.join(rootDirectory, 'resources', 'features'), {recursive: true});
    writeFileSync(
      path.join(rootDirectory, 'resources', 'synthetic.js'),
      'window.CC_SYNTHETIC_RULES={base:8,proficiency:2};\n',
    );
    writeFileSync(
      path.join(rootDirectory, 'resources', 'features', 'synthetic-feature.js'),
      'window.CC_SYNTHETIC_RULES.bonus=1;\n',
    );
    const source = `
function readFile(p){
  var s=new ActiveXObject("ADODB.Stream");
  s.Type=2;s.Charset="utf-8";s.Open();s.LoadFromFile(p);
  var t=s.ReadText();s.Close();return t;
}
var fso=new ActiveXObject("Scripting.FileSystemObject");
var ROOT=fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))+"\\\\";
eval(readFile(ROOT+"resources\\\\synthetic.js"));
var featDir=fso.GetFolder(ROOT+"resources\\\\features"),fe=new Enumerator(featDir.Files);
for(;!fe.atEnd();fe.moveNext())eval(readFile(fe.item().Path));
var pass=0,fails=[];
if(window.CC_SYNTHETIC_RULES.base+window.CC_SYNTHETIC_RULES.proficiency+
   window.CC_SYNTHETIC_RULES.bonus===11)pass++;
else fails.push("synthetic data did not load");
WScript.Echo("synthetic adapter checks passed: "+pass);
WScript.Echo("failures: "+fails.length);
WScript.Quit(fails.length?1:0);
`;
    return executeLegacyScript(source, rootDirectory, 'synthetic rules adapter smoke test');
  });
}

function runMissingDataProbe() {
  return withTemporaryDirectory(rootDirectory => {
    mkdirSync(path.join(rootDirectory, 'tools'), {recursive: true});
    return executeFullSuite(rootDirectory);
  });
}

function runIntentionalFailureProbe() {
  const source = `
var pass=0,fails=[];
function check(label,got,want){
  if(String(got)===String(want))pass++;
  else fails.push(label+" -> got "+got+", expected "+want);
}
check("intentional isolated failure",1,2);
WScript.Echo("checks passed: "+pass);
WScript.Echo("failures     : "+fails.length);
WScript.Echo("FAIL "+fails[0]);
WScript.Quit(fails.length?1:0);
`;
  return executeLegacyScript(source, projectRoot, 'intentional failure probe');
}

function runSelfTest() {
  const probes = [
    {argument: '--smoke-test', expected: 0, label: 'synthetic smoke'},
    {argument: '--missing-data-probe', expected: 2, label: 'missing-data diagnostic'},
    {argument: '--intentional-failure-probe', expected: 1, label: 'assertion failure exit'},
  ];
  for (const probe of probes) {
    const result = spawnSync(process.execPath, [runnerPath, probe.argument], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    if (result.error) throw result.error;
    assert.equal(
      result.status,
      probe.expected,
      `${probe.label} returned ${result.status}; stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
    if (probe.argument === '--missing-data-probe') {
      assert.match(result.stderr, /Required generated rule data is missing/);
    }
    if (probe.argument === '--intentional-failure-probe') {
      assert.match(result.stdout, /failures\s+:\s+1/);
    }
  }
  console.log('synthetic smoke, missing-data diagnostic, and non-zero failure exit verified');
}

const mode = process.argv[2];
if (mode === '--smoke-test') {
  process.exitCode = runSyntheticSmoke();
} else if (mode === '--missing-data-probe') {
  process.exitCode = runMissingDataProbe();
} else if (mode === '--intentional-failure-probe') {
  process.exitCode = runIntentionalFailureProbe();
} else if (mode === '--self-test') {
  runSelfTest();
} else if (mode) {
  console.error(`Unknown option: ${mode}`);
  console.error('Usage: node tools/validate_rules.mjs [--self-test | --smoke-test]');
  process.exitCode = 2;
} else {
  process.exitCode = executeFullSuite();
}
