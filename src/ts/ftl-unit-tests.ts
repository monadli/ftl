import fs from 'fs'
import * as ftl_builder from './ftl-builder'

let run_path = process.cwd()
let ftl_test_path = `${run_path}/src/ftl/test`
console.log(ftl_test_path)
ftl_builder.setRunPath(run_path)

let ftl_files = fs.readdirSync(ftl_test_path)
let failed_files = []
for (let file of ftl_files) {
  if (file.endsWith('.ftl')) {
    try {
      let module = ftl_builder.buildModule(run_path, `/src/ftl/test/${file.substring(0, file.length - 4)}`)

      console.log(`${file} (${module!.executableCount})`)
      var passed = 0
      for (let exec of module!.executables) {

        try {
          let res = exec.apply()
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
      }
      if (passed == module!.executableCount)
        console.log('PASSED!\n')
      else {
        console.log('FAILED!\n')
        failed_files.push(file)
      }
    } catch (e) {
      console.error(`\nFailed testing ${file} with error ${e}!\n`)
      failed_files.push(file)
    }
  }
}

if (failed_files.length == 0) {
  console.log('All tests Passed!')
} else {
  console.log('The following tests failed:')
  failed_files.forEach(f => console.log(f))
}
