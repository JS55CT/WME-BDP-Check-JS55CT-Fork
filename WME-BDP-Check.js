// ==UserScript==
// @name        WME BDP Check (JS55CT Fork)
// @namespace   https://github.com/JS55CT
// @description Check for possible BDP routes between two selected segments (Modified from original).
// @downloadURL  
// @updateURL    
// @author      JS55CT
// @match       http*://*.waze.com/*editor*
// @exclude     http*://*.waze.com/user/editor*
// @require     https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @grant       GM_xmlhttpRequest
// @license     GPLv3
// @source      https://github.com/JS%%CT/wme-bdp-check
// @original-author dBsooner
// @original-source  https://github.com/WazeDev/WME-BDP-Check
// ==/UserScript==

/* global GM_info, GM_xmlhttpRequest, W, WazeWrap */

/*
 * This script is a modified version of "WME BDP Check" originally created by dBsooner.
 * The original version can be found at: https://github.com/WazeDev/WME-BDP-Check
 * 
 * Original Author: dBsooner
 * Original Source: https://github.com/WazeDev/WME-BDP-Check
 * 
 * Modifications by YourName
 */

(function () {
    'use strict';

    // eslint-disable-next-line no-nested-ternary
    const _SCRIPT_SHORT_NAME = `WME BDPC${(/beta/.test(GM_info.script.name) ? ' β' : /\(DEV\)/i.test(GM_info.script.name) ? ' Ω' : '')}`,
          _SCRIPT_LONG_NAME = GM_info.script.name,
          _IS_ALPHA_VERSION = /[Ω]/.test(_SCRIPT_SHORT_NAME),
          _IS_BETA_VERSION = /[β]/.test(_SCRIPT_SHORT_NAME),
          _SCRIPT_AUTHOR = GM_info.script.author,
          _PROD_DL_URL = 'https://greasyfork.org/scripts/393407-wme-bdp-check/code/WME%20BDP%20Check.user.js',
          _FORUM_URL = 'https://www.waze.com/forum/viewtopic.php?f=819&t=294789',
          _SETTINGS_STORE_NAME = 'WMEBDPC',
          _BETA_DL_URL = 'YUhSMGNITTZMeTluY21WaGMzbG1iM0pyTG05eVp5OXpZM0pwY0hSekx6TTVNVEkzTVMxM2JXVXRZbVJ3TFdOb1pXTnJMV0psZEdFdlkyOWtaUzlYVFVVbE1qQkNSRkFsTWpCRGFHVmpheVV5TUNoaVpYUmhLUzUxYzJWeUxtcHo=',
          _ALERT_UPDATE = true,
          _SCRIPT_VERSION = GM_info.script.version,
          _SCRIPT_VERSION_CHANGES = ['CHANGE: Compatibility with latest WME release.'],
          _DEBUG = /[βΩ]/.test(_SCRIPT_SHORT_NAME),
          _LOAD_BEGIN_TIME = performance.now(),
          sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
          dec = (s = '') => atob(atob(s)),
          _elems = {
              div: document.createElement('div'),
              'wz-button': document.createElement('wz-button'),
              'wz-card': document.createElement('wz-card')
          },
          _timeouts = { onWmeReady: undefined, saveSettingsToStorage: undefined };
    let _settings = {},
        _pathEndSegId,
        _restoreZoomLevel,
        _restoreMapCenter;

    function log(message, data = '') { console.log(`${_SCRIPT_SHORT_NAME}:`, message, data); }
    function logError(message, data = '') { console.error(`${_SCRIPT_SHORT_NAME}:`, new Error(message), data); }
    function logWarning(message, data = '') { console.warn(`${_SCRIPT_SHORT_NAME}:`, message, data); }
    function logDebug(message, data = '') {
        if (_DEBUG) {
            log(message, data);
        }
    }

    function $extend(...args) {
        const extended = {},
              deep = Object.prototype.toString.call(args[0]) === '[object Boolean]' ? args[0] : false,
              merge = function (obj) {
                  Object.keys(obj).forEach((prop) => {
                      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                          if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
                              extended[prop] = $extend(true, extended[prop], obj[prop]);
                          } else if ((obj[prop] !== undefined) && (obj[prop] !== null)) {
                              extended[prop] = obj[prop];
                          }
                      }
                  });
              };
        for (let i = deep ? 1 : 0, { length } = args; i < length; i++) {
            if (args[i]) {
                merge(args[i]);
            }
        }
        return extended;
    }

    function createElem(type = '', attrs = {}, eventListener = []) {
        const el = _elems[type]?.cloneNode(false) || _elems.div.cloneNode(false),
              applyEventListeners = function ([evt, cb]) {
                  return this.addEventListener(evt, cb);
              };
        Object.keys(attrs).forEach((attr) => {
            if ((attrs[attr] !== undefined) && (attrs[attr] !== 'undefined') && (attrs[attr] !== null) && (attrs[attr] !== 'null')) {
                if ((attr === 'disabled') || (attr === 'checked') || (attr === 'selected') || (attr === 'textContent') || (attr === 'innerHTML')) {
                    el[attr] = attrs[attr];
                } else {
                    el.setAttribute(attr, attrs[attr]);
                }
            }
        });
        if (eventListener.length > 0) {
            eventListener.forEach((obj) => {
                Object.entries(obj).map(applyEventListeners.bind(el));
            });
        }
        return el;
    }

    async function loadSettingsFromStorage() {
        const defaultSettings = {
            lastSaved: 0,
            lastVersion: undefined
        },
              loadedSettings = JSON.parse(localStorage.getItem(_SETTINGS_STORE_NAME)),
              serverSettings = await WazeWrap.Remote.RetrieveSettings(_SETTINGS_STORE_NAME);
        _settings = $extend(true, {}, defaultSettings, loadedSettings);
        if (serverSettings?.lastSaved > _settings.lastSaved)
            $extend(true, _settings, serverSettings);
        _timeouts.saveSettingsToStorage = window.setTimeout(saveSettingsToStorage, 5000);
        return Promise.resolve();
    }

    function saveSettingsToStorage() {
        checkTimeout({ timeout: 'saveSettingsToStorage' });
        if (localStorage) {
            _settings.lastVersion = _SCRIPT_VERSION;
            _settings.lastSaved = Date.now();
            localStorage.setItem(_SETTINGS_STORE_NAME, JSON.stringify(_settings));
            WazeWrap.Remote.SaveSettings(_SETTINGS_STORE_NAME, _settings);
            logDebug('Settings saved.');
        }
    }

    function showScriptInfoAlert() {
        if (_ALERT_UPDATE && (_SCRIPT_VERSION !== _settings.lastVersion)) {
            const divElemRoot = createElem('div');
            divElemRoot.appendChild(createElem('p', { textContent: 'What\'s New:' }));
            const ulElem = createElem('ul');
            if (_SCRIPT_VERSION_CHANGES.length > 0) {
                for (let idx = 0, { length } = _SCRIPT_VERSION_CHANGES; idx < length; idx++) {
                    ulElem.appendChild(createElem('li', { innerHTML: _SCRIPT_VERSION_CHANGES[idx] }));
                }
            } else {
                ulElem.appendChild(createElem('li', { textContent: 'Nothing major.' }));
            }
            divElemRoot.appendChild(ulElem);
            WazeWrap.Interface.ShowScriptUpdate(_SCRIPT_SHORT_NAME, _SCRIPT_VERSION, divElemRoot.innerHTML, (_IS_BETA_VERSION ? dec(_BETA_DL_URL) : _PROD_DL_URL).replace(/code\/.*\.js/, ''), _FORUM_URL);
        }
    }

    function checkTimeout(obj) {
        if (obj.toIndex) {
            if (_timeouts[obj.timeout]?.[obj.toIndex]) {
                window.clearTimeout(_timeouts[obj.timeout][obj.toIndex]);
                delete (_timeouts[obj.timeout][obj.toIndex]);
            }
        } else {
            if (_timeouts[obj.timeout])
                window.clearTimeout(_timeouts[obj.timeout]);
            _timeouts[obj.timeout] = undefined;
        }
    }

    function findMiddle(coordinates) {
        if (coordinates.length === 0) {
            return null; //Or your preferred default value
        }
        // This makes sure the resulting coordinates pair is part of the segment geometry.
        // This was needed to increase the accuracy of the findLiveMapRoutes results, as without it, sometime it would jump to a parallel segment
        return coordinates[Math.floor(coordinates.length / 2)];
    }

    function getMidpoint(startSeg, endSeg, olLonLat = false) {
        let start4326Center = findMiddle(startSeg.attributes.geoJSONGeometry.coordinates),
            end4326Center = findMiddle(endSeg.attributes.geoJSONGeometry.coordinates);
        let lon1 = start4326Center[0],
            lat1 = start4326Center[1],
            lon2 = end4326Center[0],
            lat2 = end4326Center[1];
        const piDiv = Math.PI / 180,
              divPi = 180 / Math.PI,
              dLon = ((lon2 - lon1) * piDiv);
        lat1 *= piDiv;
        lat2 *= piDiv;
        lon1 *= piDiv;
        const bX = Math.cos(lat2) * Math.cos(dLon),
              bY = Math.cos(lat2) * Math.sin(dLon),
              lat3 = (Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + bX) * (Math.cos(lat1) + bX) + bY * bY))) * divPi,
              lon3 = (lon1 + Math.atan2(bY, Math.cos(lat1) + bX)) * divPi,
              lonLat900913 = WazeWrap.Geometry.ConvertTo900913(lon3, lat3),
              { lon, lat } = lonLat900913;
        //log(`getMidpoint | calculated Centerpoint between Segments is: ${lon3}, ${lat3}`);
        if (olLonLat) {
            return lonLat900913;
        }
        return { lon, lat };
    }

    async function doZoom(restore = false, zoom = -1, coordObj = {}) {
        if ((zoom === -1) || (Object.entries(coordObj).length === 0)) {
            return Promise.resolve();
        }
        // As of WME v2.162-3-gd95a5e841, W.map.setCenter() expects a JS object as { lon, lat }, not an OL LonLat instance.
        W.map.setCenter(coordObj);
        if (W.map.getZoom() !== zoom) {
            W.map.getOLMap().zoomTo(zoom);
        }
        if (restore) {
            _restoreZoomLevel = null;
            _restoreMapCenter = undefined;
        }
        else {
            WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, 'Waiting for WME to populate after zoom level change.<br>Proceeding in 2 seconds...');
            await sleep(2000);
            document.querySelector('#toast-container-wazedev .toast-info .toast-close-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        return Promise.resolve();
    }

    function rtgContinuityCheck([...segs] = []) {
        if (segs.length < 2) {
            //log("Road Type Group Continuity Check | Less than 2 segments provided. Returning false.");
            return false;
        }

        const rtg = { 7: 'mH', 6: 'MHFW', 3: 'MHFW' };
        const seg1rtg = rtg[segs[0].attributes.roadType];

        if(seg1rtg === undefined) {
            //log(`Road Type Group Continuity Check | 1st segment road type ${segs[0].attributes.roadType} is not part of the Road Type Group MHFW.`);
            return false;
        }
        //log("Road Type Group Continuity Check | 1st segment road type Group is : ", seg1rtg);
        segs.splice(0, 1);

        return segs.every((el) => {
            const currentRTG = rtg[el.attributes.roadType];

            if(currentRTG === undefined) {
                //log(`Road Type Group Continuity Check | Road type ${el.attributes.roadType} is not part of the Road Type Group MHFW.`);
                return false;
            }
            const rtgMatch = seg1rtg === currentRTG;
            //log("Road Type Group Continuity Check | Additional segments match 1st Segments road type group = " + rtgMatch);
            return rtgMatch;
        });
    }

    function nameContinuityCheck([...segs] = []) {
        if (segs.length < 2) {
            return false;
        }
        const bs1StreetNames = [],
              bs2StreetNames = [],
              streetNames = [];
        let street;
        if (segs[0].attributes.primaryStreetID) {
            street = W.model.streets.getObjectById(segs[0].attributes.primaryStreetID);
            if (street?.attributes?.name?.length > 0) {
                if (segs.length === 2) {
                    streetNames.push(street.attributes.name);
                } else {
                    bs1StreetNames.push(street.attributes.name);
                }
            }
        }
        if (segs[0].attributes.streetIDs.length > 0) {
            for (let i = 0, { length } = segs[0].attributes.streetIDs; i < length; i++) {
                street = W.model.streets.getObjectById(segs[0].attributes.streetIDs[i]);
                if (street?.attributes?.name?.length > 0) {
                    if (segs.length === 2) {
                        streetNames.push(street.attributes.name);
                    } else {
                        bs1StreetNames.push(street.attributes.name);
                    }
                }
            }
        }
        if (((segs.length === 2) && (streetNames.length === 0))
            || ((segs.length > 2) && (bs1StreetNames.length === 0))) {
            return false;
        }
        if (segs.length === 2) {
            if (segs[1].attributes.primaryStreetID) {
                street = W.model.streets.getObjectById(segs[1].attributes.primaryStreetID);
                if (street?.attributes?.name && streetNames.includes(street.attributes.name)){
                    return true;
                }
            }
            if (segs[1].attributes.streetIDs.length > 0) {
                for (let i = 0, { length } = segs[1].attributes.streetIDs; i < length; i++) {
                    street = W.model.streets.getObjectById(segs[1].attributes.streetIDs[i]);
                    if (street?.attributes?.name && streetNames.includes(street.attributes.name)){
                        return true;
                    }
                }
            }
        } else {
            segs.splice(0, 1);
            const lastIdx = segs.length - 1;
            if (segs[lastIdx].attributes.primaryStreetID) {
                street = W.model.streets.getObjectById(segs[lastIdx].attributes.primaryStreetID);
                if (street?.attributes?.name && (street.attributes?.name.length > 0)) {
                    bs2StreetNames.push(street.attributes.name);
                }
            }
            if (segs[lastIdx].attributes.streetIDs.length > 0) {
                for (let i = 0, { length } = segs[lastIdx].attributes.streetIDs; i < length; i++) {
                    street = W.model.streets.getObjectById(segs[lastIdx].attributes.streetIDs[i]);
                    if (street?.attributes?.name && (street.attributes?.name.length > 0)) {
                        bs2StreetNames.push(street.attributes.name);
                    }
                }
            }
            if (bs2StreetNames.length === 0) {
                return false;
            }
            segs.splice(-1, 1);
            return segs.every((el) => {
                if (el.attributes.primaryStreetID) {
                    street = W.model.streets.getObjectById(el.attributes.primaryStreetID);
                    if (street?.attributes?.name && (bs1StreetNames.includes(street.attributes.name) || bs2StreetNames.includes(street.attributes.name))){
                        return true;
                    }
                }
                if (el.attributes.streetIDs.length > 0) {
                    for (let i = 0, { length } = el.attributes.streetIDs; i < length; i++) {
                        street = W.model.streets.getObjectById(el.attributes.streetIDs[i]);
                        if (street?.attributes?.name && (bs1StreetNames.includes(street.attributes.name) || bs2StreetNames.includes(street.attributes.name))){
                            return true;
                        }
                    }
                }
                return false;
            });
        }
        return false;
    }

    async function findLiveMapRoutes(startSeg, endSeg, maxLength) {
        let jsonData = { error: false };
        let start4326Center = findMiddle(startSeg.attributes.geoJSONGeometry.coordinates);
        let end4326Center = findMiddle(endSeg.attributes.geoJSONGeometry.coordinates);
        let url = (W.model.countries.getObjectById(235) || W.model.countries.getObjectById(40) || W.model.countries.getObjectById(182))
        ? '/RoutingManager/routingRequest?'
        : W.model.countries.getObjectById(106)
        ? '/il-RoutingManager/routingRequest?'
        : '/row-RoutingManager/routingRequest?',
            data = {
                from: `x:${start4326Center[0]} y:${start4326Center[1]}`,
                to: `x:${end4326Center[0]} y:${end4326Center[1]}`,
                returnJSON: true,
                returnGeometries: true,
                returnInstructions: false,
                timeout: 60000,
                type: 'HISTORIC_TIME',
                nPaths: 6,
                clientVersion: '4.0.0',
                vehType: 'PRIVATE',
                options: 'AVOID_TOLL_ROADS:f,AVOID_PRIMARIES:f,AVOID_DANGEROUS_TURNS:f,AVOID_FERRIES:f,ALLOW_UTURNS:t'
            };

        let returnRoutes = [];

        try {
            const response = await fetch(url + new URLSearchParams(data), {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            jsonData = await response.json();
        } catch(error) {
            logWarning(error);
            jsonData = { error };
        }

        if (!jsonData.error) {
            let routesToProcess = jsonData.alternatives ? jsonData.alternatives : [jsonData];

            for (let route of routesToProcess) {
                let routeSegments = route.response.results;
                const fullRouteSegIds = routeSegments.map((segment) => segment.path.segmentId);
                log(`findLiveMapRoutes | Route segment IDs: `, fullRouteSegIds);

                const fullRouteSegs = W.model.segments.getByIds(fullRouteSegIds);
                if (nameContinuityCheck(fullRouteSegs) && rtgContinuityCheck(fullRouteSegs)) {
                    log(`findLiveMapRoutes | Both name and RTG continuity tests passed.`);
                    const routeDistance = fullRouteSegs.slice(1, -1).map(seg => seg.attributes.length).reduce((a, b) => a + b, 0);
                    if (routeDistance < maxLength) {
                        log(`findLiveMapRoutes | Route is within maxLength for RTG`);
                        returnRoutes.push(fullRouteSegIds);
                    } else {
                        log(`findLiveMapRoutes | Route exceeds maxLength for RTG.`);
                    }
                } else {
                    log(`findLiveMapRoutes | Continuity check failed.`);
                }
            }
            return Promise.resolve(returnRoutes);
        }
    }

    function findDirectRoute(obj = {}) {
        const { maxLength, startSeg, startNode, endSeg, endNodeIds } = obj,
              processedSegs = [],
              sOutIds = startNode.attributes.segIDs.filter((segId) => segId !== startSeg.attributes.id),
              segIdsFilter = (nextSegIds, alreadyProcessed) => nextSegIds.filter((value) => !alreadyProcessed.includes(value)),
              getNextSegs = (nextSegIds, curSeg, nextNode) => {
                  const rObj = { addPossibleRouteSegments: [] },
                        checkProcessedSegs = (o) => (o.fromSegId === curSeg.attributes.id) && (o.toSegId === this);
                  for (let i = 0, { length } = nextSegIds; i < length; i++) {
                      const nextSeg = W.model.segments.getObjectById(nextSegIds[i]);
                      if ((nextNode.isTurnAllowedBySegDirections(curSeg, nextSeg) || curSeg.isTurnAllowed(nextSeg, nextNode))
                          && nameContinuityCheck([curSeg, nextSeg])
                          && (nameContinuityCheck([startSeg, nextSeg]) || nameContinuityCheck([endSeg, nextSeg]))) {
                          if (!processedSegs.some(checkProcessedSegs.bind(nextSegIds[i]))) {
                              rObj.addPossibleRouteSegments.push({ nextSegStartNode: nextNode, nextSeg });
                              break;
                          }
                      }
                  }
                  return rObj;
              },
              returnRoutes = [];

        for (let i = 0, { length } = sOutIds; i < length; i++) {
            const sOut = W.model.segments.getObjectById(sOutIds[i]);
            if ((startNode.isTurnAllowedBySegDirections(startSeg, sOut) || startSeg.isTurnAllowed(sOut, startNode))
                && nameContinuityCheck([startSeg, sOut])) {
                const possibleRouteSegments = [{
                    curSeg: startSeg,
                    nextSegStartNode: startNode,
                    nextSeg: sOut
                }];
                let curLength = 0;
                while (possibleRouteSegments.length > 0) {
                    const idx = possibleRouteSegments.length - 1,
                          curSeg = possibleRouteSegments[idx].nextSeg,
                          curSegStartNode = possibleRouteSegments[idx].nextSegStartNode,
                          curSegEndNode = curSeg.getOtherNode(curSegStartNode),
                          curSegEndNodeSOutIds = segIdsFilter(curSegEndNode.attributes.segIDs, possibleRouteSegments.map((routeSeg) => routeSeg.nextSeg.attributes.id));
                    if (endNodeIds.includes(curSegEndNode.attributes.id)
                        && (curSegEndNode.isTurnAllowedBySegDirections(curSeg, endSeg) || curSeg.isTurnAllowed(endSeg, curSegEndNode))) {
                        const newRoute = [startSeg.attributes.id].concat(possibleRouteSegments.map((routeSeg) => routeSeg.nextSeg.attributes.id), [endSeg.attributes.id]);
                        if (!returnRoutes.some(route => route.length === newRoute.length && route.every((val, idx) => val === newRoute[idx]))) {
                            returnRoutes.push(newRoute);
                        }
                        possibleRouteSegments.splice(idx, 1);
                    }
                    else if ((curLength + curSeg.attributes.length) > maxLength) {
                        possibleRouteSegments.splice(idx, 1);
                        curLength -= curSeg.attributes.length;
                    }
                    else {
                        const nextSegObj = getNextSegs(curSegEndNodeSOutIds, curSeg, curSegEndNode);
                        if (nextSegObj.addPossibleRouteSegments.length > 0) {
                            curLength += curSeg.attributes.length;
                            possibleRouteSegments.push(nextSegObj.addPossibleRouteSegments[0]);
                            processedSegs.push({ fromSegId: curSeg.attributes.id, toSegId: nextSegObj.addPossibleRouteSegments[0].nextSeg.attributes.id });
                        }
                        else {
                            curLength -= curSeg.attributes.length;
                            possibleRouteSegments.splice(idx, 1);
                        }
                    }
                }
                if (returnRoutes.length > 0) {
                    break;
                }
            }
            else {
                processedSegs.push({ fromSegId: startSeg.attributes.id, toSegId: sOut.attributes.id });
            }
        }
        return returnRoutes;
    }

    async function doCheckBDP(viaLM = false) {
        const segmentSelection = W.selectionManager.getSegmentSelection();
        let startSeg,
            endSeg,
            directRoutes = [];
        if (segmentSelection.segments.length < 2) {
            insertCheckBDPButton(true);
            WazeWrap.Alerts.error(_SCRIPT_SHORT_NAME, 'You must select either the two <i>bracketing segments</i> or an entire detour route with <i>bracketing segments</i>.');
            return;
        }
        if (segmentSelection.multipleConnectedComponents && (segmentSelection.segments.length > 2)) {
            WazeWrap.Alerts.error(
                _SCRIPT_SHORT_NAME,
                'If you select more than 2 segments, the selection of segments must be continuous.<br><br>'
                + 'Either select just the two bracketing segments or an entire detour route with bracketing segments.'
            );
            return;
        }
        if (!segmentSelection.multipleConnectedComponents && (segmentSelection.segments.length === 2)) {
            WazeWrap.Alerts.error(_SCRIPT_SHORT_NAME, 'You selected only two segments and they connect to each other. There are no alternate routes.');
            return;
        }
        if (segmentSelection.segments.length === 2) {
            log('BDP called with Two segments selected.');
            [startSeg, endSeg] = segmentSelection.segments;
        }
        else if (_pathEndSegId) {
            if (segmentSelection.segments[0].attributes.id === _pathEndSegId) {
                [endSeg] = segmentSelection.segments;
                startSeg = segmentSelection.segments[segmentSelection.segments.length - 1];
            }
            else {
                [startSeg] = segmentSelection.segments;
                endSeg = segmentSelection.segments[segmentSelection.segments.length - 1];
            }
            const routeNodeIds = segmentSelection.segments.slice(1, -1).flatMap((segment) => [segment.attributes.toNodeID, segment.attributes.fromNodeID]);
            if (routeNodeIds.some((nodeId) => endSeg.attributes.fromNodeID === nodeId)) {
                endSeg.attributes.bdpcheck = { routeFarEndNodeId: endSeg.attributes.toNodeID };
            } else {
                endSeg.attributes.bdpcheck = { routeFarEndNodeId: endSeg.attributes.fromNodeID };
            }
        } else {
            [startSeg] = segmentSelection.segments;
            endSeg = segmentSelection.segments[segmentSelection.segments.length - 1];
            const routeNodeIds = segmentSelection.segments.slice(1, -1).flatMap((segment) => [segment.attributes.toNodeID, segment.attributes.fromNodeID]);
            if (routeNodeIds.some((nodeId) => endSeg.attributes.fromNodeID === nodeId)) {
                endSeg.attributes.bdpcheck = { routeFarEndNodeId: endSeg.attributes.toNodeID };
            } else {
                endSeg.attributes.bdpcheck = { routeFarEndNodeId: endSeg.attributes.fromNodeID };
            }
        }
        if ((startSeg.attributes.roadType < 3) || (startSeg.attributes.roadType === 4) || (startSeg.attributes.roadType === 5) || (startSeg.attributes.roadType > 7)
            || (endSeg.attributes.roadType < 3) || (endSeg.attributes.roadType === 4) || (endSeg.attributes.roadType === 5) || (endSeg.attributes.roadType > 7)
           ) {
            WazeWrap.Alerts.warning(_SCRIPT_SHORT_NAME, 'At least one of the bracketing selected segments is not in the correct road type group for BDP.', 0, 0);
            return;
        }
        if (!rtgContinuityCheck([startSeg, endSeg])) {
            log('Entered Condition: rtgContinuityCheck failed');
            WazeWrap.Alerts.warning(_SCRIPT_SHORT_NAME, 'One bracketing segment is a minor highway while the other is not. BDP only applies when bracketing segments are in the same road type group.');
            return;
        } else {
            WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, 'Both bracketing segments are in the same road type group.', 1, 0);
        }
        if (!nameContinuityCheck([startSeg, endSeg])) {
            log("Entered Condition: nameContinuityCheck failed");
            WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, 'The bracketing segments do not share a street name. BDP will not be applied to any route.', 1 , 0);
            return;
        } else {
            WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, 'The bracketing segments share a street name.', 1, 0);
        }
        const maxLength = (startSeg.attributes.roadType === 7) ? 5000 : 50000;
        log(`Entered Condition: Detour & maxLength TEST | Assigned maxLength as: ${maxLength}`);
        if (segmentSelection.segments.length === 2) {
            if (((startSeg.attributes.roadType === 7) && (W.map.getZoom() > 16))
                || ((startSeg.attributes.roadType !== 7) && (W.map.getZoom() > 15))) {
                _restoreZoomLevel = W.map.getZoom();
                // As of WME v2.162-3-gd95a5e841, W.map.getCenter() returns a JS object as { lon, lat }, not an OL LonLat instance.
                _restoreMapCenter = W.map.getCenter();
                await doZoom(false, (startSeg.attributes.roadType === 7) ? 16 : 15, getMidpoint(startSeg, endSeg));
            }
            if (viaLM) {
                log('Detour & maxLength test | Entered Condition: viaLM true');
                directRoutes = directRoutes.concat(await findLiveMapRoutes(startSeg, endSeg, maxLength));
            }
            else {
                const startSegDirection = startSeg.getDirection(),
                      endSegDirection = endSeg.getDirection();
                const startNodeObjs = [],
                      endNodeObjs = [];
                if ((startSegDirection !== 2) && startSeg.getToNode()) {
                    startNodeObjs.push(startSeg.getToNode());
                }
                if ((startSegDirection !== 1) && startSeg.getFromNode()) {
                    startNodeObjs.push(startSeg.getFromNode());
                }
                if ((endSegDirection !== 2) && endSeg.getFromNode()) {
                    endNodeObjs.push(endSeg.getFromNode());
                }
                if ((endSegDirection !== 1) && endSeg.getToNode()) {
                    endNodeObjs.push(endSeg.getToNode());
                }
                for (let i = 0, { length } = startNodeObjs; i < length; i++) {
                    const startNode = startNodeObjs[i];
                    directRoutes = findDirectRoute({
                        maxLength, startSeg, startNode, endSeg, endNodeIds: endNodeObjs.map((nodeObj) => nodeObj?.attributes.id)
                    });
                    if (directRoutes.length > 0) {
                        log('Detour & maxLength test | Qualifying Direct Routes is ',directRoutes);
                        log('Detour & maxLength test | # of possable Qualifying Direct Routes is ',directRoutes.length);
                        break;
                    }
                }
            }
        } else {
            const routeSegIds = W.selectionManager.getSegmentSelection().getSelectedSegments()
            .map((segment) => segment.attributes.id)
            .filter((segId) => (segId !== endSeg.attributes.id) && (segId !== startSeg.attributes.id)),
                  endNodeObj = endSeg.getOtherNode(W.model.nodes.getObjectById(endSeg.attributes.bdpcheck.routeFarEndNodeId)),
                  startSegDirection = startSeg.getDirection(),
                  startNodeObjs = [],
                  lastDetourSegId = routeSegIds.filter((el) => endNodeObj.attributes.segIDs.includes(el));
            let lastDetourSeg;
            if (lastDetourSegId.length === 1) {
                lastDetourSeg = W.model.segments.getObjectById(lastDetourSegId);
            } else {
                const oneWayTest = W.model.segments.getByIds(lastDetourSegId).filter(
                    (seg) => seg.isOneWay() && (endNodeObj.isTurnAllowedBySegDirections(endSeg, seg) || seg.isTurnAllowed(endSeg, endNodeObj))
                );
                if (oneWayTest.length === 1) {
                    [lastDetourSeg] = oneWayTest;
                } else {
                    WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, `Could not determine the last detour segment. Please send ${_SCRIPT_AUTHOR} a message with a PL describing this issue. Thank you!`, 1, 0);
                    return;
                }
            }
            const detourSegs = segmentSelection.segments.slice(1, -1),
                  detourSegTypes = [...new Set(detourSegs.map((segment) => segment.attributes.roadType))];
            log("Detour & maxLength test |Detour Segments are:", detourSegs);
            log(`Detour & maxLength test | Detour Segments Road Types are: ${detourSegTypes}`);
            if ([9, 10, 16, 18, 19, 22].some((type) => detourSegTypes.includes(type))) {
                WazeWrap.Alerts.warning(_SCRIPT_SHORT_NAME, 'Your selection contains one more more segments with an unrouteable road type. The selected route is not a valid route.');
                return;
            }
            if (![1].some((type) => detourSegTypes.includes(type))) {
                if (((startSeg.attributes.roadType === 7) && (W.map.getZoom() > 16))
                    || ((startSeg.attributes.roadType !== 7) && (W.map.getZoom() > 15))) {
                    _restoreZoomLevel = W.map.getZoom();
                    // As of WME v2.162-3-gd95a5e841, W.map.getCenter() returns a JS object as { lon, lat }, not an OL LonLat instance.
                    _restoreMapCenter = W.map.getCenter();
                    await doZoom(false, (startSeg.attributes.roadType === 7) ? 16 : 15, getMidpoint(startSeg, endSeg));
                }
            }
            if ((startSegDirection !== 2) && startSeg.getToNode()) {
                startNodeObjs.push(startSeg.getToNode());
            }
            if ((startSegDirection !== 1) && startSeg.getFromNode()) {
                startNodeObjs.push(startSeg.getFromNode());
            }
            if (nameContinuityCheck([lastDetourSeg, endSeg])) {
                log("Detour & maxLength test | nameContinuityCheck - A common street name **WAS** found between lastDetourSeg & 2nd Bracking Segment");
                WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, 'BDP **WILL NOT** be applied to this detour route because the last detour segment and the second bracketing segment share a common street name.', 1, 0);
                doZoom(true, _restoreZoomLevel, _restoreMapCenter);
                return;
            } else {
                log("Detour & maxLength test | nameContinuityCheck - A common street name was **NOT** found between lastDetourSeg & 2nd Bracking Segment");
                WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, 'Last detour segment and the second bracketing segment do not share a common street name.', 1, 0);
            }
            if (rtgContinuityCheck([lastDetourSeg, endSeg])) {
                log("Detour & maxLength test | rtgContinuityCheck - last detour segment and the second bracketing segment **ARE** in the same road type group");
                WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, 'BDP **WILL NOT** be applied to this detour route because the last detour segment and the second bracketing segment are in the same road type group.', 1, 0);
                doZoom(true, _restoreZoomLevel, _restoreMapCenter);
                return;
            } else {
                log("Detour & maxLength test | rtgContinuityCheck - last detour segment and the second bracketing segment **ARE NOT** in the same road type group");
                WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, 'Last detour segment and the second bracketing segment are **NOT** in the same road type group.', 1, 0);
            }
            if (detourSegs.length < 2) {
                log("Detour & maxLength test | Detour Number of Segments is ** LESS THAN 2 ** segments long. BDP will not be applied!");
                WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, 'BDP **WILL NOT** be applied to this detour route because it is less than 2 segments long.', 1, 0);
                doZoom(true, _restoreZoomLevel, _restoreMapCenter);
                return;
            } else {
                log(`Detour & maxLength test | Possable Detour is **${detourSegs.length}** segments long.`);
                WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, `Possable Detour is ${detourSegs.length} segments long.`, 1 ,0);
            }
            if (detourSegs.map((seg) => seg.attributes.length).reduce((a, b) => a + b) > ((startSeg.attributes.roadType === 7) ? 500 : 5000)) {
                log(`Detour & maxLength test | maxLength - Detour route is ** MORE THEN ** ${((startSeg.attributes.roadType === 7) ? '500m' : '5km')}`);
                WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, `BDP **WILL NOT** be applied to this detour route because it is longer than ${((startSeg.attributes.roadType === 7) ? '500m' : '5km')}.`, 1, 0);
                doZoom(true, _restoreZoomLevel, _restoreMapCenter);
                return;
            } else {
                log(`Detour & maxLength test | maxLength - Detour route is **LESS THAN** ${((startSeg.attributes.roadType === 7) ? '500m' : '5km')}`);
                WazeWrap.Alerts.info(_SCRIPT_SHORT_NAME, `Detour route is shorter than ${((startSeg.attributes.roadType === 7) ? '500m' : '5km')}.`, 1, 0);
            }
            if (viaLM) {
                directRoutes = directRoutes.concat(await findLiveMapRoutes(startSeg, endSeg, maxLength));
                log(`Detour & maxLength test | directRoutes updated with findLiveMapRoutes result`);
            } else {
                for (let i = 0, { length } = startNodeObjs; i < length; i++) {
                    const startNode = startNodeObjs[i];
                    directRoutes = findDirectRoute({
                        maxLength, startSeg, startNode, endSeg, endNodeIds: [endNodeObj.attributes.id]
                    });
                    if (directRoutes.length > 0) {
                        break;
                    }
                }
            }
        }
        if (directRoutes.length > 0) {
            log('Direct Route | A Direct Route has been found');
            WazeWrap.Alerts.confirm(
                _SCRIPT_SHORT_NAME,
                'A <b>direct route</b> was found! Would you like to select the direct route?',
                () => {
                    const segments = [];
                    for (let i = 0, { length } = directRoutes[0]; i < length; i++) {
                        const seg = W.model.segments.getObjectById(directRoutes[0][i]);
                        if (seg !== 'undefined') {
                            segments.push(seg);
                        }
                    }
                    W.selectionManager.setSelectedModels(segments);
                    doZoom(true, _restoreZoomLevel, _restoreMapCenter);
                },
                () => { doZoom(true, _restoreZoomLevel, _restoreMapCenter); },
                'Yes',
                'No'
            );
        } else if (segmentSelection.segments.length === 2) {
            log('Direct Route | **NO** Direct Routes found between the two selected segments!');
            WazeWrap.Alerts.info(
                _SCRIPT_SHORT_NAME,
                'No direct routes found between the two selected segments. A BDP penalty <b>will not</b> be applied to any routes.'
                + '<br><b>Note:</b> This could also be caused by the distance between the two selected segments is longer than than the allowed distance for detours.'
            , 1, 0);
            doZoom(true, _restoreZoomLevel, _restoreMapCenter);
        } else {
            log('Direct Route | **NO** Direct Routes found between segments!');
            WazeWrap.Alerts.info(
                _SCRIPT_SHORT_NAME,
                'No direct routes found between the possible detour bracketing segments. A BDP penalty <b>will not</b> be applied to the selected route.'
                + '<br><b>Note:</b> This could also be because any possible direct routes are very long, which would take longer to travel than taking the selected route (even with penalty).'
            ,1 ,0);
            doZoom(true, _restoreZoomLevel, _restoreMapCenter);
        }
    }

    function insertCheckBDPButton(remove = false) {
        const wmeBdpcDiv = document.getElementById('WME-BDPC'),
              elem = document.getElementById('segment-edit-general');
        if (remove) {
            if (wmeBdpcDiv) {
                wmeBdpcDiv.remove();
            }
            return;
        }
        if (!elem) {
            return;
        }

        const docFrags = document.createDocumentFragment(),
              doCheckBdpWme = (evt) => {
                  evt.preventDefault();
                  doCheckBDP(false);
              },
              doCheckBdpLm = (evt) => {
                  evt.preventDefault();
                  doCheckBDP(true);
              };
        if (!wmeBdpcDiv) {
            const contentDiv = createElem('div', { style: 'align-items:center; cursor:pointer; display:flex; font-size:13px; gap:8px; justify-content:flex-start;', textContent: 'BDP-Check:' });
            contentDiv.appendChild(createElem('wz-button', {
                id: 'WME-BDPC-WME', color: 'secondary', size: 'xs', textContent: 'WME', title: 'Check BDP of selected segments, via WME.'
            }, [{ click: doCheckBdpWme }]));
            contentDiv.appendChild(createElem('wz-button', {
                id: 'WME-BDPC-LM', color: 'secondary', size: 'xs', textContent: 'LM', title: 'Check BDP of selected segments, via LM.'
            }, [{ click: doCheckBdpLm }]));
            const wzCard = createElem('wz-card', { style: '--wz-card-padding:4px 8px; --wz-card-margin:0; --wz-card-width:auto; display:block; margin-bottom:8px;' });
            wzCard.appendChild(contentDiv);
            const divElemRoot = createElem('div', { id: 'WME-BDPC' });
            divElemRoot.appendChild(wzCard);
            docFrags.appendChild(divElemRoot);
        }

        // If fragments have been created in docFrags, insert them
        if (docFrags.firstChild) {
            elem.insertBefore(docFrags, elem.firstChild);
        }
    }

    function pathSelected(evt) {
        if (evt?.feature?.model?.type === 'segment') {
            _pathEndSegId = evt.feature.model.attributes.id;
        }
    }

    function checkBdpcVersion() {
        if (_IS_ALPHA_VERSION) {
            return;
        }
        let updateMonitor;
        try {
            updateMonitor = new WazeWrap.Alerts.ScriptUpdateMonitor(_SCRIPT_LONG_NAME, _SCRIPT_VERSION, (_IS_BETA_VERSION ? dec(_BETA_DL_URL) : _PROD_DL_URL), GM_xmlhttpRequest);
            updateMonitor.start();
        }
        catch (err) {
            logError('Upgrade version check:', err);
        }
    }

    function onSelectionChanged(evt) {
        //log('Event:', evt);
        if (!evt || !evt.detail || !evt.detail.selected) {
            return;
        }
        const selectedSegmentsCount = evt.detail.selected
        .filter(feature => feature.featureType === 'segment')
        .length;
        insertCheckBDPButton(selectedSegmentsCount < 2);
    }

    async function onWazeWrapReady() {
        log('Initializing');
        checkBdpcVersion();
        await loadSettingsFromStorage();
        W.selectionManager.events.register('selectionchanged', null, onSelectionChanged);
        W.selectionManager.webMapSelectionManager.onSelectPath = pathSelected;
        W.selectionManager.webMapSelectionManager.onFeatureClicked = (event, additionalData) => {
            _pathEndSegId = undefined;
        };
        W.selectionManager.webMapSelectionManager.onFeatureOut = () => {
            _pathEndSegId = undefined;
        };
        W.selectionManager.webMapSelectionManager.onDeselect = () => { _pathEndSegId = undefined; };
        W.selectionManager.webMapSelectionManager.onFeatureBoxSelection = () => { _pathEndSegId = undefined; };
        showScriptInfoAlert();
        log(`Fully initialized in ${Math.round(performance.now() - _LOAD_BEGIN_TIME)} ms.`);
    }

    function onWmeReady(tries = 1) {
        if (typeof tries === 'object') {
            tries = 1;
        }
        checkTimeout({ timeout: 'onWmeReady' });
        if (WazeWrap?.Ready) {
            logDebug('WazeWrap is ready. Proceeding with initialization.');
            onWazeWrapReady();
        } else if (tries < 1000) {
            logDebug(`WazeWrap is not in Ready state. Retrying ${tries} of 1000.`);
            _timeouts.onWmeReady = window.setTimeout(onWmeReady, 200, ++tries);
        } else {
            logError('onWmeReady timed out waiting for WazeWrap Ready state.');
        }
    }

    function onWmeInitialized() {
        if (W.userscripts?.state?.isReady) {
            logDebug('W is ready and already in "wme-ready" state. Proceeding with initialization.');
            onWmeReady(1);
        } else {
            logDebug('W is ready, but state is not "wme-ready". Adding event listener.');
            document.addEventListener('wme-ready', onWmeReady, { once: true });
        }
    }

    function bootstrap() {
        if (!W) {
            logDebug('W is not available. Adding event listener.');
            document.addEventListener('wme-initialized', onWmeInitialized, { once: true });
        } else {
            onWmeInitialized();
        }
    }

    bootstrap();
}
)();
