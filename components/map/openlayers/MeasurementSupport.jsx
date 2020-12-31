/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import ol from 'openlayers';
import CoordinatesUtils from '../../../utils/CoordinatesUtils';
import LocaleUtils from '../../../utils/LocaleUtils';
import MeasureUtils from '../../../utils/MeasureUtils';

const measureLabelStyleFactory = () => new ol.style.Text({
    font: '10pt sans-serif',
    text: "",
    fill: new ol.style.Fill({color: 'white'}),
    stroke: new ol.style.Stroke({color: [0, 0, 0, 0.5], width: 4}),
    rotation: 0,
    offsetY: 10
});

const measureStyleFactory = () => [
    new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.25)' }),
        stroke: new ol.style.Stroke({ color: 'red', width: 4 }),
        text: measureLabelStyleFactory()
    }),
    new ol.style.Style({
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({color: 'white'}),
            stroke: new ol.style.Stroke({ color: 'red', width: 2 })
        }),
        geometry: (feature) => {
            if (feature.getGeometry().getType() === "Point") {
                return new ol.geom.MultiPoint([feature.getGeometry().getCoordinates()]);
            } else if (feature.getGeometry().getType() === "LineString") {
                return new ol.geom.MultiPoint(feature.getGeometry().getCoordinates());
            } else {
                return new ol.geom.MultiPoint(feature.getGeometry().getCoordinates()[0]);
            }
        }
    })
];


export default class MeasurementSupport extends React.Component {
    static propTypes = {
        changeMeasurementState: PropTypes.func,
        map: PropTypes.object,
        measurement: PropTypes.object,
        projection: PropTypes.string
    }
    componentDidUpdate(prevProps, prevState) {
        if (this.props.measurement.geomType && this.props.measurement.geomType !== prevProps.measurement.geomType ) {
            this.addDrawInteraction(this.props);
        } else if (!this.props.measurement.geomType) {
            this.reset();
        } else if (this.props.measurement.lenUnit !== prevProps.measurement.lenUnit) {
            this.relabelSegments(this.props);
        }
    }
    render() {
        return null;
    }
    addDrawInteraction = (newProps) => {
        this.reset();

        // Create a layer to draw on
        this.measureLayer = new ol.layer.Vector({
            source: new ol.source.Vector(),
            zIndex: 1000000
        });
        this.props.map.addLayer(this.measureLayer);

        let geometryType = newProps.measurement.geomType;
        if (geometryType === 'Bearing') {
            geometryType = 'LineString';
        }

        // create an interaction to draw with
        this.drawInteraction = new ol.interaction.Draw({
            source: this.measureLayer.getSource(),
            condition: (event) => { return event.pointerEvent.buttons === 1; },
            type: geometryType,
            style: []
        });

        this.drawInteraction.on('drawstart', (ev) => {
            this.leaveTemporaryPickMode();
            this.segmentMarkers = [];
            this.measureLayer.getSource().clear();
            this.sketchFeature = ev.feature;
            this.sketchFeature.setStyle(measureStyleFactory());
            this.props.map.on('pointermove', this.updateMeasurementResults);
            this.props.map.on('click', this.updateMeasurementResults);
        });
        this.drawInteraction.on('drawend', (ev) => {
            this.props.map.un('pointermove', this.updateMeasurementResults);
            this.props.map.un('click', this.updateMeasurementResults);
            this.updateMeasurementResults(ev, false);
            this.enterTemporaryPickMode();
        });

        this.props.map.addInteraction(this.drawInteraction);
    }
    reset = () => {
        if (this.drawInteraction !== null) {
            this.props.map.removeInteraction(this.drawInteraction);
            this.drawInteraction = null;
            this.props.map.removeLayer(this.measureLayer);
            this.sketchFeature = null;
            this.segmentMarkers = [];
        }
    }
    enterTemporaryPickMode = () => {
        this.modifyInteraction = new ol.interaction.Modify({
            features: new ol.Collection([this.sketchFeature]),
            condition: (event) => { return event.pointerEvent.buttons === 1; },
            insertVertexCondition: () => { return this.props.measurement.geomType === 'Bearing' ? false : true; },
            deleteCondition: (event) => { return ol.events.condition.shiftKeyOnly(event) && ol.events.condition.singleClick(event); }
        });
        this.modifyInteraction.on('modifystart', () => {
            this.props.map.on('pointermove', this.updateMeasurementResults);
            this.props.map.on('click', this.updateMeasurementResults);
        });
        this.modifyInteraction.on('modifyend', evt => {
            this.props.map.un('pointermove', this.updateMeasurementResults);
            this.props.map.un('click', this.updateMeasurementResults);
            this.updateMeasurementResults(evt, false);
        });
        this.props.map.addInteraction(this.modifyInteraction);
    }
    leaveTemporaryPickMode = () => {
        if (this.modifyInteraction) {
            this.props.map.removeInteraction(this.modifyInteraction);
            this.modifyInteraction = null;
        }
    }
    updateMeasurementResults = (ev, drawing = true) => {
        if (!this.sketchFeature) {
            return;
        }
        const coo = this.sketchFeature.getGeometry().getCoordinates();

        let bearing = 0;
        if (this.props.measurement.geomType === 'Bearing' && coo.length > 1) {
            // calculate the azimuth as base for bearing information
            bearing = CoordinatesUtils.calculateAzimuth(coo[0], coo[1], this.props.projection);
            if (coo.length > 2 && this.drawInteraction.getActive()) {
                this.drawInteraction.finishDrawing();
            }
            const text = MeasureUtils.getFormattedBearingValue(bearing);
            this.sketchFeature.getStyle()[0].getText().setText(text);
        }
        if (this.props.measurement.geomType === 'Point') {
            this.sketchFeature.getStyle()[0].getText().setText(coo.map(x => x.toFixed(2)).join(", "));
        }
        let length = null;
        if (this.props.measurement.geomType === 'LineString') {
            length = this.calculateGeodesicDistances(coo);
            if (this.segmentMarkers.length < coo.length - 1) {
                const point = new ol.Feature({
                    geometry: new ol.geom.Point(coo[coo.length - 1])
                });
                const label = new ol.style.Text({
                    font: '10pt sans-serif',
                    text: "",
                    fill: new ol.style.Fill({color: 'white'}),
                    stroke: new ol.style.Stroke({color: [0, 0, 0, 0.5], width: 4}),
                    rotation: 0,
                    offsetY: 10
                });
                point.setStyle(new ol.style.Style({text: label}));
                this.measureLayer.getSource().addFeature(point);
                this.segmentMarkers.push(point);
            }
            if (this.segmentMarkers.length > coo.length - 1) {
                this.measureLayer.getSource().removeFeature(this.segmentMarkers.pop());
            }
            for (let i = 0; i < this.segmentMarkers.length; ++i) {
                this.updateSegmentMarker(this.segmentMarkers[i], coo[i], coo[i + 1], length[i]);
            }
        }
        let area = null;
        if (this.props.measurement.geomType === 'Polygon') {
            area = this.calculateGeodesicArea(this.sketchFeature.getGeometry().getLinearRing(0).getCoordinates());
            const text = LocaleUtils.toLocaleFixed(MeasureUtils.getFormattedArea(this.props.measurement.areaUnit, area), 2);
            this.sketchFeature.getStyle()[0].getText().setText(text);
        }

        this.props.changeMeasurementState({
            geomType: this.props.measurement.geomType,
            drawing: drawing,
            coordinates: coo,
            length: length,
            area: area,
            bearing: bearing
        });
    }
    updateSegmentMarker = (marker, p1, p2, length) => {
        let angle = -Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
        if (Math.abs(angle) > 0.5 * Math.PI) {
            angle += Math.PI;
        }
        const text = LocaleUtils.toLocaleFixed(MeasureUtils.getFormattedLength(this.props.measurement.lenUnit, length), 2);
        marker.getStyle().getText().setText(text);
        marker.getStyle().getText().setRotation(angle);
        marker.setGeometry(new ol.geom.Point([0.5 * (p1[0] + p2[0]), 0.5 * (p1[1] + p2[1])]));
    }
    relabelSegments = (props) => {
        if (!this.sketchFeature) {
            return;
        }
        if (props.measurement.geomType === 'LineString') {
            const coo = this.sketchFeature.getGeometry().getCoordinates();
            const length = this.calculateGeodesicDistances(coo);
            for (let i = 0; i < this.segmentMarkers.length; ++i) {
                const text = LocaleUtils.toLocaleFixed(MeasureUtils.getFormattedLength(props.measurement.lenUnit, length[i]), 2);
                this.segmentMarkers[i].getStyle().getText().setText(text);
            }
            this.measureLayer.changed();
        }
    }
    reprojectedCoordinates = (coordinates) => {
        return coordinates.map((coordinate) => {
            return CoordinatesUtils.reproject(coordinate, this.props.projection, 'EPSG:4326');
        });
    }
    calculateGeodesicDistances = (coordinates) => {
        const reprojectedCoordinates = this.reprojectedCoordinates(coordinates);
        const lengths = [];
        for (let i = 0; i < reprojectedCoordinates.length - 1; ++i) {
            lengths.push(ol.sphere.getDistance(reprojectedCoordinates[i], reprojectedCoordinates[i + 1]));
        }
        return lengths;
    }
    calculateGeodesicArea = (coordinates) => {
        const reprojectedCoordinates = this.reprojectedCoordinates(coordinates);
        return Math.abs(ol.sphere.getArea(new ol.geom.Polygon([reprojectedCoordinates]), {projection: 'EPSG:4326'}));
    }
}
