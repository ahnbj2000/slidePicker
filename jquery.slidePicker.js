// The MIT License (MIT)

// Copyright (c) 2015 Byeongjin Ahn

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.


(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        factory(require('jquery'));
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {
    'use strict';
    
    var defaults = {
    	'selector' : {
			'view': '',
			'rolling': '',
			'list': '',
            'confirm': '',
            'close': ''
		},
		'effect': {
			'easing': 'ease',
			'duration': 1,
			'delay': 0
		},
        'selectedClass': 'selected',
        'isDateTimePicker': false,
        'onRender': $.noop,
        'onShow': $.noop,
        'onHide': $.noop,
        'onAfterRender': $.noop,
        'onChange': $.noop,
        'onConfirm': $.noop,
        'onClose': $.noop
    };

    var effects = {
        'ease': 			'ease',
        'easeIn': 			'ease-in',
        'easeOut': 			'ease-out',
        'easeInOut': 		'ease-in-out',
        'easeInCubic': 		'cubic-bezier(.550,.055,.675,.190)',
        'easeOutCubic':   	'cubic-bezier(.215,.61,.355,1)',
        'easeInOutCubic': 	'cubic-bezier(.645,.045,.355,1)',
        'easeInCirc':     	'cubic-bezier(.6,.04,.98,.335)',
        'easeOutCirc':    	'cubic-bezier(.075,.82,.165,1)',
        'easeInOutCirc':  	'cubic-bezier(.785,.135,.15,.86)',
        'easeInExpo':     	'cubic-bezier(.95,.05,.795,.035)',
        'easeOutExpo':    	'cubic-bezier(.19,1,.22,1)',
        'easeInOutExpo':  	'cubic-bezier(1,0,0,1)',
        'easeInQuad':     	'cubic-bezier(.55,.085,.68,.53)',
        'easeOutQuad':    	'cubic-bezier(.25,.46,.45,.94)',
        'easeInOutQuad':  	'cubic-bezier(.455,.03,.515,.955)',
        'easeInQuart':    	'cubic-bezier(.895,.03,.685,.22)',
        'easeOutQuart':   	'cubic-bezier(.165,.84,.44,1)',
        'easeInOutQuart': 	'cubic-bezier(.77,0,.175,1)',
        'easeInQuint':    	'cubic-bezier(.755,.05,.855,.06)',
        'easeOutQuint':   	'cubic-bezier(.23,1,.32,1)',
        'easeInOutQuint': 	'cubic-bezier(.86,0,.07,1)',
        'easeInSine':     	'cubic-bezier(.47,0,.745,.715)',
        'easeOutSine':    	'cubic-bezier(.39,.575,.565,1)',
        'easeInOutSine':  	'cubic-bezier(.445,.05,.55,.95)',
        'easeInBack':     	'cubic-bezier(.6,-.28,.735,.045)',
        'easeOutBack':    	'cubic-bezier(.175, .885,.32,1.275)',
        'easeInOutBack':    'cubic-bezier(.68,-.55,.265,1.55)'
    };


    // The actual plugin constructor
    function SlidePicker(container, options) {
        this.container = $(container);
        // merge the default options with user-provided options

        this.options = $.extend(true, {}, defaults, options);

        if(this.isDateOrTimeType() && !moment) {
            throw new Error('moment is not defined.');
        } else {
            this.dateTime = new DateTime();
        }

        // 초기 마크업 구성을 위한 렌더링
        this.init();
    }

    SlidePicker.prototype.init = function () {
        var selector = this.options.selector;
        this._selectionArea = this.container.find(selector.view);
        this._confirm = this.container.find(selector.confirm);
        this._close = this.container.find(selector.close);
        this._selectedClass = this.options.selectedClass;
        var _this = this;

        this.options.onRender.apply(this, [ this.dateTime ]);

        this._selectionArea.each(function(index) {
            $(this).data('index', index);
            $(this).find(_this.options.selector.list).eq(1).addClass(_this._selectedClass);
            $(this).css('-webkit-tap-highlight-color', 'transparent');
        });

        this._listHeight = $(this.options.selector.list).eq(1).height();

        this.attachEvents();
        this._transform = getVendorPropertyName('transform');

        this.options.onAfterRender.apply(this, [ this.dateTime ]);
    };

    SlidePicker.prototype.attachEvents = function() {
        this._startDragHandler = $.proxy(onStartDrag, this);
        this._dragHandler = $.proxy(onDrag, this);
        this._wheelHandler = $.proxy(onWheel, this);
        this._endDragHandler = $.proxy(onEndDrag, this);
        this._transitionEndHandler = $.proxy(onTransitionEnd, this);
        this._clickHandler = $.proxy(onClick, this);
        this._confirmHandler = $.proxy(onConfirm, this);
        this._closeHandler = $.proxy(onClose, this);

        this._selectionArea.on('mousedown touchstart mouseenter.appoint', this._startDragHandler);
        this._selectionArea.on('mousemove touchmove.appoint', this._dragHandler);
        this._selectionArea.on('mouseup touchend.appoint', this._endDragHandler);
        this._selectionArea.on('transitionend webkitTransitionEnd.appoint ', this._transitionEndHandler);
        this._selectionArea.on('mousewheel wheel.appoint', this._wheelHandler);
        this._selectionArea.on('click.appoint', this._clickHandler);
        this._confirm.on('click.appoint', this._confirmHandler);
        this._close.on('click.appoint', this._closeHandler);
    };

    SlidePicker.prototype.pick = function(value) {
        if(typeof(value) === 'undefined') {
            return;
        }

        var _this = this;

        this._selectionArea.each(function(index, el) {
            var val = value[index];
            el = $(el);

            if(!val) {
                return false;
            }
            var pickedEl = el.find('[data-id=' + val + ']');
            var rollingArea = el.find(_this.options.selector.rolling);
            var listEls = el.find(_this.options.selector.list);
            var pickedIndex = listEls.index(pickedEl) - 1;

            listEls.removeClass(_this._selectedClass);
            pickedEl.addClass(_this._selectedClass);

            setTransition.apply(_this, [ _this.options.effect.easing, rollingArea ]);
            setTranslate.apply(_this, [ -(pickedIndex * _this._listHeight), rollingArea ]);
        });
    };

    SlidePicker.prototype.repaint = function(index) {
        var _this = this;

        function adjust(el) {
            el = $(el);
            var rollingEl = el.find(_this.options.selector.rolling);
            var listEls = el.find(_this.options.selector.list);
            var yAxis = getTranslate(rollingEl).y;
            var listHeight = (listEls.length - 1 - 2) * _this._listHeight;

            if(Math.abs(yAxis) > listHeight) {
                setTranslate.apply(_this, [ -listHeight, rollingEl ]);
            }
            listEls.eq(getIndex.call(_this, el)).addClass(_this._selectedClass);
        }
        if(typeof(index) === 'undefined') {
            this._selectionArea.each(function(index, el) {
                adjust(el);
            });
        } else {
            adjust(this._selectionArea.eq(index));
        }

    };

    SlidePicker.prototype.show = function(targetElement, value) {
        this._inputTargetEl = $(targetElement);

        this.options.onShow.apply(this, [ value ]);
        this.container.show();

        if(!(value instanceof Array)) {
            this.pick([value]);
        }
        this.pick(value);
        this.adjust();
    };

    SlidePicker.prototype.hide = function() {
        this.container.hide();
        $('.dimmed_layer').remove();
        $(document.body).off('.dimmedEvent');
        this.options.onHide.apply(this);
    };

    SlidePicker.prototype.adjust = function() {
        var _this = this;
        var dimmedLayer = $('<div class="dimmed_layer"></div>');
        dimmedLayer.css({
            'position': 'fixed',
            'zIndex': 10000,
            'top': 0,
            'left': 0,
            'right': 0,
            'bottom': 0,
            'width': '100%',
            'height': '100%',
            'backgroundColor': '#000000',
            'opacity': 0.6
        });
        dimmedLayer.appendTo(document.body);
        
        $(document.body).on('touchmove.dimmedEvent', function(event) {
            event.preventDefault();
        });
        
        dimmedLayer.off('.dimmedEvent').on('click.dimmedEvent', function(event) {
            _this.hide();
        });

        this.container.appendTo(document.body);
        this.container.css({
            'position': 'fixed',
            'zIndex': 10001,
            'top': (window.innerHeight / 2) - (this.container.outerHeight(true) / 2),
            'left': (window.innerWidth / 2) - (this.container.outerWidth(true) / 2)
        });
    };

    SlidePicker.prototype.destroy = function() {
        this._selectionArea.off('.appoint');
        this.dateTime = null;
        this.container.removeData('slide_picker_inst');
    };

    SlidePicker.prototype.isDateOrTimeType = function() {
        return this.options.isDateTimePicker;
    };

    SlidePicker.prototype.getContainer = function() {
        return this.container;
    };

    // date, time picker를 사용할 경우 생성되는 DateTime 객체
    // moment js를 필수로 포함시켜야 한다.
    // 모든 날짜 형식은 ISO-8601 표준을 따른다.
    function DateTime() {
        this.today = this.getToday();
    }

    DateTime.prototype.getToday = function() {

        return { 
            'year': moment().format('YY'), 
            'month': moment().format('MM'), 
            'day': moment().format('DD'),
            'dayOfWeek': moment().format('d'),
            'dateString': moment().format('YYYY-MM-DD')
        };
    };

    DateTime.prototype.getDaysInMonth = function(yearMonth) {
        var today = this.getToday();
        var date = yearMonth.split('-');
        var year = !!date ? date[0] : today.year;
        var month = !!date ? date[1] : today.month;

        return moment([year, '-', month].join(''), 'YYYY-MM').daysInMonth();
    };

    // 파라미터로 넘긴 날짜 스트링 형식을 파싱하여 요일에 대한 index를 반환하며, 요일의 집합을 넘기면 index에 해당하는 값을 반환한다.
    DateTime.prototype.getDayOfWeek = function(yearMonthDay, dayOfWeekByLocalLang) {
        var today = this.getToday();
        var date = yearMonthDay.split('-');
        var year = !!date ? date[0] : today.year;
        var month = !!date ? date[1] : today.month;
        var day = !!date ? date[2] : today.day;

        var dayOfWeekByIndex = moment([year, '-', month, '-', day].join('')).format('d');
        if(dayOfWeekByLocalLang && dayOfWeekByLocalLang instanceof Array) {
            return dayOfWeekByLocalLang[dayOfWeekByIndex];
        }

        return dayOfWeekByIndex;
    };

    DateTime.prototype.getNow = function(is24HourTime) {
        var hourFormat = is24HourTime ? 'HH' : 'hh';
        
        return {
            'amPm': moment().format('a'),
            'hour': moment().format(hourFormat),
            'minute': moment().format('mm')
        };
    };

    DateTime.prototype.getConvertedTime = function(time, amPmType) {
        var timeArr = time.split(':');
        var hour = timeArr[0], minute = timeArr[1];
        amPmType = amPmType ? amPmType.toLowerCase() : null;

        if(!amPmType) {
            return {
                'amPm': moment().hour(hour).format('a'),
                'hour': moment().hour(hour).format('hh'),
                'minute': moment().minute(minute).format('mm')
            };
        }

        if(amPmType === 'pm') {
            var convertHour = parseInt(hour, 10);
            hour = convertHour < 12 ? convertHour + 12 : '00';
        }
        return {
            'hour': hour,
            'minute': moment().minute(minute).format('mm')
        };
    };


    function setTransition(easing, element) {
        easing = easing || this.options.effect.easing;
    	var effectStr = [this.options.effect.duration + 's', effects[easing], this.options.effect.delay + 's'].join(' ');

        if(typeof(element) !== 'undefined') {
            this._rollingArea = $(element);
        }

        this._rollingArea.css('transition', effectStr);
        this._rollingArea.css('-webkit-transition', effectStr);
        this._yAxis = getTranslate(this._rollingArea).y;
    }

    function setTranslate(delta, element) {
	    var yAxis = 0;
        if(delta !== 0) {
            yAxis = getAdjustmentAxis.apply(this, [ delta, element ]);
        }
        if(element) {
            $(element).css(this._transform, 'translate3d(0, ' + yAxis + 'px, 0)');
        } else {
    	   this._rollingArea.css(this._transform, 'translate3d(0, ' + yAxis + 'px, 0)');
        }
    }

    function getAdjustmentAxis(delta, element) {
        var rollingArea = null;
        if(typeof(element) !== 'undefined') {
            rollingArea = $(element);
        } else {
            rollingArea = this._rollingArea;
        }

    	var listEl = rollingArea.find(this.options.selector.list);
        // 마지막 요소가 가운데 노출되도록 하기 위해 리스트 총 갯수에서 1을 뺀다.
        // 가장 첫 요소, 마지막 요소는 빈 값이므로 제외.
        var allListHeight = (listEl.length - 1 - 2) * this._listHeight; 
        var transitionRemainValue = delta % this._listHeight;
        var halfOfListHeight = this._listHeight / 2;
        var yAxis = delta - transitionRemainValue;

        if(yAxis > 0 && halfOfListHeight <= Math.abs(transitionRemainValue)) {
        	yAxis = yAxis - this._listHeight;
        }

        if(yAxis > 0) {
        	yAxis = 0;
        } else if(Math.abs(yAxis) >= allListHeight) {
        	yAxis = -allListHeight;
        }
        return yAxis;
    }

    function onStartDrag(event) {
        this._isActivate = true;
        this._rollingArea = $(event.currentTarget).find(this.options.selector.rolling);

        if(event.type !== 'mouseenter') {
        	this._startPointY = event.clientY || event.originalEvent.changedTouches[0].clientY;
        }

        setTransition.apply(this);
    }

    function onDrag(event) {
        event.preventDefault();

        if(this._isActivate) {
            var currentY = event.clientY || event.originalEvent.changedTouches[0].clientY;
            var delta = currentY - this._startPointY;

            setTranslate.apply(this, [ this._yAxis + delta ]);
        }
    }

    function onEndDrag(event) {}

    function onTransitionEnd(event) {
        var containerEl = event.currentTarget;
        var index = getIndex.call(this, containerEl);
        var listEl = $(containerEl).find(this.options.selector.list);
        var _this = this;

        listEl.removeClass(this._selectedClass);
        listEl.eq(index).addClass(this._selectedClass);

        var values = [];
        this._selectionArea.each(function(index, el) {
            var selectedEl = $(el).find(_this.options.selector.list + '.' + _this._selectedClass);
            if(selectedEl.length === 0) {
                selectedEl = $(el).find(_this.options.selector.list).eq(1);
            }
            values.push(selectedEl.attr('data-id'));
        });

        this.options.onChange.apply(this, [ containerEl, {
            'index': index,
            'id': listEl.eq(index).data('id'),
            'values': values
        }]);
        this._isActivate = false;
    }

    function onWheel(event) {
        if(!this._rollingArea) {
            this._rollingArea = $(event.currentTarget).find(this.options.selector.rolling);
            this._yAxis = 0;
        }
    	var wheelEvent = event.originalEvent;
    	setTranslate.apply(this, [ this._yAxis += wheelEvent.wheelDeltaY ]);
    }

    function onClick(event) {
        var targetEl = $(event.target);
        var containerEl = targetEl.closest(this.options.selector.view);
        var listEls = containerEl.find(this.options.selector.list);
        var listEl = targetEl.closest(this.options.selector.list);
        var index = listEls.index(listEl);

        if(index === -1) {
            return;
        }

        setTranslate.apply(this, [ -((index-1) * this._listHeight), containerEl.find(this.options.selector.rolling) ]);
    }

    function onConfirm() {
        var selectedValue = [];
        var selectedEls = this.container.find('.' + this._selectedClass);
        var isValid = true;

        selectedEls.each(function() {
            // jQuery의 data 함수를 사용하면 내부 저장소에서 자료형에 따라 변환을 해버리기 때문에
            // attr로 실제 DOM의 data-id 속성을 가져와야 처음 지정한 타입으로 가져올 수 있다.
            var id = $(this).attr('data-id');
            if(!id) {
                isValid = false;
                return false;
            }
            selectedValue.push(id);
        });
        if(!isValid) {
            return;
        }

        this.hide();
        this.options.onConfirm.apply(this, [ this._inputTargetEl, selectedValue ]);
        this._inputTargetEl = null;
    }

    function onClose() {
        this.hide();
        this._inputTargetEl = null;
        this.options.onClose.apply(this);
    }

    /////////////////////
    /// Util functions ///
    /////////////////////
    function getIndex(containerEl) {
        return Math.abs(getTranslate($(containerEl).find(this.options.selector.rolling)).y / this._listHeight) + 1;
    }

    function getTranslate(element) {
        var transform = element.css('-webkit-transform') || element.css('-ms-transform') || element.css('-moz-transform') || 
                        element.css('-o-transform') || element.css('transform');
        var matrix = transform.substr(7, transform.length - 8).split(', ');

        return { x: parseFloat(matrix[4]) || 0, y: parseFloat(matrix[5]) || 0 };
    }

    function getVendorPropertyName(prop, doLowerCase) {
        if (prop in document.body.style) return prop;

        var prefixes = (!doLowerCase) ? ['Moz', 'Webkit', 'O', 'ms'] : ['moz', 'webkit', 'o', 'ms'];
        var prop_ = prop.charAt(0).toUpperCase() + prop.substr(1);

        for (var i = 0; i < prefixes.length; ++i) {
            var vendorProp = prefixes[i] + prop_;
            if (vendorProp in document.body.style) { return vendorProp; }
        }
    }

    $.fn.slidePicker = function(options) {
        // selector에 해당하는 jQuery객체(element)가 존재하면.
        if(this.length === 1) {
            // jQuery 객체에 저장한 appoint instance가 없다면.
            if(!this.data('slide_picker_inst')) {
                // appoint instance 생성 후 data에 저장.
                var appointInst = new SlidePicker(this, options);
                this.data('slide_picker_inst', appointInst);
                return appointInst;
            }
            return this.data('slide_picker_inst');
        } else if(this.length > 1) {
            throw new Error('Already slidePicker instance has been created.');
        }
    }
}));
