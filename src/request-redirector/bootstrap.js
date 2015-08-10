/* eslint new-cap: [2, {"capIsNewExceptions": ["QueryInterface"]}] */
/* global Components */

(function executeBootstrap(global) {
  'use strict';

  const {utils: Cu, interfaces: Ci} = Components;
  const {
    obs, io
  } = Cu.import('resource://gre/modules/Services.jsm', {}).Services;
  const {nsIHttpChannel: HttpChannelInterface} = Ci;

  const REQUEST_TOPIC = 'http-on-opening-request';
  const RESPONSE_TOPIC = 'http-on-examine-response';

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

  let {redirectURLObj, redirectURLList} = getInfo('request-redirector.info.js');
  let redirectURLs = Object.assign(redirectURLObj, redirectURLList.reduce(
    (obj, url) => Object.assign(obj, {
      [url]: {
        getURL({spec}) {
          return spec.replace('http', 'https');
        }
      }
    }),
    {}
  ));

  function getCustomRedirectURL(uriObj) {
    let redirectURL = redirectURLs[uriObj.prePath];

    return redirectURL ? redirectURL.getURL(uriObj) : '';
  }

  function redirectForRequestTopic(subject) {
    let httpChannel = subject.QueryInterface(HttpChannelInterface);
    let url = getCustomRedirectURL(httpChannel.URI);

    if (!url) {
      return;
    }

    // URI.spec = url;
    httpChannel.redirectTo(io.newURI(url, null, null));
  }

  function getLocationURL(httpChannel) {
    let locationURL;

    try {
      locationURL = httpChannel.getResponseHeader('Location');
    } catch (err) {
      if (err.name === 'NS_ERROR_NOT_AVAILABLE') {
        locationURL = '';
      }
    }

    return locationURL;
  }

  function redirectForResponseTopic(subject) {
    let httpChannel = subject.QueryInterface(HttpChannelInterface);
    let locationURL = getLocationURL(httpChannel);

    if (!locationURL) {
      return;
    }

    let url = getCustomRedirectURL(
      io.newURI(locationURL, null, httpChannel.URI)
    );

    if (!url) {
      return;
    }

    httpChannel.setResponseHeader('Location', url, false);
  }

  let httpRequestObserver = {
    observe(subject, topic) {
      if (topic === REQUEST_TOPIC) {
        redirectForRequestTopic(subject);
      } else if (topic === RESPONSE_TOPIC) {
        redirectForResponseTopic(subject);
      }
    }
  };

  Object.assign(global, {
    install() {},
    uninstall() {},
    startup() {
      obs.addObserver(httpRequestObserver, REQUEST_TOPIC, false);
      obs.addObserver(httpRequestObserver, RESPONSE_TOPIC, false);
    },
    shutdown() {
      obs.removeObserver(httpRequestObserver, REQUEST_TOPIC);
      obs.removeObserver(httpRequestObserver, RESPONSE_TOPIC);
    }
  });
}(this));
