import fs from 'fs'
import util from 'util'
import * as ftl_builder from './ftl-builder'

let readFile = util.promisify(fs.readFile)

if (process.argv.length < 3) {
  throw new Error(`Usage: node ftl-runner.js ftl-code-file`)
}

let cwd = process.cwd()
let ftlFile = process.argv[2]

if (ftlFile.startsWith('/')) {
  throw new Error(`ftl-runner does not take ftl file with absolute path!`)
}

if (!ftlFile.endsWith('.ftl')) {
  throw new Error(`${ftlFile} does not ends with '.ftl'!`)
}

ftlFile = ftlFile.substring(0, ftlFile.length - 4)

ftl_builder.setRunPath(cwd);

(async function run(ftlFile: string) {
  let module = ftl_builder.buildModule(cwd, ftlFile)
  console.log(module)
  for (let exec of module!.executables) {
    try {
      let res = exec.apply()
      if (res !== undefined) {
        if (Array.isArray(res) || typeof res == 'string') {
          console.log(JSON.stringify(res));
        } else {
          console.log(res);
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  console.log(`\nFinished executing ${process.argv[2]}`)
})(ftlFile)
