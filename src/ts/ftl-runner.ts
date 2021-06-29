import fs from 'fs'
import path from 'path'
import util from 'util'
import * as ftl_builder from './ftl-builder'

let readFile = util.promisify(fs.readFile)

if (process.argv.length < 3) {
  throw new Error(`Usage: node ftl-runner.js ftl-code-file`)
}

let cwd = process.cwd()
console.log(`cwd: ${cwd}`)

let ftlFile = process.argv[2]

if (!ftlFile.endsWith('.ftl')) {
  throw new Error(`${ftlFile} does not ends with '.ftl'!`)
}

let fpath = path.dirname(ftlFile) + path.sep

let ftlBaseName = path.basename(ftlFile)

ftl_builder.setLibPath(cwd + path.sep)
ftl_builder.setRunPath(fpath);

(async function run(ftlFile: string) {
  try {
    let module = ftl_builder.buildModule(fpath, `./${ftlBaseName.substring(0, ftlBaseName.length - 4)}`)
    console.log(module)
    for (let exec of module!.executables) {
      let res = exec.apply()
      if (res !== undefined) {
        if (Array.isArray(res) || typeof res == 'string') {
          console.log(JSON.stringify(res));
        } else {
          console.log(res);
        }
      }
    }
    console.log(`\nFinished executing ${process.argv[2]}`)
  } catch (e) {
    console.error(e)
  }
})(ftlFile)
