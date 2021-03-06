/**
 * @file General hooks and functions for the admin system.
 */

iris.registerModule("system");

require('./system_routing.js');

iris.modules.auth.globals.registerPermission("can view admin menu", "admin");

iris.modules.auth.globals.registerPermission("can access admin pages", "admin");

require('./system_modules.js');



iris.modules.system.registerHook("hook_form_render__restart", 0, function (thisHook, data) {

  data.onSubmit = function (errors, values) {

    $.post(window.location, values, function (data, err) {

      window.location.href = window.location.href;

    });

  }

  thisHook.pass(data);

});

iris.modules.system.registerHook("hook_form_submit__restart", 0, function (thisHook, data) {

  iris.restart(thisHook.authPass.userid, "restart button");

  thisHook.pass(data);

});


// Placeholder hook TODO for sending socket message to update log page

iris.modules.system.registerHook("hook_log", 0, function (thisHook, data) {

  // Loop over users to see if they have the view log permission

  Object.keys(iris.modules.auth.globals.userList).forEach(function (user) {

    var token = Object.keys(iris.modules.auth.globals.userList[user].tokens)[0];

    iris.modules.auth.globals.credentialsToPass({
      userid: user,
      token: token
    }).then(function (authPass) {

      //      console.log(authPass);

    });

  });

  thisHook.pass(data);

});

iris.route.get("/admin/structure", {
  "menu": [{
    menuName: "admin_toolbar",
    parent: null,
    title: "Structure",
    permissions: ["can access admin pages"]
  }]
}, function (req, res) {

  if (req.authPass.roles.indexOf('admin') === -1) {

    iris.modules.frontend.globals.displayErrorPage(403, req, res);

    return false;

  }

  var menu = iris.modules.menu.globals.getBaseLinks(req.url);

  iris.modules.frontend.globals.parseTemplateFile(["baselinks"], ['admin_wrapper'], {
    menu: menu,
  }, req.authPass, req).then(function (success) {

    res.send(success);

  })

})
