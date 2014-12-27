// Safe to assume arguments here
var basePath = phantom.args[0]
  , inspectLocation = phantom.args[1]
  , configFile = phantom.args[2]

var system = require('system')
  , page = require('webpage').create()

page.onCallback = function(data) {
  if (data && data.sender && data.sender == "HTMLInspector") {
    console.log(data.message)
  }
}

page.onClosing = function() {
  phantom.exit()
}

page.onError = function(msg) {
  console.error(msg)
  phantom.exit()
}

page.onLoadFinished = function(status) {

  if(status !== 'success') {
    system.stdout.write('Unable to open location "' + inspectLocation + '"')
    phantom.exit()
  }

  var hasInspectorScript = page.evaluate(function() {
    return window.HTMLInspector
  })

  if (!hasInspectorScript) {
    page.injectJs(basePath + '/html-inspector.js')
  }

  page.evaluate(function() {
    HTMLInspector.defaults.onComplete = function(errors) {
      window.callPhantom({
        sender: "HTMLInspector",
        message: errors.map(function(error) {
            var originalStringify = JSON.stringify;
            JSON.stringify = function(obj) {
              var seen = [];
              var result = originalStringify(obj, function(key, val) {
                if (val instanceof HTMLElement) { return val.outerHTML }
                if (typeof val == "object") {
                  if (seen.indexOf(val) >= 0) { return "[Circular]"; }
                  seen.push(val);
                }
                return val;
              });
              return result;
            };
          return "[[" + error.rule + "]] - [[" + error.message + "]] - [[" + JSON.stringify(error.context) + "]]"
        }).join("\n")
      })
      window.close()
    }
  })

  if (configFile) {
    page.injectJs(configFile)
  } else {
    page.evaluate(function() {
      HTMLInspector.inspect()
    })
  }
}

page.open(inspectLocation)
