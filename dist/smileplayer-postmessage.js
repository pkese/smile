// EventTarget interface http://www.w3.org/TR/DOM-Level-3-Events/#interface-EventTarget
//(MIT)
/**
 * @author mrdoob / http://mrdoob.com/
 */
(function (window) {
var EventDispatcher = window.EventDispatcher = function () {};
EventDispatcher.prototype = {

	constructor: EventDispatcher,

	apply: function ( object ) {

		object.addEventListener = EventDispatcher.prototype.addEventListener;
		object.hasEventListener = EventDispatcher.prototype.hasEventListener;
		object.removeEventListener = EventDispatcher.prototype.removeEventListener;
		object.dispatchEvent = EventDispatcher.prototype.dispatchEvent;

	},

	addEventListener: function ( type, listener ) {
		if ( this._listeners === undefined ) this._listeners = {};
		var listeners = this._listeners;
		
		if ( listeners[ type ] === undefined ) {
			listeners[ type ] = [];
		}

		if ( listeners[ type ].indexOf( listener ) === - 1 ) {
			listeners[ type ].push( listener );
		}
	},

	hasEventListener: function ( type, listener ) {
		if ( this._listeners === undefined ) return false;
		var listeners = this._listeners;

		if ( listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1 ) {
			return true;
		}
		return false;
	},

	removeEventListener: function ( type, listener ) {
		if ( this._listeners === undefined ) return;
		var listeners = this._listeners;
		var listenerArray = listeners[ type ];

		if ( listenerArray !== undefined ) {
			var index = listenerArray.indexOf( listener );
			if ( index !== - 1 ) {
				listenerArray.splice( index, 1 );
			}
		}
	},

	dispatchEvent: function ( event ) {
		if ( this._listeners === undefined ) return;
		var listeners = this._listeners;
		var listenerArray = listeners[ event.type ];

		if ( listenerArray !== undefined ) {
			event.target = this;
			var array = [];
			var length = listenerArray.length;

			for ( var i = 0; i < length; i ++ ) {
				array[ i ] = listenerArray[ i ];
			}

			for ( var i = 0; i < length; i ++ ) {
				array[ i ].call( this, event );
			}
		}
	}

};
}(window));
var smile = {};
(function ($, smile) {

    // Object literal parsing (derived from knockout.js binding/expressionRewriting.js)
    var javaScriptReservedWords = ["true", "false", "null", "undefined"],
        javaScriptAssignmentTarget = /^(?:[$_a-z][$\w]*|(.+)(\.\s*[$_a-z][$\w]*|\[.+\]))$/i,
        stringDouble = '"(?:[^"\\\\]|\\\\.)*"',
        stringSingle = "'(?:[^'\\\\]|\\\\.)*'",
        stringRegexp = '/(?:[^/\\\\]|\\\\.)*/\w*',
        specials = ',"\'{}()/:[\\]',
        everyThingElse = '[^\\s:,/][^' + specials + ']*[^\\s' + specials + ']',
        oneNotSpace = '[^\\s]',
        bindingToken = RegExp(stringDouble + '|' + stringSingle + '|' + stringRegexp + '|' + everyThingElse + '|' + oneNotSpace, 'g'),
        divisionLookBehind = /[\])"'A-Za-z0-9_$]+$/,
        keywordRegexLookBehind = {'in':1,'return':1,'typeof':1};

    // derived from knockout.js binding/expressionRewriting.js
    function parseObjectLiteral (objectLiteralString) {
        // Trim leading and trailing spaces from the string
        var str = smile.util.stringTrim(objectLiteralString);

        // Trim braces '{' surrounding the whole object literal
        if (str.charCodeAt(0) === 123) str = str.slice(1, -1);

        // Split into tokens
        var result = [], toks = str.match(bindingToken), key, values, depth = 0;

        if (toks) {
            // Append a comma so that we don't need a separate code block to deal with the last item
            toks.push(',');

            for (var i = 0, tok; tok = toks[i]; ++i) {
                var c = tok.charCodeAt(0);
                // A comma signals the end of a key/value pair if depth is zero
                if (c === 44) { // ","
                    if (depth <= 0) {
                        if (key)
                            result.push(values ? {key: key, value: values.join('')} : {'unknown': key});
                        key = values = depth = 0;
                        continue;
                    }
                // Simply skip the colon that separates the name and value
                } else if (c === 58) { // ":"
                    if (!values)
                        continue;
                // A set of slashes is initially matched as a regular expression, but could be division
                } else if (c === 47 && i && tok.length > 1) {  // "/"
                    // Look at the end of the previous token to determine if the slash is actually division
                    var match = toks[i-1].match(divisionLookBehind);
                    if (match && !keywordRegexLookBehind[match[0]]) {
                        // The slash is actually a division punctuator; re-parse the remainder of the string (not including the slash)
                        str = str.substr(str.indexOf(tok) + 1);
                        toks = str.match(bindingToken);
                        toks.push(',');
                        i = -1;
                        // Continue with just the slash
                        tok = '/';
                    }
                // Increment depth for parentheses, braces, and brackets so that interior commas are ignored
                } else if (c === 40 || c === 123 || c === 91) { // '(', '{', '['
                    ++depth;
                } else if (c === 41 || c === 125 || c === 93) { // ')', '}', ']'
                    --depth;
                // The key must be a single token; if it's a string, trim the quotes
                } else if (!key && !values) {
                    key = (c === 34 || c === 39) /* '"', "'" */ ? tok.slice(1, -1) : tok;
                    continue;
                }
                if (values)
                    values.push(tok);
                else
                    values = [tok];
            }
        }
        return result;
    }

    smile.util = {
        // derived from knockout.js utils.js
        stringTrim: function (string) {
            return string === null || string === undefined ? '' :
                string.trim ?
                    string.trim() :
                    string.toString().replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
        },

        parseObjectLiteral: function (str) {
            var obj = {};
            $.each(parseObjectLiteral(str), function (i, item) {
                if (item.unknown) obj[item.unknown] = true;
                else if ((item.value||'').substr(0,1) == '{') obj[item.key] = smile.util.parseObjectLiteral(item.value);
                else obj[item.key] = item.value;
            });
            return obj;
        },

        capitalize: function (str) {
            return str.substr(0,1).toUpperCase() + str.substr(1);
        },

        /**
            underscore-ish bindAll
            this helper saves livers!
        */
        bindAll: function (obj, methodList) {
            for (var i = 0; i < methodList.length; i += 1) {
                obj[methodList[i]] = $.proxy(obj[methodList[i]], obj);
            }
            return obj;
        },

        horizontalAreas: function (area1, area2) {
            area1.ratio = area1.width/area1.height;
            area2.ratio = area2.width/area2.height;
            var data = {
                ratio: area1.ratio+area2.ratio,
                area1: area1,
                area2: area2
            };
            area1.widthPercentage = area1.ratio/data.ratio;
            area2.widthPercentage = area2.ratio/data.ratio;
            return data;
        },

        /**
            Format integer time_ms to a nice string "HH:MM:SS"

            @param  {Integer}   time_ms     time in miliseconds
            @param  {Boolean}   decimal     display decimal time
            @param  {Boolean}   force_hours force hours, even if 00
        */
        formatTime: function (time_ms, decimal, force_hours) {
            var res = "",
                tim = decimal ? Math.floor(time_ms/1000) : Math.round(time_ms/1000);
            for(var i = 0; i < 2; i += 1) {
                if (res.length > 0) { res = ":" + res; }
                res = smile.util.pad(tim%60, 2) + res;
                tim = Math.floor(tim/60);
            }
            if (tim > 0 || force_hours) {
                res = smile.util.pad(tim, 2) + ":" + res;
            }
            if (decimal) {
                var st = '' + time_ms;
                res = res + '.' + (st).substr(st.length-3);
            }
            return res;
        },

        /**
            Parse integer time_ms from string

            Expected format: [[HH":"]MM":"]SS["."000]
            If non string is passed, it is returned as integer/float

            @param  {String}    str
            @type   Integer
        */
        parseTime: function (str) {
            var spl = str.split(':'),
                secs = 0.0;
            for(var i = spl.length - 1; i >= 0; i -= 1) {
                if (i === spl.length - 1) {
                    secs += parseFloat(spl[i], 10);
                } else {
                    secs += Math.pow(60, spl.length - 1 - i)*parseInt(spl[i], 10);
                }
            }
            if (secs !== secs) return 0;
            return ~~(secs * 1000);
        },

        /**
            Pad string
            <p>
            e.g. pad(1, 2) -> "01"
            <p>
            pad(2,3,1) -> "112"
            <p>
            pad("lala", 6, " ", true) -> "lala  "

            @param  {String}    str         string to be padded
            @param  {Integer}   len         length to be reached
            @param  {String}    [chr]       character for filling empty spaces
            @param  {Boolean}   [append]    append instead of prepend characters
            @type   String
        */
        pad: function (str, len, chr, append) {
            if (chr === undefined) { chr = '0'; }
            var res = "" + str;
            for (var i = (""+str).length; i < len; i += 1) {
                if (append) {
                    res += chr;
                } else {
                    res = chr + res;
                }
            }
            return res;
        },

        parseRatio: function (str) {
            var ratio = null;
            str || (str = '');
            if (str.search('/') > -1) {
                str = str.split('/');
                ratio = parseFloat(str[0])/parseFloat(str[1]);
            } else if (str.search('%') > -1) {
                ratio = parseFloat(str)/100;
            } else if (str) {
                ratio = parseFloat(str);
            }
            return ratio;
        },

        addCssRule: function (selector, css) {
            if (document.styleSheets[0].addRule) document.styleSheets[0].addRule(selector, css);
            else if (document.styleSheets[0].insertRule) {
                // firefox same origin bullshit
                var style = document.createElement('style');
                style.innerHTML = selector+'{'+css+'}';
                document.getElementsByTagName('head')[0].appendChild(style);
                //document.styleSheets[0].insertRule(selector+'{'+css+'}', 0);
            }
        },

        /**
            Convert string to XML Document
            @param  {String}    str
            @type   XMLDocument
        */
        stringToDoc: function (str) {
            var doc, parser;
            if (window.ActiveXObject){
                doc = new ActiveXObject('Microsoft.XMLDOM');
                doc.async='false';
                doc.loadXML(str);
            } else {
                parser = new DOMParser();
                doc = parser.parseFromString(str, 'text/xml');
            }
            return doc;
        },

        cleanUrl: function (url, noproto) {
            var proto = '';
            if (url.slice(0,7) == 'http://') {
                if (noproto === true) proto = 'http://';
                url = url.slice(7);
            }
            if (url.slice(0,8) == 'https://') {
                if (noproto === true) proto = 'https://';
                url = url.slice(8);
            }
            $.each(['#', '?', '/'], function (i, c) { if(url.indexOf(c) > -1) { url = url.split(c)[0]; } });
            if (noproto !== true && url.slice(0,4) == 'www.') url = url.slice(4);
            return proto+url;
        },

        isFirefox: function (version) {
            return (new RegExp('Firefox/'+(version||'')).test(navigator.userAgent));
        }

    };

    $.fn.dataObject = function (attrName) {
        return smile.util.parseObjectLiteral($(this).data(attrName));
    };


    $.throttle = jq_throttle = function( delay, no_trailing, callback, debounce_mode ) {
        var timeout_id,
            last_exec = 0;

        // `no_trailing` defaults to falsy.
        if ( typeof no_trailing !== 'boolean' ) {
            debounce_mode = callback;
            callback = no_trailing;
            no_trailing = undefined;
        }

        function wrapper() {
            var that = this,
                elapsed = +new Date() - last_exec,
                args = arguments;

            // Execute `callback` and update the `last_exec` timestamp.
            function exec() {
                last_exec = +new Date();
                callback.apply( that, args );
            };

            // If `debounce_mode` is true (at_begin) this is used to clear the flag
            // to allow future `callback` executions.
            function clear() {
                timeout_id = undefined;
            };

            if ( debounce_mode && !timeout_id ) {
                // Since `wrapper` is being called for the first time and
                // `debounce_mode` is true (at_begin), execute `callback`.
                exec();
            }

            // Clear any existing timeout.
            timeout_id && clearTimeout( timeout_id );

            if ( debounce_mode === undefined && elapsed > delay ) {
                // In throttle mode, if `delay` time has been exceeded, execute
                // `callback`.
                exec();
            } else if ( no_trailing !== true ) {
                timeout_id = setTimeout( debounce_mode ? clear : exec, debounce_mode === undefined ? delay - elapsed : delay );
            }
        };

        if ( $.guid ) {
            wrapper.guid = callback.guid = callback.guid || $.guid++;
        }

        return wrapper;
    };


    $.debounce = function( delay, at_begin, callback ) {
        return callback === undefined
            ? jq_throttle( delay, at_begin, false )
            : jq_throttle( delay, callback, at_begin !== false );
    };

    $.delay = function ( delay, callback ) {
        return function () {
            setTimeout(callback, delay);
        };
    };


}(jQuery, smile));

(function ($, smile) {

    smile.PostmessagePlayer = function (node, options) {
        node = $(node)[0];
        var tagName = node.tagName.toLowerCase();
        if (tagName == 'iframe') {
            this.node = node;

        // node is parent of iframe element
        } else {
            node = $($(node).find('iframe')[0])[0];
            if (node) {
                this.node = node;
            }
        }

        if (!this.node) throw new Error("Needs <iframe> or an element containing one");
        this.$node = $(this.node);
        this.$node.attr({mozallowfullscreen: 1, webkitallowfullscreen: 1, scrolling: 'no'});
        this.uuid = 0;
        this._promises = {};

        this.options = options;
        this.initialize();
    };

    $.extend(smile.PostmessagePlayer.prototype, EventDispatcher.prototype, {
        initialize: function () {
            smile.util.bindAll(this, ['onWindowMessage', 'onUpdateRatio', 'onResize']);

            this.targetOrigin = smile.util.cleanUrl(this.$node.attr('src'), true)||smile.util.cleanUrl(document.location.href, true);
            this.id = this.$node.attr('id')||('smileEmbed' + (''+Math.random()).slice(2,8));
            this.$container = this.$node.parent();
            if (!this.$container.hasClass('smile-embed')) {
                this.$container = $('<div>').addClass('smile-embed').append(this.$node).appendTo(this.$container);
            }
            this.$container.attr('id', this.id+'-container');
            $(window).on('message', this.onWindowMessage);
            this.addEventListener('updateratio', this.onUpdateRatio);

            var that = this;
            that._postMessage({method: 'registerParent'});
            this.$node.load(function() {
                that._postMessage({method: 'registerParent'});
            });

            $(window).resize($.debounce(250, this.onResize));
        },
        onWindowMessage: function (event) {
            var data, dispatch;
            try { data = JSON.parse(event.originalEvent.data); }
            catch (e) { return; }

            if (data.method == 'registerChild') {
                this.registerChild(data.args, event.originalEvent.source);
            } else if (data.method == 'event') {
                dispatch = this.dispatchEvent;
                data.args[0].target = this
                if (data.prefix) {
                    data.args[0].target = this[data.prefix];
                    dispatch = this[data.prefix].dispatchEvent;
                }
                dispatch.call(data.args[0].target, data.args[0]);
            } else if (data.method == 'callback') {
                if (this._promises[data.uuid]) {
                    this._promises[data.uuid].resolve.apply(this._promises[data.uuid], data.args);
                }
            }
        },
        onUpdateRatio: function (e) {
            // @TODO we get ratio of video only (controls aren't counted!)
            this._lastRatio = (e && e.ratio) || this._lastRatio;
            if (!this._lastRatio) return;
            var w = this.$node.width(),
                ratio = w/((w/this._lastRatio) + 40); /* controls height */
            smile.util.addCssRule('#'+this.$container.attr('id')+':after', 'padding-top: '+(100/ratio)+'%;');
        },
        onResize: function () {
            this.onUpdateRatio();
        },
        registerChild: function (args, source) {
            var smileReadyState = args[0],
                ratio = args[1];
                methods = args[2];

            this._setupMethods(this, methods);
            if (ratio) {
                this.onUpdateRatio({ratio: ratio});
            }
        },
        _setupMethods: function (obj, methods, prefix) {
            var that = this, pk;
            $.each(methods, function (k, v) {
                if (v === true) {
                    obj[k] = function () {
                        var getter = k.substr(0,3) === 'get' || k.substr(0,3) === 'can',
                            args = $.makeArray(arguments),
                            promise,
                            callback;
                        if (getter && args.length && $.isFunction(args[0])) {
                            callback = args[0];
                            args = args.slice(1);
                        }
                        promise = that._postMessage({method: (prefix||'')+k, args: args}, getter);
                        if (getter && promise && callback) promise.done(callback);
                        return promise;
                    }
                } else {
                    obj[k] = new EventDispatcher;
                    that._setupMethods(obj[k], v, k+'.');
                }
            });
        },

        _postMessage: function (data, callsBack) {
            // @TODO remember postmessage history while .postmessageSource is null
            var promise, that = this;
            if (callsBack) {
                this.uuid += 1
                data.uuid = this.uuid;
                promise = this._promises[data.uuid] = $.Deferred();
                promise.done(function () { delete that._promises[data.uuid]; })
            }
            this.node.contentWindow.postMessage(JSON.stringify(data), this.targetOrigin);
            return promise;
        }

    });

    $.fn.smileEmbed = function (options) {
        $(this).each(function () {
            $(this).data('smileEmbed') ||
                ($(this).data('smileEmbed', new smile.PostmessagePlayer($(this), options)));
        });
    };

    $(function () {
        $('.smile-embed').smileEmbed();
    });

}(jQuery, smile));
