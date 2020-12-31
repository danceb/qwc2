/**
 * Copyright 2015-2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import ol from 'openlayers';
import React from 'react';
import PropTypes from 'prop-types';
import assign from 'object-assign';
import isEmpty from 'lodash.isempty';

import mapUtils from '../../../utils/MapUtils';

export default class OpenlayersMap extends React.Component {
    static propTypes = {
        bbox: PropTypes.object,
        center: PropTypes.array,
        children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
        id: PropTypes.string,
        identifyEnabled: PropTypes.bool,
        interactive: PropTypes.bool,
        mapOptions: PropTypes.object,
        mapStateSource: PropTypes.string,
        maxExtent: PropTypes.array,
        mousePointer: PropTypes.string,
        onClick: PropTypes.func,
        onFeatureClick: PropTypes.func,
        onMapViewChanges: PropTypes.func,
        onMouseMove: PropTypes.func,
        projection: PropTypes.string,
        registerHooks: PropTypes.bool,
        resolutions: PropTypes.array,
        setCurrentTask: PropTypes.func,
        setLayerLoading: PropTypes.func,
        trackMousePos: PropTypes.bool,
        unsetTaskOnMapClick: PropTypes.bool,
        zoom: PropTypes.number.isRequired,
        zoomControl: PropTypes.bool
    }
    static defaultProps = {
        id: 'map',
        onMapViewChanges: () => {},
        onClick: () => {},
        onFeatureClick: () => {},
        onMouseMove: () => {},
        setLayerLoading: () => {},
        mapOptions: {},
        projection: 'EPSG:3857',
        registerHooks: true,
        interactive: true
    }
    state = {
        projection: null,
        resolutions: [],
        rebuildView: false
    }
    componentDidMount() {
        const interactionsOptions = assign(this.props.interactive ? {} : {
            doubleClickZoom: false,
            altShiftDragRotate: true,
            shiftDragZoom: true,
            pinchRotate: true,
            pinchZoom: true
        }, this.props.mapOptions.interactions);

        const interactions = ol.interaction.defaults(
            assign(interactionsOptions, {
                dragPan: false, // don't create default interaction, but create it below with custom params
                mouseWheelZoom: false // don't create default interaction, but create it below with custom params
            })
        );
        interactions.extend([
            new ol.interaction.DragPan({kinetic: null})
        ]);
        interactions.extend([
            new ol.interaction.MouseWheelZoom({duration: this.props.mapOptions.zoomDuration || 0})
        ]);
        const controls = ol.control.defaults(assign({
            zoom: this.props.zoomControl,
            attributionOptions: ({
                collapsible: false
            })
        }, this.props.mapOptions.controls));
        const map = new ol.Map({
            layers: [],
            controls: controls,
            interactions: interactions,
            target: this.props.id,
            view: this.createView(this.props.center, this.props.zoom, this.props.projection, this.props.resolutions)
        });
        if (this.props.mapOptions.antialiasing === false) {
            map.on('precompose', function(evt) {
                evt.context.imageSmoothingEnabled = false;
                evt.context.webkitImageSmoothingEnabled = false;
                evt.context.mozImageSmoothingEnabled = false;
                evt.context.msImageSmoothingEnabled = false;
            });
        }
        map.on('moveend', this.updateMapInfoState);
        map.on('singleclick', (event) => {
            if (this.props.unsetTaskOnMapClick) {
                this.props.setCurrentTask(null);
                return;
            }
            const features = [];
            this.map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
                features.push([feature, layer]);
            });
            if (!this.props.identifyEnabled && !isEmpty(features)) {
                const feature = features[0][0];
                const layer = features[0][1];
                this.props.onFeatureClick({
                    coordinate: this.map.getEventCoordinate(event.originalEvent),
                    pixel: this.map.getEventPixel(event.originalEvent),
                    geomType: feature.getGeometry().getType(),
                    geometry: feature.getGeometry().getCoordinates(),
                    modifiers: {
                        alt: event.originalEvent.altKey,
                        ctrl: event.originalEvent.ctrlKey,
                        shift: event.originalEvent.shiftKey
                    },
                    button: 0,
                    layer: layer ? layer.get('id') : null,
                    feature: feature.getId()
                });
            } else {
                this.props.onClick({
                    coordinate: this.map.getEventCoordinate(event.originalEvent),
                    pixel: this.map.getEventPixel(event.originalEvent),
                    modifiers: {
                        alt: event.originalEvent.altKey,
                        ctrl: event.originalEvent.ctrlKey,
                        shift: event.originalEvent.shiftKey
                    },
                    button: 0
                });
            }
        });
        map.getViewport().addEventListener('contextmenu', (event)  => {
            event.preventDefault();
            const features = [];
            this.map.forEachFeatureAtPixel(this.map.getEventPixel(event), (feature, layer) => {
                features.push([feature, layer]);
            });
            if (!this.props.identifyEnabled && !isEmpty(features)) {
                const feature = features[0][0];
                const layer = features[0][1];
                this.props.onFeatureClick({
                    coordinate: this.map.getEventCoordinate(event),
                    pixel: this.map.getEventPixel(event),
                    modifiers: {
                        alt: event.altKey,
                        ctrl: event.ctrlKey,
                        shift: event.shiftKey
                    },
                    button: 2,
                    layer: layer ? layer.get('id') : null,
                    feature: feature.getId()
                });
            } else {
                this.props.onClick({
                    coordinate: this.map.getEventCoordinate(event),
                    pixel: this.map.getEventPixel(event),
                    modifiers: {
                        alt: event.altKey,
                        ctrl: event.ctrlKey,
                        shift: event.shiftKey
                    },
                    button: 2
                });
            }
            return false;
        });
        map.on('pointermove', (event) => {
            if (this.props.trackMousePos) {
                this.props.onMouseMove({
                    position: {
                        coordinate: event.coordinate,
                        pixel: event.pixel
                    }
                });
            }
        });

        this.map = map;
        this.updateMapInfoState();
        this.setMousePointer(this.props.mousePointer);
        // NOTE: this re-call render function after div creation to have the map initialized.
        this.forceUpdate();

        if (this.props.registerHooks) {
            this.registerHooks();
        }
    }
    updateMapInfoState = () => {
        const view = this.map.getView();
        const c = view.getCenter() || [0, 0];
        const bbox = {
            bounds: view.calculateExtent(this.map.getSize()),
            rotation: view.getRotation()
        };
        const size = {
            width: this.map.getSize()[0],
            height: this.map.getSize()[1]
        };
        this.props.onMapViewChanges(c, view.getZoom() || 0, bbox, size, this.props.id, this.props.projection);
    }
    static getDerivedStateFromProps(nextProps, state) {
        if ((nextProps.projection !== state.projection) || (nextProps.resolutions !== state.resolutions)) {
            return {
                rebuildView: true,
                projection: nextProps.projection,
                resolutions: nextProps.resolutions
            };
        }
        return null;
    }
    componentDidUpdate(prevProps, prevState) {
        if (this.props.mousePointer !== prevProps.mousePointer) {
            this.setMousePointer(this.props.mousePointer);
        }

        if (this.props.zoomControl !== prevProps.zoomControl) {
            if (this.props.zoomControl) {
                this.map.addControl(new ol.control.Zoom());
            } else {
                this.map.removeControl(this.map.getControls().getArray().filter((ctl) => ctl instanceof ol.control.Zoom)[0]);
            }
        }

        if (prevProps.id !== this.props.mapStateSource) {
            const view = this.map.getView();
            const centerChanged = prevProps.center[0] !== this.props.center[0] ||
                                  prevProps.center[1] !== this.props.center[1];

            if (centerChanged) {
                view.setCenter(this.props.center);
            }
            if (prevProps.zoom !== this.props.zoom) {
                view.setZoom(this.props.zoom);
            }
            if (prevProps.bbox.rotation !== this.props.bbox.rotation) {
                view.setRotation(this.props.bbox.rotation);
            }
        }

        if (this.state.rebuildView) {
            this.setState({rebuildView: false});
        }
    }
    componentWillUnmount() {
        this.map.setTarget(null);
    }
    render() {
        const map = this.map;

        if (map && this.state.rebuildView) {
            this.map.setView(this.createView(this.props.center, this.props.zoom, this.props.projection, this.props.resolutions));
            // We have to force ol to drop tile and reload
            this.map.getLayers().forEach((l) => {
                if (l instanceof ol.layer.Group) {
                    l.getLayers().forEach(sublayer => {
                        const source = sublayer.getSource();
                        if (source.getTileLoadFunction) {
                            source.setTileLoadFunction(source.getTileLoadFunction());
                        }
                    });
                } else {
                    const source = l.getSource();
                    if (source.getTileLoadFunction) {
                        source.setTileLoadFunction(source.getTileLoadFunction());
                    }
                }
            });
            this.map.render();
        }

        const children = map ? React.Children.map(this.props.children, child => {
            return child ? React.cloneElement(child, {
                map: map,
                mapId: this.props.id,
                projection: this.props.projection,
                setLayerLoading: this.props.setLayerLoading
            }) : null;
        }) : null;

        return (
            <div id={this.props.id}>
                {children}
            </div>
        );
    }
    createView = (center, zoom, projection, resolutions) => {
        const viewOptions = {
            projection: projection,
            center: center,
            zoom: zoom,
            resolutions: resolutions
        };
        if (this.props.maxExtent) {
            ol.proj.get(projection).setExtent(this.props.maxExtent);
        }
        return new ol.View(viewOptions);
    }
    setMousePointer = (pointer) => {
        if (this.map) {
            const mapDiv = this.map.getViewport();
            mapDiv.style.cursor = pointer || 'auto';
        }
    }
    registerHooks = () => {
        mapUtils.registerHook(mapUtils.GET_PIXEL_FROM_COORDINATES_HOOK, (pos) => {
            return this.map.getPixelFromCoordinate(pos);
        });
        mapUtils.registerHook(mapUtils.GET_COORDINATES_FROM_PIXEL_HOOK, (pixel) => {
            return this.map.getCoordinateFromPixel(pixel);
        });
    }
}
