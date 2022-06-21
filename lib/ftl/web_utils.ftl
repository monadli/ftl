// This function is used to take an input for a tuple
// containing named variable.
fn input(name) {
  let val = prompt(`${name}: (remove quotes for non-string value)`, '""')
  if (val.startsWith('""') && val.endsWith('""'))
    return val.substring(1, val.length - 2)
  else if (val == "true")
    return true
  else if (val == "false")
    return false
  else
    return parseFloat(val)
}

// https://stackoverflow.com/questions/21294/dynamically-load-a-javascript-file
fn load_script(url, callback$()) {
  if (!window.ftl) {
    window.ftl = {}
  }
  if (!window.ftl.urls) {
    window.ftl.urls = {}
  }
  if (window.ftl.urls[url])
    return
  window.ftl.urls[url] = true

  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;

  script.onreadystatechange = callback().wrapped.unwrap()
  script.onload = callback

  head.appendChild(script)
}

fn url !! callback$() {
  function invoke_callback() {
    let [f, params] = callback().wrapped.unwrap()
    f.apply()
  }

  if (!window.ftl) {
    window.ftl = {}
  }
  if (!window.ftl.urls) {
    window.ftl.urls = {}
  }

  let f = callback().wrapped.unwrap()
  if (window.ftl.urls[url]) {
    invoke_callback()
    return
  }

  window.ftl.urls[url] = true

  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.onload = invoke_callback
  script.type = 'text/javascript';
  script.src = url;
  head.appendChild(script)
}



fn url !! callback$() {
  function invoke_callback() {
    let [f, params] = callback().wrapped.unwrap()
    f.apply()
  }

  if (!window.ftl) {
    window.ftl = {}
  }
  if (!window.ftl.urls) {
    window.ftl.urls = {}
  }

  let f = callback().wrapped.unwrap()
  if (window.ftl.urls[url]) {
    invoke_callback()
    return
  }

  //document.write('<script src="' + url + '" type="text/javascript"></script>')
  window.ftl.urls[url] = true
  //invoke_callback()
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.addEventListener ("load", invoke_callback, false);
  script.type = 'text/javascript';
  script.src = url;
  head.appendChild(script)
}

fn test() {
  console.log(math)
}


'https://cdnjs.cloudflare.com/ajax/libs/random-js/1.0.8/random.js' !! test

