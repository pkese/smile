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