/* eslint new-cap: [2, {"capIsNewExceptions": ["QueryInterface"]}] */
/* global Components */

(function executeBootstrap(global) {
  'use strict';

  const {utils: Cu, results: Cr, interfaces: Ci} = Components;
  const {obs} = Cu.import('resource://gre/modules/Services.jsm', {}).Services;
  const {NS_ERROR_FAILURE} = Cr;
  const {
    nsIHttpChannel: HttpChannelInterface,
    nsIRequest: RequestInterface
  } = Ci;

  const TOPIC = 'http-on-modify-request';

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

  let {urlPatterns} = getInfo('request-blocker.info.js');
  let blockPatterns = new RegExp(urlPatterns.map(urlPattern =>
    urlPattern
      .replace(/\./g, '\\.')
      .replace('*://', '(?:https?|ftp)://')
      .replace('://*/', '://[^/]+/')
      .replace('://*\\.', '://(?:[^/]+\\.)?')
      .replace(/\*/g, '.*')
      .replace(/^/, '^')
      .replace(/$/, '$')
  ).join('|'));
  let httpRequestObserver = {
    observe(subject, topic) {
      if (topic !== TOPIC) {
        return;
      }

      let req = subject
        .QueryInterface(HttpChannelInterface)
        .QueryInterface(RequestInterface);

      if (!blockPatterns.test(req.URI.spec)) {
        return;
      }

      req.cancel(NS_ERROR_FAILURE);
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
