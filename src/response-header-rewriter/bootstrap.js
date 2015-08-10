/* eslint new-cap: [2, {"capIsNewExceptions": ["QueryInterface"]}] */
/* global Components */

(function executeBootstrap(global) {
  'use strict';

  const {utils: Cu, interfaces: Ci} = Components;
  const {obs} = Cu.import('resource://gre/modules/Services.jsm', {}).Services;
  const {nsIHttpChannel: HttpChannelInterface, nsIURL: URLInterface} = Ci;

  const TOPIC = 'http-on-examine-response';

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

  let {rewriters} = getInfo('response-header-rewriter.info.js');
  let httpRequestObserver = {
    observe(subject, topic) {
      if (topic !== TOPIC) {
        return;
      }

      let httpChannel = subject.QueryInterface(HttpChannelInterface);
      let uriObj = httpChannel.URI;
      let rewriter = rewriters[uriObj.host];

      if (!rewriter) {
        return;
      }

      rewriter(httpChannel, uriObj.QueryInterface(URLInterface));
    }
  };

  Object.assign(global, {
    install() {},
    uninstall() {},
    startup() {
      obs.addObserver(httpRequestObserver, TOPIC, false);
    },
    shutdown() {
      obs.removeObserver(httpRequestObserver, TOPIC);
    }
  });
}(this));
