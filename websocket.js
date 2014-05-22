'use strict';

/* Copyright 2014 Azure Standard https://www.azurestandard.com/
 * Released under the MIT license (http://opensource.org/licenses/MIT).
 *
 * A WebSocket service for AngularJS
 */

var websocket = angular.module('websocket', []);

websocket.
    factory('websocket', ['$rootScope', function($rootScope) {
        var ws, make_message, parse_message, dispatch, Service, ready, queue;
        ready = false;
        queue = [];

        //Websocket setup
        ws = new window.WebSocket("ws://automation.azurestandard.com:9000");

        ws.onopen = function () {
            console.log("Socket has been opened");
            ready = true;
            if (queue.length) {
                queue.forEach(function (item) {
                    this.send(item);
                }, ws);
            }
            queue = [];
        }

        ws.onerror = function (error) {
            console.log("WebSocket Error ");
            console.log(error);
        };

        // Log messages from the server
        ws.onmessage = function (msg) {
            var parsed;
            parsed = parse_message(msg.data);
            //This is a 'service' level message, which all service
            //consumers should listen to, and react by reloading.
            if (parsed.topic == '/refresh') {
                window.location.reload();
            }
            dispatch.handle(parsed.topic, parsed.body)
            $rootScope.$apply();
        };

        dispatch = {
            listeners: {},
            register: function (topic, func) {
                var current;
                topic = topic.toLowerCase();
                current = this.listeners[topic] || [];
                current.push(func);
                this.listeners[topic] = _.unique(current, false, toString);
            },
            deRegister: function (topic, func) {
                this.listeners['topic'] = _.reject(
                    this.listeners['topic'], function (el) {
                        return el.toString() === func.toString();
                    });
            },
            handle: function (topic, body) {
                var key, interested;
                interested = [];
                _.each(_.keys(this.listeners),
                       function (key) {
                           if (topic.indexOf(key) === 0) {
                               interested.push(this.listeners[key])
                           }
                       },
                       this
                      );
                _.map(_.unique(_.flatten(interested), false, toString),
                      function (item) {
                          item(topic, _.extend(body));
                      });
            }
        }

        // Utilities
        make_message = function (topic, body) {
            return topic + " " + JSON.stringify(body);
        };

        parse_message = function (msg) {
            var topic, body, parts;
            parts = msg.split(" ", 1);
            topic = parts[0];
            body = JSON.parse(msg.substring(topic.length + 1));
            return {"topic": topic, "body": body};
        };

        var send = function (msg) {
            if (ready) {
                ws.send(msg);
            } else {
                queue.push(msg);
            }
        };

        // We return this object to anything injecting our service
        Service = {
            emit: function (topic, body) {
                this.send(make_message(topic,body));
            },

            register: function (topic, func) {
                dispatch.register(topic, func);
            },
        }

        return Service;
    }]);
