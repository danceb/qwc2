/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import url from 'url';
import axios from 'axios';
import assign from 'object-assign';
import {LayerRole} from '../actions/layers';
import ConfigUtils from '../utils/ConfigUtils';
import LayerUtils from '../utils/LayerUtils';

export const UrlParams = {
    updateParams(dict) {
        if (ConfigUtils.getConfigProp("omitUrlParameterUpdates") === true) {
            return;
        }
        // Timeout: avoid wierd issue where Firefox triggers a full reload when invoking history-replaceState directly
        setTimeout(() => {
            const urlObj = url.parse(window.location.href, true);
            urlObj.query = assign(urlObj.query, dict);
            const propNames = Object.getOwnPropertyNames(urlObj.query);

            for (const propName of propNames) {
                if (urlObj.query[propName] === undefined) {
                    delete urlObj.query[propName];
                }
            }
            delete urlObj.search;
            history.replaceState({id: urlObj.host}, '', url.format(urlObj));
        }, 0);
    },
    getParam(key) {
        const urlObj = url.parse(window.location.href, true);
        return urlObj.query[key];
    },
    getParams() {
        return url.parse(window.location.href, true).query;
    },
    clear() {
        this.updateParams({k: undefined, t: undefined, l: undefined, bl: undefined, c: undefined, s: undefined, e: undefined, crs: undefined, st: undefined, sp: undefined});
    }
};

export function generatePermaLink(state, callback, user = false) {
    if (!ConfigUtils.getConfigProp("permalinkServiceUrl")) {
        callback(window.location.href);
        return;
    }
    // Only store redlining layers
    const exploded = LayerUtils.explodeLayers(state.layers.flat.filter(layer => layer.role !== LayerRole.BACKGROUND));
    const redliningLayers = exploded.map((entry, idx) => ({...entry, pos: idx}))
        .filter(entry => entry.layer.role === LayerRole.USERLAYER && entry.layer.type === 'vector')
        .map(entry => ({...entry.layer, pos: entry.pos}));
    const permalinkState = {
        layers: redliningLayers
    };
    const route = user ? "userpermalink" : "createpermalink";
    axios.post(ConfigUtils.getConfigProp("permalinkServiceUrl").replace(/\/$/, '') + "/" + route + "?url=" + encodeURIComponent(window.location.href), permalinkState)
        .then(response => callback(response.data.permalink || window.location.href))
        .catch(() => callback(window.location.href));
}

export function resolvePermaLink(initialParams, callback) {
    const key = UrlParams.getParam('k');
    if (key) {
        axios.get(ConfigUtils.getConfigProp("permalinkServiceUrl").replace(/\/$/, '') + "/resolvepermalink?key=" + key)
            .then(response => {
                callback(response.data.query || {}, response.data.state || {});
            })
            .catch(() => {
                callback(initialParams, {});
            });
    } else {
        callback(initialParams, {});
    }
}
