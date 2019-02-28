/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
const React = require('react');
const PropTypes = require('prop-types');
const ReactIntl = require('react-intl');

const FormattedMessage = ReactIntl.FormattedMessage;

class Message extends React.Component {
    static propTypes = {
        msgId: PropTypes.string.isRequired,
        msgParams: PropTypes.object
    }
    static contextTypes = {
        intl: PropTypes.object
    }
    render() {
        if(!this.context.intl) {
            return (<span>{this.props.msgId || ""}</span>);
        }
        return (
            <FormattedMessage id={this.props.msgId} values={this.props.msgParams}>
                {typeof this.props.children === "function" ? this.props.children : null}
            </FormattedMessage>
        );
    }
};

module.exports = Message;
