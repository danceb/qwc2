/**
 * Copyright 2020, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {ReducerRegistry} from '../stores/StandardStore';
import windowsReducer from '../reducers/windows';
ReducerRegistry.register("windows", windowsReducer);

export const SHOW_IFRAME_DIALOG = 'SHOW_IFRAME_DIALOG';
export const SHOW_NOTIFICATION = 'SHOW_NOTIFICATION';
export const CLOSE_WINDOW = 'CLOSE_WINDOW';
export const CLOSE_ALL_WINDOWS = 'CLOSE_ALL_WINDOWS';


export function showIframeDialog(name, url, options) {
    return {
        type: SHOW_IFRAME_DIALOG,
        name: name,
        url: url,
        options: options
    };
}

export function showNotification(name, text) {
    return {
        type: SHOW_NOTIFICATION,
        name: name,
        text: text
    };
}

export function closeWindow(name) {
    return {
        type: CLOSE_WINDOW,
        name: name
    };
}

export function closeAllWindows() {
    return {
        type: CLOSE_ALL_WINDOWS
    };
}
