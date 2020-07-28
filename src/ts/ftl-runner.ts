import fs from 'fs'
import util from 'util'
import path from 'path'
import * as ftl from './ftl-core'
import * as ftl_parser from './ftl-parser'
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
ftl.default.setRunPath(cwd)
ftl_builder.setRunPath(cwd)

;(async function run(ftlFile:string) {

  let module:ftl.Module = ftl_builder.buildModule(cwd, ftlFile)

  console.log(module)
  module.executables.forEach(e => {
    try {
      let res = e.apply()
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
  })

  console.log(`\nFinished executing ${process.argv[2]}`)
})(ftlFile)
