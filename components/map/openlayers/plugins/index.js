/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import bingLayer from './BingLayer';
import googleLayer from './GoogleLayer';
import graticuleLayer from './GraticuleLayer';
import mapquestLayer from './MapQuest';
import osmLayer from './OSMLayer';
import overlayLayer from './OverlayLayer';
import tileproviderLayer from './TileProviderLayer';
import vectorLayer from './VectorLayer';
import wmsLayer from './WMSLayer';
import wmtsLayer from './WMTSLayer';
import wfsLayer from './WFSLayer';

export default {
    bing: bingLayer,
    google: googleLayer,
    graticule: graticuleLayer,
    mapquest: mapquestLayer,
    osm: osmLayer,
    overlay: overlayLayer,
    tileprovider: tileproviderLayer,
    vector: vectorLayer,
    wms: wmsLayer,
    wmts: wmtsLayer,
    wfs: wfsLayer
};
