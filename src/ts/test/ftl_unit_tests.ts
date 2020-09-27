import fs from 'fs'
import * as ftl from '../ftl-core'
import * as ftl_builder from '../ftl-builder'

let run_path = process.cwd()
let ftl_test_path = `${run_path}/src/ftl/test`
console.log(ftl_test_path)
ftl_builder.setRunPath(run_path)

let ftl_files = fs.readdirSync(ftl_test_path)
for (let file of ftl_files) {
    if (file.endsWith('.ftl')) {
        let module:ftl.Module = ftl_builder.buildModule(run_path, `/src/ftl/test/${file.substring(0, file.length - 4)}`)

        console.log(`${file} (${module.executables.length})`)
        var passed = 0
        module.executables.forEach(e => {
            try {
              let res = e.apply()
              if (res !== undefined) {
                if (Array.isArray(res) || typeof res == 'string') {
                  console.log(JSON.stringify(res));
                } else if (res === true) {
                  passed++
                  console.log(res);
                } else {
                  console.log(res);
                }
              }
            } catch (e) {
              console.error(e)
            }
        })
        console.log(passed == module.executables.length ? 'PASSED!\n' : 'FAILED!\n')
    }
}
