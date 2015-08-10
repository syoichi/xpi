/* eslint new-cap: [2, {"capIsNewExceptions": ["QueryInterface"]}] */
/* global Components */

(function executeBootstrap(global) {
  'use strict';

  const {utils: Cu, interfaces: Ci} = Components;
  const {obs} = Cu.import('resource://gre/modules/Services.jsm', {}).Services;
  const {nsIHttpChannel: HttpChannelInterface} = Ci;

  const TOPIC = 'http-on-opening-request';

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

  let {referrers} = getInfo('referrer-sender.info.js');
  let hostPatterns = Object.keys(referrers).filter(
    host => host.startsWith('*.')
  );
  let hostRegExps = hostPatterns.reduce(
    (regExps, pattern) => Object.assign(regExps, {
      [pattern]: new RegExp(
        pattern
          .replace(/\./g, '\\.')
          .replace('*\\.', '(?:.+\\.)?')
          .replace(/^/, '^')
          .replace(/$/, '$')
      )
    }),
    {}
  );

  function getStrictReferrer(uriObj) {
    let {host} = uriObj;

    for (let hostPattern of hostPatterns) {
      if (hostRegExps[hostPattern].test(host)) {
        return referrers[hostPattern].getStrictReferrer(uriObj);
      }
    }
  }

  function getReferrer(uriObj) {
    return referrers[uriObj.host] || getStrictReferrer(uriObj) || '';
  }

  let httpRequestObserver = {
    observe(subject, topic) {
      if (topic !== TOPIC) {
        return;
      }

      let httpChannel = subject.QueryInterface(HttpChannelInterface);
      let referrer = getReferrer(httpChannel.URI);

      if (!referrer) {
        return;
      }

      // don't work when set "network.http.sendRefererHeader = 0"
      // httpChannel.referrer = io.newURI(referrer, null, null);
      httpChannel.setRequestHeader('Referer', referrer, false);
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
