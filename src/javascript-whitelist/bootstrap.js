/* global Components */

(function executeBootstrap(global) {
  'use strict';

  const {utils: Cu} = Components;
  const {
    scriptSecurityManager, io, prefs
  } = Cu.import('resource://gre/modules/Services.jsm', {}).Services;

  function getInfo(filename) {
    const {Services} = Cu.import('resource://gre/modules/Services.jsm', {});
    const {FileUtils} = Cu.import('resource://gre/modules/FileUtils.jsm', {});

    let obj = {};

    Services.scriptloader.loadSubScriptWithOptions(Services.io.newFileURI(
      FileUtils.getFile('UChrm', [filename])
    ).spec, {
      target: obj,
      charset: 'UTF-8',
      ignoreCache: true
    });

    return obj;
  }

  let {whitelist} = getInfo('javascript-whitelist.info.js');
  let policy;

  Object.assign(global, {
    install() {},
    uninstall() {},
    startup() {
      prefs.setBoolPref('javascript.enabled', false);

      policy = scriptSecurityManager.activateDomainPolicy();

      for (let origin of whitelist) {
        policy.whitelist.add(io.newURI(origin, null, null));
      }
    },
    shutdown() {
      policy.deactivate();
      prefs.setBoolPref('javascript.enabled', true);
    }
  });
}(this));
