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
/**
    This code is copied from mep-feature-track.js MIT
    bower mediaelement#2.14.2       cached git://github.com/johndyer/mediaelement.git#2.14.2
    used by trackshim.js
*/
(function ($, mejs) {
    /*
    Parses WebVVT format which should be formatted as
    ================================
    WEBVTT

    1
    00:00:01,1 --> 00:00:05,000
    A line of text

    2
    00:01:15,1 --> 00:02:05,000
    A second line of text

    ===============================

    Adapted from: http://www.delphiki.com/html5/playr
    */
    mejs.TrackFormatParser = {
        webvvt: {
            // match start "chapter-" (or anythingelse)
            pattern_identifier: /^([a-zA-Z]+)?[0-9]+$/,
            pattern_timecode: /^([0-9]{2}:[0-9]{2}:[0-9]{2}([,.][0-9]{1,3})?) --\> ([0-9]{2}:[0-9]{2}:[0-9]{2}([,.][0-9]{3})?)(.*)$/,

            parse: function(trackText) {
                var
                    i = 0,
                    lines = mejs.TrackFormatParser.split2(trackText, /\r?\n/),
                    entries = {text:[], times:[], ids:[]},
                    idcode,
                    timecode,
                    text;
                for(; i<lines.length; i++) {
                    // check for the line number
                    idcode = this.pattern_identifier.exec(lines[i]);
                    timecode = this.pattern_timecode.exec(lines[i]);
                    if (idcode || timecode){
                        // skip to the next line where the start --> end time code should be
                        if (idcode) {
                            i++;
                            timecode = this.pattern_timecode.exec(lines[i]);
                        }

                        if (timecode && i<lines.length){
                            i++;
                            // grab all the (possibly multi-line) text that follows
                            text = lines[i];
                            i++;
                            while(lines[i] !== '' && i<lines.length){
                                text = text + '\n' + lines[i];
                                i++;
                            }
                            text = $.trim(text);
                            // cheap trick - if not json, replace urls with link html
                            if (text.substr(0,1) != '{') text = text.replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href='$1' target='_blank'>$1</a>");
                            // Text is in a different array so I can use .join
                            entries.text.push(text);
                            entries.ids.push(idcode ? idcode[0] : '');
                            entries.times.push(
                            {
                                start: (mejs.Utility.convertSMPTEtoSeconds(timecode[1]) == 0) ? 0.200 : mejs.Utility.convertSMPTEtoSeconds(timecode[1]),
                                stop: mejs.Utility.convertSMPTEtoSeconds(timecode[3]),
                                settings: timecode[5]
                            });
                        }
                    }
                }
                return entries;
            }
        },
        // Thanks to Justin Capella: https://github.com/johndyer/mediaelement/pull/420
        dfxp: {
            parse: function(trackText) {
                trackText = $(trackText).filter("tt");
                var
                    i = 0,
                    container = trackText.children("div").eq(0),
                    lines = container.find("p"),
                    styleNode = trackText.find("#" + container.attr("style")),
                    styles,
                    begin,
                    end,
                    text,
                    entries = {text:[], times:[]};


                if (styleNode.length) {
                    var attributes = styleNode.removeAttr("id").get(0).attributes;
                    if (attributes.length) {
                        styles = {};
                        for (i = 0; i < attributes.length; i++) {
                            styles[attributes[i].name.split(":")[1]] = attributes[i].value;
                        }
                    }
                }

                for(i = 0; i<lines.length; i++) {
                    var style;
                    var _temp_times = {
                        start: null,
                        stop: null,
                        style: null
                    };
                    if (lines.eq(i).attr("begin")) _temp_times.start = mejs.Utility.convertSMPTEtoSeconds(lines.eq(i).attr("begin"));
                    if (!_temp_times.start && lines.eq(i-1).attr("end")) _temp_times.start = mejs.Utility.convertSMPTEtoSeconds(lines.eq(i-1).attr("end"));
                    if (lines.eq(i).attr("end")) _temp_times.stop = mejs.Utility.convertSMPTEtoSeconds(lines.eq(i).attr("end"));
                    if (!_temp_times.stop && lines.eq(i+1).attr("begin")) _temp_times.stop = mejs.Utility.convertSMPTEtoSeconds(lines.eq(i+1).attr("begin"));
                    if (styles) {
                        style = "";
                        for (var _style in styles) {
                            style += _style + ":" + styles[_style] + ";";
                        }
                    }
                    if (style) _temp_times.style = style;
                    if (_temp_times.start == 0) _temp_times.start = 0.200;
                    entries.times.push(_temp_times);
                    text = $.trim(lines.eq(i).html()).replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href='$1' target='_blank'>$1</a>");
                    entries.text.push(text);
                    if (entries.times.start == 0) entries.times.start = 2;
                }
                return entries;
            }
        },
        split2: function (text, regex) {
            // normal version for compliant browsers
            // see below for IE fix
            return text.split(regex);
        }
    };

    // test for browsers with bad String.split method.
    if ('x\n\ny'.split(/\n/gi).length != 3) {
        // add super slow IE8 and below version
        mejs.TrackFormatParser.split2 = function(text, regex) {
            var
                parts = [],
                chunk = '',
                i;

            for (i=0; i<text.length; i++) {
                chunk += text.substring(i,i+1);
                if (regex.test(chunk)) {
                    parts.push(chunk.replace(regex, ''));
                    chunk = '';
                }
            }
            parts.push(chunk);
            return parts;
        }
    }
}(jQuery, mejs));
(function ($, mejs) {

    /**
        Text track shim

        http://html5index.org/Media%20-%20Overview.html

        @TODO .on[eventtype] properties can be implemented fairly easily
            (add one listener for each event type that calls the property if exists)

        @TODO track add and remove events can be handled very nicely with MutationObserver (which can also be shimmed)

        @TODO Safari uses integers (0,1,2) instead of strings (disabled,showing,hidden) for track modes.
        @TODO IE Server MIME type for text/vtt must be set.
    */

    function isFirefox (version) {
        return (new RegExp('Firefox/'+(version||'')).test(navigator.userAgent));
    }

    function setTrackNode (track) {
        $('track').each(function () {
            if (this.track && !this.track.node && (!track || this.track === track)) {
                this.track.node = this;
                if (track) track.node = this;
            }
        });
    }

    // do asap on tracks
    $(function () {setTrackNode();});

    /**
        MediaElementTrackTrait

        This is a trait of methods meant to be injected into MediaElement shim
        (since mediaelement.js does not shim textTrack-related stuff)
    */
    mejs.MediaElementTracksTrait = {
        /**
            addTextTrack
            Default mode of such a track is hidden

            how is it different then HTML5 API
            - it takes options parameter (@see mejs.TextTrack for all the options)
                This is not a problem in native, options argument will simply be ignored
                (and native TextTrack constructor is forbidden anyways - at least chrome - @TODO)
        */
        addTextTrack: function (kind, label, language, options) {
            options || (options = {});
            options.kind = kind; options.label = label; options.language = language;
            var textTrack = new mejs.TextTrack(options);
            this.textTracks.push(textTrack);
            return textTrack;
        },


        /**
            _initTextTracks

            This must be called on mediaElement (plugin OR standard with no texttrack api OR standard with texttrack api only polyfilled)
            ASAP (when dom in mediaElement is ready) in order for shimmed tracks to work correctly

            It will
            1. initialize textTracks property
            2. hook addtrack event to hook modechange event to activate/deactivate listening to timeupdate events on mediaElement
            3. call _parseTextTracks to find all track subelements to given elem and load them to .textTracks
        */
        _initTextTracks: function (elem, parseTracks) {
            var that = this
                shimmed = this.pluginType != 'native' || window.TextTrack.shim
                    || isFirefox();
            if (!this.textTracks) {
                this.textTracks = new mejs.TextTrackList();
            }
            this.textTracks.addEventListener('addtrack', function (e) {
                if (!e.track.node) setTrackNode(e.track);
                // if text tracks are shimmed, set up _activate and _deactivate (which take care of _update calls)
                if (shimmed) {
                    e.track._initTextTrack();
                    if (e.track.mode != 'disabled') {
                        e.track._activate(that);
                    }
                    e.track.addEventListener('modechange', function (e) {
                        if (e.track.mode == 'disabled') e.track._deactivate(that);
                        else e.track._activate(that);
                    });
                } else {
                    e.track._initTextTrack();
                }
            });
            $.each(this.textTracks, function (i, t) { t._initTextTrack(); });

            if (parseTracks) {
                this._parseTextTracks(elem);
            }
        },


        /**
            _parseTextTracks

            @TODO MutationObserver to enable (better) addtrack event and removetrack event at all
        */
        _parseTextTracks: function (elem) {
            var that = this, textTrack;
            $(elem).find('track').each(function () {
                var el = $(this)[0];
                textTrack = that.addTextTrack($(el).attr('kind'), $(el).attr('label'), $(el).attr('srclang'),
                    {id: $(el).attr('id'), node: el, src: $(el).attr('src')});
            });
        }

    };

    /**
        TextTrackList shim

        use addTextTrack on mediaelement to add new tracks!

        @TODO
        does not have addtrack, removetrack and change events

        Events
        addtrack        fired when addTextTrack on mediaelement is called @TODO mutationObserver
        removetrack     @TODO achieve this with MutationObserver
        change          @TODO
    */
    mejs.TextTrackList = function () {};
    mejs.TextTrackList.prototype = new Array;
    $.extend(mejs.TextTrackList.prototype, EventDispatcher.prototype, {
        push: function (track) {
            console.warn('Use addTextTrack on player instead of using textTracks as array');
            Array.prototype.push.apply(this, $.makeArray(arguments));
            this.dispatchEvent(new mejs.TrackEvent('addtrack', {track: track}));
            if (track.node && $(track.node).attr('default')) track.setMode('showing');
        },
        getTrackById: function (id) {
            for (var i = 0; i < this.length; i += 1) {
                if (this[i].id == id) return this[i];
            }
        },
        item: function (i) {
            return this[i];
        }
    });

    /**
        TextTrack trait
    */
    mejs.TextTrackTrait = {
        _initTextTrack: function () {
            // fill missing cue ids
            var that = this,
                node = this.node;
            this.ready(function () {
                // since we are ready, request was successful
                if (that.mode == 'disabled') {
                    that.setMode('hidden');
                }
                var cue, id = 1;
                while(cue = that.cues.getCueById('')) {
                    while(that.cues.getCueById(id)) {
                        id += 1;
                    }
                    cue.id = id;
                }
            });

            // poll for readyState changes in FF 31/32
            if (isFirefox(31) || isFirefox(32)) {
                var interval = setInterval(function () {
                    var state = (that.node._readyState||that.node.readyState);
                    if (state > 1) {
                        if (state === 2) that.node.dispatchEvent(new mejs.TrackEvent('load', {track: that}));
                        clearInterval(interval);
                    }
                }, 1000);
            }

            this._bound_update = function (e) { that._update(e); };

            // metadata should be hidden by default (firefox is so smart that it will show "showing" metadata tracks as subtitles)
            if (this.kind == 'metadata' && this.getMode() == 'disabled') {
                this.setMode('hidden');
            }
        },
        setMode: function (mode) {
            if (this instanceof mejs.TextTrack && this.mode != mode) {
                this._mode = mode;
                this.dispatchEvent(new mejs.TrackEvent('modechange', {track: this}));
            } else if (!(this instanceof mejs.TextTrack) && this._mode != mode) {
                this.mode = mode;
                this.dispatchEvent(new mejs.TrackEvent('modechange', {track: this}));
            }
        },
        getMode: function () {
            if (this instanceof mejs.TextTrack) return this._mode;
            return this.mode;
        },
        ready: function (f) {
            var node = this.node || (this.id && $('#'+this.id)[0]);  // @TODO
            if (node) {
                if ((node._readyState||node.readyState) === 2 || (node._readyState||node.readyState) === 3) {
                    setTimeout(f, 0);
                } else {
                    var cb = function () {
                        if ((node._readyState||node.readyState) > 1) {
                            node.removeEventListener('load', cb);
                            node.removeEventListener('readystatechange', cb);
                            setTimeout(f, 0);
                        }
                    };
                    node.addEventListener('load', cb);
                    node.addEventListener('readystatechange', cb);
                }
            } else {
                console.warn('TextTrack id missing! .ready only works with native TextTrack support if <track> node has id attribute set!');
            }
            return this;
        },
        _activate: function (mediaElement) {
            mediaElement.addEventListener('timeupdate', this._bound_update);
        },
        _deactivate: function (mediaElement) {
            mediaElement.removeEventListener('timeupdate', this._bound_update);
        },
        _update: function (event) {
            // based on video.js
            // if target missing we take it from event.mediaElement (for test purposes?)
            var mediaElement = event.target || event.mediaElement,
                updateData = this._updateData || {},
                cues = this.cues,
                time = mediaElement.currentTime;
            if (this.cues.length) {

                if (updateData.prevChange === undefined
                    || time < updateData.prevChange
                    || updateData.nextChange <= time) {
                    var newNextChange = mediaElement.duration,
                        newPrevChange = 0,
                        newCues = new mejs.TextTrackCueList,
                        reverse = false,
                        entered = [],
                        exited = [],
                        firstActiveIndex,
                        lastActiveIndex,
                        cue, i;

                    // check if forward/rewinding
                    if (time >= updateData.nextChange || updateData.nextChange === undefined) {
                        i = (updateData.firstActiveIndex !== undefined) ? updateData.firstActiveIndex : 0;
                    } else {
                        reverse = true;
                        i = (updateData.lastActiveIndex !== undefined) ? updateData.lastActiveIndex : cues.length - 1;
                    }

                    while(true) {
                        cue = cues[i];

                        // cue ended
                        if (cue.endTime <= time) {
                            newPrevChange = max(newPrevChange, cue.endTime);

                            if (cue.active) {
                                cue.active = false;
                                exited.push(cue);
                            }

                        // cue hasnt started
                        } else if (time < cue.startTime) {
                            newNextChange = min(newNextChange, cue.startTime)

                            if (cue.active) {
                                cue.active = false;
                                exited.push(cue);
                            }

                            // No later cues should have an active start time.
                            if (!reverse) { break; }

                        // cue is current
                        } else {

                            if (reverse) {
                                // Add cue to front of array to keep in time order
                                newCues.splice(0,0,cue);
                                // @TODO call addCue on activeCues (which should take care of proper order?!)

                                // If in reverse, the first current cue is our lastActiveCue
                                if (lastActiveIndex === undefined) {
                                    lastActiveIndex = i;
                                }
                                firstActiveIndex = i;
                            } else {
                                // Add cue to end of array
                                newCues.push(cue);

                                // If forward, the first current cue is our firstActiveIndex
                                if (firstActiveIndex === undefined) { firstActiveIndex = i; }
                                lastActiveIndex = i;
                            }

                            newNextChange = min(newNextChange, cue.endTime);
                            newPrevChange = max(newPrevChange, cue.startTime);

                            cue.active = true;
                            entered.push(cue);
                        }

                        if (reverse) {
                            // Reverse down the array of cues, break if at first
                            if (i === 0) { break; } else { i--; }
                        } else {
                            // Walk up the array fo cues, break if at last
                            if (i === cues.length - 1) { break; } else { i++; }
                        }
                    }

                    this.activeCues = newCues;  // @TODO fill them (call addcue?)
                    updateData.nextChange = newNextChange;
                    updateData.prevChange = newPrevChange;
                    updateData.firstActiveIndex = firstActiveIndex;
                    updateData.lastActiveIndex = lastActiveIndex;
                    this._updateData = updateData;

                    // fire events
                    /*for(i = 0; i < entered.length; i+=1) {
                        entered[i].dispatchEvent(new mejs.TrackEvent('enter', {cue: entered[i]}));
                    }
                    for(i = 0; i < exited.length; i+=1) {
                        exited[i].dispatchEvent(new mejs.TrackEvent('exit', {cue: exited[i]}));
                    }*/
                    this.dispatchEvent(new mejs.TrackEvent('cuechange', {track: this}));
                }
            }
        }
    };

    mejs.TextTrackCueTrait = {
        isActive: function () {
            return Array.prototype.indexOf.apply(this.track.activeCues, [this]) > -1;
        }
    };

    // min and max that are undefined-safe (NaN-check)
    var min = function (a,b) { var m = Math.min(a,b); return (m != m) ? a||b : m;},
        max = function (a,b) { var m = Math.max(a,b); return (m != m) ? a||b : m;};

    /**
        TextTrack

        Should not be instantiated directly
        (e.g. Chrome throws 'Illegal constructor when doing this')
        Use addTextTrack on mediaelement

        How is it different than standard HTML5 API?
        - setting mode should be done through .setMode (instead of setting .mode property directly)
            (we define setter but in old browsers this will not work)
        - with native TextTrack support, constructing it will throw an error (these options below are arbitrary)

        @param      options         Object
        @param      options.kind
        @param      options.label
        @param      options.language
        @param      options.id
        @param      options.src
        @param      options.node
        @param      options.done    Function    done callback for loadCues ajax request
        @param      options.fail    Function    fail callback for loadCues ajax request

        Events:
        cuechange
        modechange  @NONSTANDARD when using setMode() this event will fire
        load        track loaded
    */
    mejs.TextTrack = function (options) {
        var that = this, promise;
        options || (options = {});
        this.kind = options.kind || 'subtitles';
        this.label = options.label||'';
        this.language = options.language||'';
        this.id = options.id;
        this.node = options.node;
        if (this.node) this.node.track = this;
        this.src = options.src;
        this.cues = new mejs.TextTrackCueList;
        this.activeCues = new mejs.TextTrackCueList;

        this._mode = options.mode || 'hidden';   // disabled, hidden, showing
        if (!this.node) console.warn('Use addTextTrack on player instead of instantiating TextTrack manually');

        // @TODO        if we have the node we can listen to it being removed and also remove track from the tracklist

        // we set up setters and getters here (also gets called when polyfilling texttracks)
        if (Object.defineProperty) Object.defineProperty(this, 'mode', {set: this.setMode, get: this.getMode});

        // load cues
        this._loadCues();
    };
    $.extend(mejs.TextTrack.prototype, EventDispatcher.prototype, mejs.TextTrackTrait, {
        addCue: function (cue) {
            // @TODO order
            //if (mejs.TextTrackCue.prototype.isPrototypeOf(cue)) {
                this.cues.push(cue);
            //}
        },
        removeCue: function (cue) {
            //if (mejs.TextTrackCue.prototype.isPrototypeOf(cue)) {
                var i = this.cues.indexOf(cue);
                if (i === -1) {
                    throw new Error("Failed to execute 'removeCue' on 'TextTrack': The specified cue is not listed in the TextTrack's list of cues.");
                }
                this.cues.splice(i, 1);
            //}
        },
        /**
            Load track src

            @type   jQuery.promise
        */
        _loadCues: function ()  {
            // only when shimmed, this.node will be present
            // TextTrack API specification does not have .node property
            if (this.node && !this.node._readyState) { // 0 - None, 1 - Loading, 2 - Loaded, 3 - Error
                var node = this.node,
                    track = this;
                node._readyState = 1;   // @TODO ready state change
                return $.ajax({
                    url: this.src,
                    dataType: 'text',
                    success: function (d) {
                        // parse the loaded file
                        var entries;
                        if (typeof d == "string" && (/<tt\s+xml/ig).exec(d)) {
                            // @TODO this is not tested
                            entries = mejs.TrackFormatParser.dfxp.parse(d);
                        } else {
                            entries = mejs.TrackFormatParser.webvvt.parse(d);
                        }
                        var cue;
                        for (var i = 0; i < entries.text.length; i += 1) {
                            // Chrome deprecated the TextTrackCue constructor
                            // @TODO this needs more testing
                            cue = new (window.VTTCue||window.TextTrackCue)(
                                entries.times[i].start,
                                entries.times[i].stop,
                                entries.text[i]
                            , {
                                track: track,
                                id: entries.ids[i]
                            });
                            track.addCue(cue);
                        }
                        node._readyState = 2;
                        track.node.dispatchEvent(new mejs.TrackEvent('load', {track: track}));
                    },
                    error: function () {
                        node._readyState = 3;
                        track.node.dispatchEvent(new mejs.TrackEvent('error', {track: track}));
                    }
                });
            }
        }
    });
    mejs.TextTrack.shim = true;


    /**
        Text track cue list

        This is really minimal, no events
    */
    mejs.TextTrackCueList = function () {

    };
    mejs.TextTrackCueList.prototype = new Array;
    $.extend(mejs.TextTrackCueList.prototype, EventDispatcher.prototype, {
        getCueById: function (id) {
            for (var i = 0; i < this.length; i += 1) {
                if (this[i].id == id) return this[i];
            }
        }
    });


    /**
        TextTrackCue

        Can be instantiated directly (existing HTML5 implementation support this)

        @param  startTime           Float           start time in seconds
        @param  endTime             Float           end time in seconds
        @param  text                String          text
        @param  options             Object          options
        @param  options.id          String          string id (line above the time in .vtt format)
        @param  options.pauseOnExit Boolean         whether to pause the video when this cue is ended
        @param  options.track       mejs.TextTrack  parent TextTrack

        Events:
        enter
        exit
    */
    mejs.TextTrackCue = function (startTime, endTime, text, options) {
        if (typeof startTime == 'undefined' || typeof endTime == 'undefined' || typeof text == 'undefined') {
            throw new Error("Failed to construct 'TextTrackCue': 3 arguments required.")
        }
        options || (options = {});
        this.startTime = parseFloat(startTime);
        this.endTime = parseFloat(endTime);
        this.text = ''+text;
        this.id = options.id;
        this.track = options.track;
    }
    $.extend(mejs.TextTrackCue.prototype, mejs.TextTrackCueTrait, EventDispatcher.prototype, {
    });


    /**
        TrackEvent
        In addition to standard window.Event, it has a track (and cue) parameters

        @param      Object          params
        @param      Boolean         params.bubbles
        @param      Boolean         params.cancelable
        @param      mejs.TextTrack  params.track
    */
    mejs.TrackEvent = function (type, params) {
        params = params || { bubbles: false, cancelable: false, track: undefined };
        var evt = document.createEvent('CustomEvent');
        evt.initEvent(type, params.bubbles, params.cancelable);
        if (params.track && !(mejs.TextTrack.prototype.isPrototypeOf(params.track) || window.TextTrack.prototype.isPrototypeOf(params.track))) {
            throw new Error("Failed to construct 'TrackEvent': 'track' property does not look like a TextTrack");
        }
        evt.track = params.track;
        evt.cue = params.cue;
        evt.target = evt.cue || evt.track;
        evt.currentTarget = evt.target; evt.srcElement = evt.target;
        return evt;
    }
    mejs.TrackEvent.prototype = window.Event;




    // ========================================================================
    // May the polyfill begin!
    // Unicorns breed here NSFW
    // @TODO needs testing in old browsers (and Firefox lolkillmenao)
    // ========================================================================

    // ====== MediaElement shims

    // extend mediaelement.js plugin prototype
    $.extend(mejs.PluginMediaElement.prototype, mejs.MediaElementTracksTrait);

    // make sure when plugin is initialized, _initTextTracks is called
    var oldCreate = mejs.HtmlMediaElementShim.create,
        oldCreatePlugin = mejs.HtmlMediaElementShim.createPlugin;
    mejs.HtmlMediaElementShim.createPlugin = function (playback, options, poster, autoplay, preload, controls) {
        var plugin = oldCreatePlugin.call(this, playback, options, poster, autoplay, preload, controls);
        plugin._initTextTracks(playback.htmlMediaElement, true);  // actual video element, not object/embed if plugin..
        console.info("Initializing mediaelement shim");
        return plugin;
    };
    mejs.HtmlMediaElementShim.create = function (el, o) {
        var api = oldCreate.call(this, el, o);
        // flash/silverlight
        if (api.pluginType != 'native') {
            // already inited text tracks at .createPlugin (see above)

        // html5 but shimmed track api
        } else if (window.TextTrack && window.TextTrack.shim) {
            console.info("Initializing textrack shim");
            $.extend(api, mejs.MediaElementTracksTrait);
            api._initTextTracks(api, true);

        } else {
            api._initTextTracks = mejs.MediaElementTracksTrait._initTextTracks;
            api._initTextTracks(api);
        }
        return api;
    }


    // shim HTMLVideoElement if no support for textTrack (@TODO test on old firefoxes - or current? :D)
    if (window.HTMLVideoElement && !window.HTMLVideoElement.prototype.addTextTrack) {
        // @TODO call _initTextTracks on initialize (just like with PluginMediaElement)
        $.extend(window.HTMLVideoElement.prototype, mejs.MediaElementTracksTrait);
    }

    // ====== TextTrack shims
    if (!window.TextTrack) {
        window.TextTrack = mejs.TextTrack;
        //window.TextTrack.shim = true;
    } else {
        // this will add .setMode(), .getMode() and .ready() to TextTrack
        console.info("Polyfilling TextTrack.setMode, .getMode and .ready");
        $.extend(window.TextTrack.prototype, mejs.TextTrackTrait);
    }

    // ====== TextTrackList shims
    if (!window.TextTrackList) {
        window.TextTrackList = mejs.TextTrackList;
        window.TextTrackList.shim = true;
    }

    // ====== TextTrackCueList shims
    if (!window.TextTrackCueList) {
        window.TextTrackCueList = mejs.TextTrackCueList;
        window.TextTrackCueList.shim = true;
    }

    // ====== TextTrackCue shims
    if (!window.TextTrackCue) {
        window.TextTrackCue = mejs.TextTrackCue;
        window.TextTrackCue.shim = true;
    } else {
        console.info("Polyfilling TextTrackCue.isActive");
        $.extend(window.TextTrackCue.prototype, mejs.TextTrackCueTrait);
    }

    // ====== TrackEvent shims
    if (!window.TrackEvent) {
        window.TrackEvent = mejs.TrackEvent;
        window.TrackEvent.shim = true;
    }

}(jQuery, mejs));

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
            if (document.styleSheets && document.styleSheets[0] && document.styleSheets[0].addRule) {
                document.styleSheets[0].addRule(selector, css);
            // } else if (document.styleSheets[0].insertRule) { // firefox has insertRule but complicates with same origins
            } else {
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

(function ($, mejs, smile) {

    /**
        Base Player (wraps mediaelement)

        Usage:

        Sources:
        extension   mimetype                source
        mp4         video/mp4               http://
        webm        video/webm              http://
        m3u8        application/x-mpegURL   http://
        flv         video/x-flv             http://
        wmv         video/x-ms-wmv          http://
        rtmp        video/rtmp              rtmp://

        Guidelines
        1. give video a unique id (and use it's prefix for track ids)
            tracks must have ids!
        2. first list rtmp sources, <video> will ignore them but flash will use them instead of http (IF AND ONLY IF it does not understand the type="" mimetype)
            if you plan to use rtmp sources with actual mimetype as type attribute (usually video/mp4),
            html5 engines will try to load the rtmp source (since they know the mimetype), but fail with unknown url scheme error!!!
            (so either use custom mimetype (video/rtmp) or put rtmp sources behind other types of sources)
        3. use .smile-player hideNativeTracks to hide native caption/subtitles rendering
            or use .smile-display hideIfNative to only show display when native caption/subtitles aren't rendering

        @TODO firefox 31 THERE IS NO "load" EVENT ON <track> @FML

        Attributes:

        video
            poster              poster image
            controls            show controls ?
            preload             none|metadata|auto
            data-smile
                thumbnail       video thumbnail (as alternative to poster="" attribute) ?

        source
            type                source mimetype (see above)
            src                 source uri
            data-smile
                width
                height
                bitrate
                size

        track
            kind                subtitles|captions|chapters|metadata
            srclang             language
            src                 source uri (IE needs proper mimetype for this to work)
            id                  NEEDED for proper track functioning
            default             whether this is the default track (there can be only one per kind)

        .smile-display element inside .smile-player container
            data-smile
                display         type of display
                track           track id (can be without "-lang")
                autoLanguage    (default: true) will try to find trackId by appending '-lang' to id (useful for language changes in between playback)
                onlyShim        (default: false) will only show display if player is shimmed (not native) or texttracks are shimmed with native player
                                (useful for showing subtitles and/or captions only in setups where they aren't displayed natively)

        Example:
        <div class="smile-player" data-smile="">
            <video id="video1" width="480" height="360" poster="https://media.viidea.com/v003/f9/7fyy6jgpnjetxl2ysumv7tiicamiq3xs.jpg" controls="controls" preload="none" data-smile="thumbnail: 'https://media.viidea.com/v003/96/s3swkcyvy74yk4ldosjlm6oqqjtfu4xw.jpg'">
                <source data-smile="width: 640, height: 480, bitrate: 566891, size: 144526110" type="video/rtmp" src="rtmp://maat2.viidea.com/vod/mp4:v003/6a/nkluipq7fxvi73nb5abkuclty36byp7g.mp4" />
                <source data-smile="width: 480, height: 360, bitrate: 417220, size: 106368396" type="video/rtmp" src="rtmp://maat2.viidea.com/vod/mp4/v003/76/ozanhot62etoaaophm2ttkqagt3dviys.mp4" />
                <source data-smile="width: 768, height: 576, bitrate: 947107, size: 241460369" type="video/rtmp" src="rtmp://maat2.viidea.com/vod/mp4:v003/49/jgm7sefrygoocade4vixah2buaszagkc.mp4" />
                <source data-smile="width: 640, height: 480, bitrate: 566891, size: 144526110" type="video/mp4" src="https://media.viidea.com/v003/6a/nkluipq7fxvi73nb5abkuclty36byp7g.mp4" />
                <source data-smile="width: 640, height: 480, bitrate: 566891, size: 144526110" type="application/x-mpegURL" src="http://maat2.viidea.com/vod/_definst_/mp4:v003/6a/nkluipq7fxvi73nb5abkuclty36byp7g.mp4/playlist.m3u8" />
                <source data-smile="width: 480, height: 360, bitrate: 417220, size: 106368396" type="video/mp4" src="https://media.viidea.com/v003/76/ozanhot62etoaaophm2ttkqagt3dviys.mp4" />
                <source data-smile="width: 480, height: 360, bitrate: 417220, size: 106368396" type="application/x-mpegURL" src="http://maat2.viidea.com/vod/_definst_/mp4:v003/76/ozanhot62etoaaophm2ttkqagt3dviys.mp4/playlist.m3u8" />
                <track kind="subtitles" src="subtitles.vtt" srclang="en" id="video1-track-subtitles-en" default="default" />
                <track kind="metadata" src="metadata.vtt" srclang="en" id="video1-track-slides-en" default="default" />
            </video>
            <div id="video1-slides" class="smile-display" data-smile="track: video1-track-slides, display: slides"></div>
            <div id="video1-subtitles" class="smile-display" data-smile="track: video1-track-subtitles, onlyShim"><div>
        </div>

        Source selection / bitrate switching:

        Current behaviour:
        if only rtmp:// is present, <video> will try to play it
            - ideally, flash player should be loaded
        if http:// sources are before rtmp, flash will load http://
            - ideally, rtmp sources should be played by default
            - ideally, rtmp bitrate swithing would happen inside flash engine?

        @param  node                        HTMLElement     media (video) HTML element
        @param  options                     Object
        @param  [options.regions]           Object          region id -> region class mapping

        Extensions:
        @param  [options.display]           Boolean         auto set up displays (default: true)
        @param  [options.hideNativeTracks]  Boolean         hide native tracks (subtitles and captions)

        Events
        @event  load            mediaelement successfully loaded
        @event  error           mediaelement error when loading
        @event  loadtracks      tracks are loaded (either with error or not)
        @event  resize          player (window) resized
        @event  statechange     state changed (see state property)
        @event  updateratio     ratio was updated

        @property   media       mediaelement API
        @property   $media      jquery wrapped video node
        @property   container   container node
        @property   $container  jquery wrapped container node
        @property   state       video state     'initializing'|'ready'|'playing'|'waiting'|'pause'|'ended'
    */
    smile.Player = function (node, options) {
        if (! (this instanceof smile.Player)) return new smile.Player(node, options);
        smile.util.bindAll(this, ['initializeDisplays', 'onMediaReady', 'onHandleError', 'resize']);
        options || (options = {});
        this.smileReadyState = 1;
        this.state = 'initializing';

        // node is media element
        var $media = $(node),
            tagName = $media[0].tagName.toLowerCase(),
            that = this;
        if (tagName == 'video' || tagName == 'audio') {
            this.$media = $media;

        // node is parent of media element
        } else {
            $media = $($media.find('video,audio')[0]);
            if ($media.length && ['video', 'audio'].indexOf($media[0].tagName.toLowerCase()) > -1) {
                this.$media = $media;
                options.container = $(node);
            }
        }
        if (!this.$media) throw new Error("Needs <video> or <audio> or an element containing one of those");
        this.media = this.$media[0];

        // player instance found
        if (typeof this.media.smile != 'undefined') {
            return this.media.smile;
        }
        this.media.smile = this;

        // container
        this.initializeContainer(options.container);

        // options
        this.options = $.extend({},
            this.constructor.defaults,
            this.$media.dataObject('smile'),
            this.$container.dataObject('smile'),
            options);

        function setState (state) {
            return function () {
                that.state = state;
                that.dispatchEvent({type: 'statechange', state: state});
            };
        }

        // when ready
        this.ready(function () {
            setState('ready')();
            that.media.addEventListener('loadedmetadata', $.proxy(that.updateRatio, that));
            that.media.addEventListener('playing', setState('playing'));
            that.media.addEventListener('waiting', setState('waiting'));
            that.media.addEventListener('pause', setState('pause'));
            that.media.addEventListener('ended', setState('ended'));
            that.updateRatio();
        });

        // =======================
        // CONSTRUCT MEDIA ELEMENT

        mejs.MediaElement(this.$media[0], $.extend({}, this.options, {
            success: this.onMediaReady,
            error: this.onHandleError
        }));

        // extensions
        for (var option in this.options) {
            if (this.options.hasOwnProperty(option) && smile.Player.extensions[option]) {
                this.enableExtension(option);
            }
        }

        $(window).resize($.debounce(250, this.resize));
    };

    $.extend(smile.Player.prototype, EventDispatcher.prototype, {
        initializeContainer: function (container) {
            // container
            if (container) {
                this.$container = $(container);
            } else {
                this.$container = this.$media.closest('.smile-player');
                if (!this.$container.length) this.$container = this.$media;
            }
            this.container = this.$container[0];
            this.container.smile = this;
            this.$container.attr('id', (this.$media.attr('id')||'smile1')+'-container');
        },
        enableExtension: function (name) {
            var ext = smile.Player.extensions[name];
            $.extend(this, ext.methods);
            ext.initialize && ext.initialize.apply(this);
            ext.ready && this.ready($.proxy(ext.ready, this));
            ext.tracksReady && this.tracksReady($.proxy(ext.tracksReady, this));
        },
        onMediaReady: function (media, domNode) {
            var that = this;
            this.smileReadyState = 2;

            // set media
            this.media = media;
            this.media.smile = this;

            // dispatch load
            this.dispatchEvent({type: 'load', target: this});
            this._loadtracksFired = false;

            setTimeout(function () {
                // hook tracks
                for (var i = 0; i < that.media.textTracks.length; i += 1) {
                    that.media.textTracks[i].ready(function () {
                        if (!that._loadtracksFired && that.areTracksReady()) {
                            that._loadtracksFired = true;
                            that.dispatchEvent({type: 'loadtracks', target: that});
                        }
                    });
                }
            }, 0);
        },
        onHandleError: function (e) {
            this.smileReadyState = 3;
            this.dispatchEvent({type: 'error', error: e, target: this});
        },

        /**
            Call function when player is ready
        */
        ready: function (f) {
            // @TODO track ready?
            var that = this;
            if (this.smileReadyState === 2 || this.smileReadyState === 3) {
                setTimeout(f, 0);
            } else {
                var cb = function () {
                    that.removeEventListener('load', cb);
                    setTimeout(f, 0);
                }
                this.addEventListener('load', cb);
            }
            return this;
        },
        areTracksReady: function ()  {
            var tracks = this.$media.find('track');
            for (var i = 0; i < tracks.length; i += 1) {
                if (((tracks[i].readyState || tracks[i]._readyState)||0) < 2) return false;
            }
            return true;
        },

        resize: function () {
            this.updateSize();
            this.dispatchEvent({type: 'resize'});
            return this;
        },

        /**
            Call function when player and tracks are ready
        */
        tracksReady: function (f) {
            var that = this;
            if (this.areTracksReady()) {
                setTimeout(f, 0);
            } else {
                var cb = function () {
                    that.removeEventListener('loadtracks', cb);
                    setTimeout(f, 0);
                }
                this.addEventListener('loadtracks', cb);
            }
            return this;
        },

        getVideoRatio: function () {
            var attrWidth = this.$media.attr('width'),
                attrHeight = this.$media.attr('height'),
                data = $.extend({}, this.$media.dataObject('smile'), this.$container.dataObject('smile')),
                ratio;
            if (this.media.videoWidth) ratio = this.media.videoWidth/this.media.videoHeight;
            else if (this._attrRatio) ratio = this._attrRatio;
            else if (attrWidth && attrHeight) {
                ratio = this._attrRatio = attrWidth/attrHeight;
                this.$media.attr({width: '', height: ''});
            } else if (data.ratio) ratio = smile.util.parseRatio(data.ratio);
            else ratio = this.$media.width()/this.$media.height();
            if (Math.abs(ratio) === Infinity) ratio = 0;
            return ratio || (16/9);
        },

        updateRatio: function (ratio) {
            if (typeof ratio != 'number' || !ratio) ratio = this.getVideoRatio();
            smile.util.addCssRule('#'+this.$container.attr('id')+' .smile-media:after', 'padding-top: '+(100/ratio)+'%;');
            this.updateSize();
            this.dispatchEvent({type: 'updateratio', ratio: ratio});
        },

        updateSize: function () {
            var embed = this.$container.find('embed');
            if (embed.length) {
                var w = this.$container.width(),
                    h = w*(1/this.getVideoRatio());
                this.media.setVideoSize(w, h);
            }
        },

        /**
            Get tracks by id (without "-lang")

            @param  trackId     String      track id without -lang suffix
        */
        getTracksById: function (trackId) {
            var tracks = [],
                track;
            for (var i = 0; i < this.media.textTracks.length; i += 1) {
                track = this.media.textTracks[i];
                if (track.id == trackId + '-' + track.language) {
                    tracks.push(track);
                }
            }
            return tracks;
        },

        /**
            Get track by id

            @param  trackId     String      track id
            @param  autoLang    Boolean     if true will search for tracks without -lang suffix and will return the first with mode == 'showing'
        */
        getTrackById: function (trackId, autoLang) {
            var tracks = autoLang ? this.getTracksById(trackId) : this.media.textTracks,
                track,
                i;
            for (i = 0; i < tracks.length; i += 1) {
                track = tracks[i];
                if (autoLang && track.mode != 'disabled') return track;
                else if (!autoLang && track.id == trackId) return track;
            }
            if (autoLang && tracks.length) return tracks[0];
            return null;
        }
    });
    $.extend(smile.Player, {
        defaults: {
            // default options go here
        },
        extensions: {},
        registerExtension: function (name, obj) {
            this.extensions[name] = {
                initialize: obj.initialize,
                ready: obj.ready,
                tracksReady: obj.tracksReady,
                methods: obj
            };
            delete obj.initialize;
            delete obj.ready;
            delete obj.tracksReady;
        }
    });
    $.fn.smile = function (options) {
        // @TODO use .data() instead (/in addition to) of property on DOM
        $(this).each(function () {
            this.smile ||
                (this.smile = new smile.Player($(this), options));
        });
    };

    /**
        Determine which url to use
        @TODO put source selection logic here
        @TODO add support for returning list of url for bitrate switching (currently choosing just one)
        @TODO remember playback options somewhere on media for later usage (like media.pluginType which is already set)
    */
    var oldDeterminePlayback = mejs.HtmlMediaElementShim.determinePlayback;
    mejs.HtmlMediaElementShim.determinePlayback = function () {
        var data = oldDeterminePlayback.apply(this, arguments);
        return data;
    };

}(jQuery, mejs, smile));

(function ($, mejs, smile){
    smile.Player.registerExtension('hideNativeTracks', {
        ready: function () {
            this.hideNativeTracks();
        },
        hideNativeTracks: function () {
            var that = this;
            $.each(that.media.textTracks, function (i, track) {
                if (track.kind == 'subtitles' || track.kind == 'captions') {
                    track.setMode('hidden');
                }
            });
        }
    });

    smile.Player.registerExtension('css', {
        initialize: function () {
            // css stuff
            var features = mejs.MediaFeatures;
            this.$container.addClass(
                'smile-player smile-initial ' +
                (features.isAndroid ? 'smile-android ' : '') +
                (features.isiOS ? 'smile-ios ' : '') +
                (features.isiPad ? 'smile-ipad ' : '') +
                (features.isiPhone ? 'smile-iphone ' : '') +
                (window.TextTrack.shim ? 'smile-trackshim ' : '')
            );
        },
        ready: function () {
            var that = this,
                playbackStates = 'smile-playing smile-paused smile-waiting smile-ended smile-initial',
                toggleStateClass = function (state) {
                    return function () {
                        that.$container.removeClass(playbackStates).addClass(state);
                    }
                };

            function updateFullscreen() {
                setTimeout(function ()  {
                    var fs = document.fullScreen||document.mozFullScreen||document.webkitIsFullScreen;
                    that.$container.toggleClass('smile-fullscreen', fs);
                }, 100);
            }

            this.$container.addClass('smile-plugin-'+this.media.pluginType);
            this.media.addEventListener('playing', toggleStateClass('smile-playing'));
            this.media.addEventListener('pause', toggleStateClass('smile-paused'));
            this.media.addEventListener('ended', toggleStateClass('smile-ended'));
            this.media.addEventListener('waiting', toggleStateClass('smile-waiting'));
            document.addEventListener("fullscreenchange", updateFullscreen);
            document.addEventListener("webkitfullscreenchange", updateFullscreen);
            document.addEventListener("mozfullscreenchange", updateFullscreen);
        }
    });
}(jQuery, mejs, smile));

(function ($, mejs, smile) {
    smile.Player.registerExtension('controls', {
        initialize: function () {
            this._controls = { container: this.$container.find('.smile-controls') };
            this._controls.container[0].smile = this;
        },
        isFullscreen: function () {
            return document.fullScreen||document.mozFullScreen||document.webkitIsFullScreen||this.$container.hasClass('smile-fullscreen-fake');
        },
        enterFullscreen: function () {
            // @TODO test in all browsers, check prefixes
            if (this.container.webkitRequestFullScreen) this.container.webkitRequestFullScreen();
            else if (this.container.mozRequestFullScreen) this.container.mozRequestFullScreen();
            else if (this.container.msRequestFullscreen) this.container.msRequestFullscreen();
            else if (this.container.requestFullScreen) this.container.requestFullScreen();
            else {
                this.$container.addClass('smile-fullscreen-fake smile-fullscreen');
                this._controls.setFullscreenButton();
            }
            setTimeout(this.resize, 0);
        },
        exitFullscreen: function () {
            if (document.cancelFullScreen) document.cancelFullScreen();
            else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
            else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
            else if (document.exitFullscreen) document.exitFullscreen();
            else {
                this.$container.removeClass('smile-fullscreen-fake smile-fullscreen');
                this._controls.setFullscreenButton();
            }
            setTimeout(this.resize, 0);
        },
        ready: function () {
            var player = this,
                ctrl = this._controls,
                setPlayButton = function (state) {
                    ctrl.container.find('.smile-button-play')
                        .removeClass('play pause')
                        .addClass(state);
                    ctrl.container.find('.smile-button-play i')
                        .removeClass('fa-play fa-pause')
                        .addClass('fa-'+state);
                },
                setVolumeButton = function () {
                    var cls = 'vol3';
                    if (player.media.muted) cls = 'vol0';
                    else {
                        if (player.media.volume < 0.66) cls = 'vol2';
                        if (player.media.volume < 0.33) cls = 'vol1';
                        if (player.media.volume == 0) cls = 'vol0';
                    }

                    ctrl.container.find('.smile-button-volume')
                        .removeClass('vol0 vol1 vol2 vol3')
                        .addClass(cls);
                    ctrl.container.find('.smile-volume-progress-bar')
                        .css('width', (player.media.muted?0:(player.media.volume*100))+'%');
                    ctrl.container.find('.smile-button-volume i')
                        .removeClass('fa-volume-up fa-volume-down fa-volume-off')
                        .addClass(cls == 'vol0' ? 'fa-volume-off' : (cls == 'vol3' ? 'fa-volume-up' : 'fa-volume-down'));
                },
                setFullscreenButton = $.delay(100, function (event) {
                    var fs = player.isFullscreen();
                    ctrl.container.find('.smile-button-fullscreen')
                        .removeClass('open close')
                        .addClass(fs ? 'close' : 'open');
                    ctrl.container.find('.smile-button-fullscreen i')
                        .removeClass('fa-expand fa-compress')
                        .addClass(fs ? 'fa-compress' : 'fa-expand');
                }),
                getNearestBuffer = function () {
                    var i;
                    for (i = player.media.buffered.length-1; i >= 0; i -= 1) {
                        if (player.media.buffered.start(i) < player.media.currentTime) return i;
                    }
                    return 0;
                },
                setTimeProgress = function () {
                    if (!player.media.duration) return;
                    var bufferEnd = player.media.buffered.length &&
                            player.media.buffered.end(getNearestBuffer()),
                        currentTime = player.media.currentTime,
                        duration = player.media.duration;
                    ctrl.container.find('.smile-time-display')
                        .text(smile.util.formatTime(currentTime*1000));
                    ctrl.container.find('.smile-time-progress-bar')
                        .css('width', ((currentTime/duration)*100)+'%');
                    ctrl.container.find('.smile-time-progress-buffer')
                        .css('width', (bufferEnd && bufferEnd > currentTime ?
                            (bufferEnd-currentTime)/duration : 0)*100 + '%')
                },
                getProgressFromPosition = function (event, progress) {
                    var prog = (event.pageX-progress.offset().left)/progress.width();
                    if (prog < 0) prog = 0;
                    if (prog > 1) prog = 1;
                    return prog;
                },
                onKeydown = function (event) {
                    if (event.keyCode == 27 && player.isFullscreen()) player.exitFullscreen();
                    // @TODO space (un)pauses - but not if focused input element
                };
            this.media.addEventListener('timeupdate', function () {
                setTimeProgress();
            });
            this.media.addEventListener('playing', function () {
                setPlayButton('pause');
                setVolumeButton();
                setTimeProgress();
            });
            this.media.addEventListener('waiting', function () {
                setPlayButton('pause');
            });
            this.media.addEventListener('pause', function () {
                setPlayButton('play');
            });
            this.media.addEventListener('ended', function () {
                setPlayButton('play');
            });
            this.media.addEventListener('volumechange', function () {
                setVolumeButton();
            });
            this.media.addEventListener('progress', function () {
                setTimeProgress();
            });

            ctrl.container.on('click', '.smile-button-play.play', function (event) {
                player.media.play();
                event.preventDefault();
            });
            ctrl.container.on('click', '.smile-button-play.pause', function (event) {
                player.media.pause();
                event.preventDefault();
            });
            ctrl.container.on('click', '.smile-button-volume', function (event) {
                player.media.setMuted(!player.media.muted);
                event.preventDefault();
            });
            ctrl.container.on('click', '.smile-button-fullscreen,.smile-button-fullscreen.open', function (event) {
                event.preventDefault();
                player.enterFullscreen();
            });
            ctrl.container.on('click', '.smile-button-fullscreen.close', function (event) {
                event.preventDefault();
                player.exitFullscreen();
            });
            ctrl.container.on('mouseup', '.smile-time-progress', function (event) {
                if (!player.media.duration) return;
                var progress = getProgressFromPosition(event, ctrl.container.find('.smile-time-progress'));
                player.media.setCurrentTime(progress*player.media.duration);
            });
            ctrl.container.on('mouseup', '.smile-volume-progress', function (event) {
                if (player.media.muted) return;
                var progress = getProgressFromPosition(event, ctrl.container.find('.smile-volume-progress'));
                player.media.setVolume(progress);
            });

            document.addEventListener("fullscreenchange", setFullscreenButton);
            document.addEventListener("webkitfullscreenchange", setFullscreenButton);
            document.addEventListener("mozfullscreenchange", setFullscreenButton);
            document.addEventListener("keydown", onKeydown);

            setPlayButton('play');
            setFullscreenButton();

            ctrl.resize = function () {
                // max height (never higher than window)
                player.$container.find('.smile-media, .smile-area, video')
                    .css('max-height', ($(window).height()-40)+'px');

                // fullscreen vertical alignment (not automatic in firefox @TODO safari, IE)
                var fs = player.isFullscreen();
                if (fs && (smile.util.isFirefox()||player.$container.hasClass('smile-fullscreen-fake'))) {
                    var el = player.$container.find('.smile-media, .smile-area-wrapper'),
                        h = el.height() + (player.$container.find('.smile-controls').height()||0),
                        wh = $(window).height();
                    player.$container.css('padding-top', (wh-h)/2);
                } else {
                    player.$container.css('padding-top', 0);
                }
            };
            ctrl.resize();
            ctrl.setFullscreenButton = setFullscreenButton;
            this.addEventListener('resize', ctrl.resize);
        }
    });
}(jQuery, mejs, smile));
(function ($, smile) {

    smile.Player.registerExtension('displays', {
        initialize: function () {
            var that = this;
            this.addEventListener('resize', function (){
                $.each(that.displays||[], function (i, display) {
                    if (display.resize) display.resize();
                });
            });
        },
        ready: function () {
            var that = this;
            this.displays = [];
            this.$container.find('.smile-display').each(function () {
                var data = $(this).dataObject('smile'),
                    clsName = 'Display',
                    cls = smile.Display;
                if (data.track) {
                    if (data.display) {
                        clsName = 'Display' + smile.util.capitalize(data.display);
                    }
                    cls = smile[clsName];
                    if (!cls) {
                        console.warn('Smile display expects valid display type: smile.'+clsName+' not found');
                    } else {
                        data.track = that.getTrackById(data.track) || that.getTrackById(data.track, true);
                        data.container = $(this);
                        data.player = that;
                        // other options are also in data (e.g. onlyTrackshim and autoLanguage)
                        that.displays.push(new cls(data));
                    }
                } else {
                    console.warn('Smile display expects track parameter');
                }
            });
        }
    });

    smile.CueDisplay = function (options) {
        this.display = options.display;
        this.cue = options.cue;
        this.toggleDisplay = options.toggleDisplay || false;
        this._activated = false;
        this.render();
    };
    $.extend(smile.CueDisplay.prototype, {
        render: function () {
            this.el = $('<div>').addClass('smile-cue')
                .append(this.cue.text.replace('\n', '<br/>'))
                .attr('id', this.display.track.id+'-cue-'+this.cue.id)
                .appendTo(this.display.$container);
            if (!this._activated) this.el.hide();
        },
        activate: function () {
            this._activated = true;
            this.el.addClass('active');
            if (this.toggleDisplay) this.el.show();
        },
        deactivate: function () {
            this._activated = false;
            this.el.removeClass('active');
            if (this.toggleDisplay) this.el.hide();
        }
    });

    /**
        Display
        If you want to hide it, use track.setMode('disabled') - mode 'hidden' is used for hiding native renderers
            if you still need the track to fire, just hide container

        Redefine renderCue(VttCue) -> smile.CueDisplay

        Also, all <*> elements in display container with data-time="" value will seek video position on button click

        @param  options                     Object
        @param  options.container           HTMLElement|jQuery  container element
        @param  options.player              smile.Player        player instance
        @param  options.track               smile.Track         track instance
        @param  options.toggleDisplay       Boolean             whether to toggle display when cue is active/inactive (defaul: true; otherwise only active class gets toggled)
        @param  options.visibleOnCue        Boolean             whether to hide display when no cue is active
        @param  options.pauseOnExit         Boolean             pause when any cue exists (deactivates)
        @param  options.pauseOnEnter        Boolean             pause when any cue enters (activates)
        @param  options.hideIfNative        Boolean             only show display when shim is active (default: false)
                                                                (native means that both media element is native and track support is native)
        @param  options.autoLanguage        Boolean             automatically handle language change (default: true)
        @param  options.cueDisplay          smile.CueDisplay    cue display constructor (default: smile.CueDisplay)
    */
    smile.Display = function (options) {
        if (!options.container) throw new Error("Display needs container");
        this.$container = $(options.container);
        this.$container[0].smileDisplay = this;
        if (options.visibleOnCue) this.$container.hide();
        this.player = options.player;
        this.cues = {};

        options.toggleDisplay = typeof options.toggleDisplay == 'undefined' ? true : !!options.toggleDisplay;
        options.autoLanguage = typeof options.autoLanguage == 'undefined' ? true : !!options.autoLanguage;
        this.options = options;

        this.lastActiveIds = [];
        smile.util.bindAll(this, ['render', 'onModeChange', 'onCueChange']);
        if (options.track) this.setTrack(options.track);
    };
    $.extend(smile.Display.prototype, EventDispatcher.prototype, {
        setTrack: function (track) {
            var that = this,
                show = (!this.options.hideIfNative)
                    || (this.player.media.pluginType != 'native' || window.TextTrack.shim);
            if (this.track) this.unhookTrack();
            this.cues = {};
            this.track = track;
            if (show) {
                this.hookTrack();
                this.track.ready(function () {
                    that.render();
                    that.onCueChange();
                });
            }
        },
        hookTrack: function () {
            this.track.addEventListener('cuechange', this.onCueChange);
            this.track.addEventListener('modechange', this.onModeChange);
        },
        unhookTrack: function () {
            this.track.removeEventListener('cuechange', this.onCueChange);
            this.track.removeEventListener('modechange', this.onModeChange);
        },
        render: function (i,j) {
            var currentTime = this.player.media.currentTime,
                that = this,
                cue;
            if (this.track.mode == 'disabled') return;
            for (i = i || 0; i < (j || this.track.cues.length); i += 1) {
                cue = this.track.cues[i];
                if (!this.cues[cue.id]) {
                    this.cues[cue.id] = this.renderCue(cue);
                }
            }
            smile.Display.hookTimeLinkEvents(this.$container, this.player);
        },
        renderCue: function (cue) {
            return new (this.options.cueDisplay || smile.CueDisplay)({display: this, cue: cue, toggleDisplay: this.options.toggleDisplay});
        },
        onModeChange: function () {
            // if (this.track.mode == 'showing' || this.track.mode == 'hidden') {
            //     this.$container.show();
            // } else {
            //     this.$container.hide();
            // }
            if (this.autoLanguage && this.track.mode == 'disabled') {
                var that = this, spl = this.track.id.split('-'),
                    trackId = spl.slice(0, spl.length-1).join('-');
                // wait till modes on tracks are set (@TODO defer?)
                setTimeout(10, function () {
                    that.setTrack(that.player.getTrackById(trackId, true));
                });
            } else {
                this.render();
            }
        },
        onCueChange: function () {
            // @TODO this could be refactored to effectively shim chrome's (and others') broken onexit/enter on cues
            var cuePrefix = this.track.id+'-cue-',
                activeIds = $.map(this.track.activeCues||[], function (cue) { return cue.id; }),
                cueView, id, i;

            for (i = 0; i < activeIds.length; i += 1) {
                id = activeIds[i]; cueView = this.cues[id];
                if (cueView && !cueView._activated) {
                    cueView.activate();
                    if (this.options.pauseOnEnter) this.player.media.pause(); // @TODO what if seeked?
                }
            }
            for (i = 0; i < this.lastActiveIds.length; i += 1) {
                id = this.lastActiveIds[i]; cueView = this.cues[id];
                if (cueView && cueView._activated && activeIds.indexOf(id) === -1) {
                    cueView.deactivate();
                    if (this.options.pauseOnExit) this.player.media.pause();
                }
            }
            this.lastActiveIds = activeIds;
            if (this.options.visibleOnCue) this.$container[activeIds.length ? 'show' : 'hide']();
        },
        resize: function () {
        },
        getRatio: function () {
            return 4/3;
        }
    });

    smile.Display.hookTimeLinkEvents = function (container, player) {
        container.find('*[data-time]').each(function () {
            var $el = $(this), time = parseFloat($el.attr('data-time'))+0.1;
            $el.on('click', function (event) {
                event.preventDefault();
                player.media.setCurrentTime(time);
            });
        });
    };

    /**
        CueDisplaySlide
    */
    smile.CueDisplaySlide = function (options) {
        try {
            this.data = JSON.parse(options.cue.text);
        } catch (e) {
            this.data = {};
        }
        this.data.images || (this.data.images = []);
        this.data.images.sort(function (a,b) {
            if (a.width < b.width) return -1;
            else if (a.width > b.width) return 1;
            return 0;
        });
        this._width = options.width||0;
        smile.CueDisplay.call(this, options);
    };
    $.extend(smile.CueDisplaySlide.prototype, smile.CueDisplay.prototype, {
        setWidth: function (width) {
            if (width > this._width) {
                this._width = width;
                this.render();
            }
        },
        render: function () {
            if (!this.el) {
                smile.CueDisplay.prototype.render.call(this);
            }
            var image = this.getImage(this._width);
            if (image) {
                this.el.empty().append($('<img>').attr({src: image.src, title: this.data.title}));
            } else {
                this._width = 0;
            }
        },
        getImage: function (width) {
            var i;
            width || (width = 0);
            for (i = 0; i < this.data.images.length; i += 1) {
                if (this.data.images[i].width >= width) {
                    return this.data.images[i];
                }
            }
            return this.data.images[i];
        }
    });

    /**
        DisplaySlides

        expects cue format:
        {
            images: [{src: width: height: }]
            title:
            text:
        }

        @TODO dynamic render (only add certain amount of near images to DOM)
    */
    smile.DisplaySlides = function (options) {
        options.cueDisplay = smile.CueDisplaySlide;
        smile.Display.apply(this, [options]);
        this._ratio = 4/3;
        this._width = 0;
        this.resize();
    };
    $.extend(smile.DisplaySlides.prototype, smile.Display.prototype, {
        renderCue: function (cue) {
            return new (this.options.cueDisplay || smile.CueDisplay)({display: this, cue: cue, toggleDisplay: this.options.toggleDisplay, width: this._width});
        },
        render: function () {
            smile.Display.prototype.render.apply(this);
            var ratios = [],
                cueData;
            for (var i = 0; i < this.track.cues.length; i += 1) {
                cueData = JSON.parse(this.track.cues[i].text);
                if (cueData.images && cueData.images.length) {
                    if (cueData.images[0].width && cueData.images[0].height) {
                        ratios.push(cueData.images[0].width/cueData.images[0].height)
                    }
                }
            }

            if (ratios.length) {
                ratios.sort(function (a, b) { return a - b; });
                this._ratio = ratios[Math.floor(ratios.length/2)];
            }
        },
        getRatio: function () {
            return this._ratio;
        },
        resize: function () {
            var width = (this._areas&&this._areas.area2.width())||this.$container.width();
            if (width > this._width) {
                this._width = width;
                $.each(this.cues, function (i, cv) {
                    cv.setWidth(width);
                });
            }
        }
    });

}(jQuery, smile));
(function ($, smile) {


/*

    For player events (EventDispatcher prototype), we signal via postmessage
    with dispatchEvent overload. (For media we hook to all known events in _proxyMediaEvents)
    To make this more usable, certain events should be dispatched on player
    (e.g. fullscreenchange with custom prefixes)

*/

    var earlyOnWindowMessages = [],
        earlyOnWindowMessage = function (e) {
            earlyOnWindowMessages.push(e);
        };
    $(window).on('message', earlyOnWindowMessage);

    smile.Player.registerExtension('postMessage', {
        initialize: function () {
            var that = this;
            smile.util.bindAll(this, ['onWindowMessage', '_cleanObject']);

            this.postMessage = {
                readyState: 1,
                source: null,   // @TODO determining target origin can fail!!! - must show warning on console that postmessage API is down!
                targetOrigin: this._determineTargetOrigin(typeof this.options.postMessage === 'boolean' ? '*' : this.options.postMessage)
            };

            // no need to filter events, we assume only one video in the child (i.e. iframe content document has only one video in DOM)
            $(window).on('message', this.onWindowMessage);

            this._proxyMediaEvents();
            $.map(earlyOnWindowMessages, this.onWindowMessage);

            this.addEventListener('updateratio', function (e) {
                that._lastRatio = e.ratio;
            });
        },

        /**
            Event data is expected to be string of JSON:
            {   method: 'nameOfTheMethod',
                args: [ ... ],
                uuid: 'xyz' }   // if uuid present, callback can be provided
            {   method: 'event',
                args: [ event ] }
            {   method: 'callback',
                uuid: 'xyz',
                args: [ ... ] }
        */
        onWindowMessage: function (event) {
            var data;
            try { data = JSON.parse(event.originalEvent.data); }
            catch (e) { return; }

            if (data.method == 'registerParent') {
                this.registerParent(data.args, event.originalEvent.source);
                // ignore data.args with registerParent call (for now?)
            } else {
                var method = data.method.split('.'),
                    f = this,
                    name, that, result;
                // .media.someMethod will also work! :D
                while (method.length) { // @TODO errors
                    name = method.shift();
                    that = f;
                    f = f[name];
                }
                if ($.isFunction(f)) {
                    result = f.apply(that, data.args);
                } else {
                    if (typeof f != 'undefined') result = f;
                    else {
                        if (name.substr(0,3) == 'get') {
                            result = that[name.substr(3,1).toLowerCase()+name.substr(4)];
                        }
                    }
                }
                if (data.uuid) { // callback
                    this._postMessage({
                        method: 'callback',
                        uuid: data.uuid,
                        args: [typeof result == 'object' && result !== null ? this._cleanObject(result) : result]
                    });
                }
            }
        },

        registerParent: function (args, source) {
            // {a: true, b: {a: true}};
            var methods = this._scanMethods(this, ['media']);
            this.postMessage.source = source;

            this._postMessage({
                method: 'registerChild',
                args: [this.smileReadyState, this._lastRatio, methods]
            });
        },

        dispatchEvent: function () {
            var args = $.makeArray(arguments),
                result = smile.Player.prototype.dispatchEvent.apply(this, args);
            if (this.postMessage.source) {
                this._postMessage({
                    method: 'event',
                    prefix: '',
                    args: $.map(args, this._cleanObject)
                });
            }
            return result;
        },

        _proxyMediaEvents: function () {
            var events = ['waiting', 'volumechange', 'toggle', 'timeupdate', 'suspend', 'stalled', 'seeking', 'seeked',
                'ratechange', 'progress', 'playing', 'play', 'pause', 'loadstart', 'loadedmetadata', 'loadeddata', 'load',
                'ended', 'durationchange', 'cuechange', 'canplaythrough', 'canplay', 'webkitfullscreenerror', 'webkitfullscreenchange'],
                that = this;
            $.each(events, function (i, event) {
                that.media.addEventListener(event, function () {
                    that._postMessage({
                        method: 'event',
                        prefix: 'media',
                        args: $.map($.makeArray(arguments), that._cleanObject)
                    })
                });
            });
        },

        _scanMethods: function (obj, props) {
            var methods = {}, k, v, el = $('<div>')[0];
            props || (props = []);
            for (k in obj) {
                v = obj[k];
                if (k.substr(0,1) == '_' || k.substr(0,2) == 'on' || k.substr(0,6) == 'webkit' || k.substr(0,3) == 'moz' || k == 'registerParent' || k == 'apply'
                    || k == 'dispatchEvent' || k == 'addEventListener' || k == 'removeEventListener') {
                    // private or callback - starts with _ or 'on'
                } else if (v == HTMLElement.prototype[k] || v == Element.prototype[k] || v == Node.prototype[k]) {
                    // node method
                } else if (HTMLVideoElement[k] !== undefined || HTMLElement[k] !== undefined || Element[k] !== undefined || Node[k] !== undefined || el[k] !== undefined) {
                    // video node property
                } else if ($.isFunction(v)) {
                    methods[k] = true;
                } else if (['string', 'number', 'boolean'].indexOf(typeof v) > -1) {
                    methods['get'+k.substr(0,1).toUpperCase()+k.substr(1)] = true;
                } else if (v && props.indexOf(k) > -1) {
                    methods[k] = this._scanMethods(v, props);
                }
            }
            return methods;
        },

        _postMessage: function (data) {
            if (!this.postMessage.source) return;
            // @TODO remember postmessage history while .postmessageSource is null
            return this.postMessage.source.postMessage(JSON.stringify(data), this.postMessage.targetOrigin);
        },

        _determineTargetOrigin: function (origins) {
            origins = origins ? ($.isArray(origins) ? origins : [origins]) : [];
            var referrer = document.referrer || '',
                cleanReferrer = smile.util.cleanUrl(referrer),
                cleanOrigins = $.map(origins, smile.util.cleanUrl),
                targetOrigin;

            if (origins.indexOf('*') > -1 || $.map(cleanOrigins, function (orig) { return orig == cleanReferrer; }).indexOf(true) > -1) {
                targetOrigin = smile.util.cleanUrl(referrer, true);
            } else {
                return false;
            }
            return targetOrigin;
        },

        _cleanObject: function (obj) {
            var newObj = $.isArray(obj) ? [] : {},
                that = this;
            $.each(obj, function (k, v) {
                if (!obj.hasOwnProperty(k)) return;
                if (['boolean', 'number', 'string'].indexOf(typeof v) > -1) {
                    newObj[k] = v;
                } else if ($.isArray(obj) || $.isPlainObject(obj)) {
                    newObj[k] = that._cleanObject(v);
                }
            });
            return newObj;
        },

        ready: function () {

        }
    });


}(jQuery, smile));
