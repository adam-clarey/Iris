var fs = require('fs');

iris.modules.forms.registerHook("hook_form_render__regions", 0, function (thisHook, data) {

  // Loop over available block types and add their blocks to a list for the form

  var blocks = [];

  Object.keys(iris.modules.blocks.globals.blocks).forEach(function (blockType) {

    Object.keys(iris.modules.blocks.globals.blocks[blockType]).forEach(function (block) {

      blocks.push(block + "|" + blockType)

    })

  });

  // Get a list of regions

  try {

    var path = require("path");

    var regions = iris.modules.frontend.globals.activeTheme ? iris.modules.frontend.globals.activeTheme.info.regions : [];

    var form = {};

    // Push in N/A option

    blocks.push("None");

    blocks.reverse();

    regions.forEach(function (regionName) {

      form[regionName] = {
        "type": "array",
        "title": regionName.toUpperCase(),
        "items": {
          "type": "object",
          "properties": {
            "block": {
              "type": "string",
              "enum": blocks
            },
            "settings": {
              "type": "object",
              "properties": {
                "pathVisibility": {
                  "type": "textarea",
                  "title": "Path visibility",
                  "description": "Paths this block is visible at (each on a new line). <a href='https://github.com/isaacs/minimatch'><small>Read information on accepted patterns from the minimatch documentation</small></a>",
                }

              }

            }


          },

        }
      }

    })

    Object.keys(form).forEach(function (property) {

      data.schema[property] = form[property];

    })

    // Load in past values

    iris.readConfig("regions", "regions").then(function (output) {

      data.value = output;

      thisHook.pass(data);

    }, function (fail) {

      thisHook.pass(data);

    });

  } catch (e) {

    thisHook.pass(data);

  }

  thisHook.pass(data);

});

iris.modules.forms.registerHook("hook_form_submit__regions", 0, function (thisHook, data) {

  try {

    iris.saveConfig(thisHook.context.params, "regions", "regions", function () {

      thisHook.pass(data);

    });

  } catch (e) {

    iris.log("error", e);

  }

});

// Load regions

iris.modules.regions.registerHook("hook_frontend_embed__region", 0, function (thisHook, data) {

  var regionName = thisHook.context.embedParams[0];

  // Get list of regions

  iris.readConfig("regions", "regions").then(function (output) {

      if (output[regionName]) {
        // Render each block in the region

        var blockPromises = [];
        var blockData = {};

        output[regionName].forEach(function (block, index) {

          var settings = block.settings;

          var block = block.block;

          if (block.toLowerCase() === "none") {

            return false;

          }

          var blockName = block.split("|")[0],
            blockType = block.split("|")[1];

          var paramaters = {
            index: index,
            id: blockName,
            type: blockType,
            instanceSettings: settings,
            config: iris.modules.blocks.globals.blocks[blockType][blockName],
            context: thisHook.context.vars
          }

          blockPromises.push(function (object) {

            return new Promise(function (yes, no) {

              iris.invokeHook("hook_block_render", thisHook.authPass, paramaters, null).then(function (html) {

                blockData[blockType + "|" + blockName + "|" + index] = html;

                yes(blockData);

              }, function (fail) {

                yes("");

              });

            });

          });

        });


        iris.promiseChain(blockPromises, {}, function (pass) {

          // Run parse template file for a regions template

          iris.modules.frontend.globals.parseTemplateFile(["region", regionName], null, {
            blocks: pass
          }, thisHook.authPass, null).then(function (success) {

            thisHook.pass(success);

          }, function (fail) {

            thisHook.pass(data);

            iris.log("error", fail);

          });

        }, function (fail) {

          thisHook.pass(data);

        });

      } else {

        thisHook.pass(data);

      }

    },
    function (fail) {

      thisHook.pass(data);

    });

});

// Block path visibility

var minimatch = require("minimatch");

iris.modules.regions.registerHook("hook_block_render", 0, function (thisHook, data) {

  if (thisHook.context.instanceSettings) {

    if (thisHook.context.instanceSettings.pathVisibility) {

      // Flag to see if showing the block or not

      var showing = true;

      var paths = thisHook.context.instanceSettings.pathVisibility.replace(/\r\n/g, '\n').split("\n");

      if (thisHook.context.context && thisHook.context.context.req && thisHook.context.context.req.url) {

        var currentUrl = thisHook.context.context.req.url;

        // Loop over paths

        paths.forEach(function (path) {

          var showing = minimatch(currentUrl, path);

        })

        if (showing) {

          thisHook.pass(data);

        } else {

          thisHook.fail(data);

        }

      } else {

        // No url, safer to not show

        thisHook.fail(data);

      }

    } else {

      thisHook.pass(data);

    }

  } else {

    thisHook.pass(data);

  }

});

// Regions admin system

iris.route.get("/admin/regions", {
  "menu": [{
    menuName: "admin_toolbar",
    parent: "/admin/structure",
    title: "Regions"
  }]
}, function (req, res) {

  // If not admin, present 403 page

  if (req.authPass.roles.indexOf('admin') === -1) {

    iris.modules.frontend.globals.displayErrorPage(403, req, res);

    return false;

  }

  iris.modules.frontend.globals.parseTemplateFile(["admin_regions"], ['admin_wrapper'], {}, req.authPass, req).then(function (success) {

    res.send(success)

  }, function (fail) {

    iris.modules.frontend.globals.displayErrorPage(500, req, res);

    iris.log("error", e);

  });

})
