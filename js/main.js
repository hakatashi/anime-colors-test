(function() {
  var Game, Question, availableLanguages, colorScore, colorScoreInt, colorsetToRealValueArray, distanceBetweenColors, game, getX, language, nearestColor, percentageToRealValue, realValueArrayToColorset, realValueToPercentage, setLanguage, tinycolorArray;

  Caman.Filter.register('translate', function(fromRGB, toRGB) {
    var from, to;
    if (!Array.isArray(fromRGB)) {
      fromRGB = tinycolorArray(fromRGB);
    }
    if (!Array.isArray(toRGB)) {
      toRGB = tinycolorArray(toRGB);
    }
    from = colorConvert.rgb2labRaw(fromRGB);
    to = colorConvert.rgb2labRaw(toRGB);
    return this.process('translate', function(colorRGB) {
      var RGB, color;
      color = colorConvert.rgb2labRaw([colorRGB.r, colorRGB.g, colorRGB.b]);
      color[0] = Math.max(0, color[0] + to[0] - from[0]);
      color[1] = color[1] + to[1] - from[1];
      color[2] = color[2] + to[2] - from[2];
      RGB = colorConvert.lab2rgbRaw(color);
      colorRGB.r = RGB[0];
      colorRGB.g = RGB[1];
      colorRGB.b = RGB[2];
      return colorRGB;
    });
  });

  distanceBetweenColors = function(A, B) {
    var ALab, BLab, adiff, bdiff, colorA, colorB, distance, ldiff;
    colorA = tinycolor(A).toRgb();
    ALab = colorConvert.rgb2labRaw([colorA.r, colorA.g, colorA.b]);
    colorB = tinycolor(B).toRgb();
    BLab = colorConvert.rgb2labRaw([colorB.r, colorB.g, colorB.b]);
    ldiff = (ALab[0] - BLab[0]) * 2;
    adiff = ALab[1] - BLab[1];
    bdiff = ALab[2] - BLab[2];
    return distance = Math.sqrt(ldiff * ldiff + adiff * adiff + bdiff * bdiff);
  };

  nearestColor = function(color) {
    var base, nearest, nearestDistance;
    base = tinycolor(color);
    if (!base._format) {
      return null;
    }
    nearestDistance = Infinity;
    nearest = null;
    Object.keys(tinycolor.names).forEach(function(colorname) {
      var distance;
      distance = distanceBetweenColors(color, colorname);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = colorname;
      }
    });
    return {
      name: nearest,
      distance: nearestDistance,
      color: tinycolor(nearest)
    };
  };

  colorScore = function(colorA, colorB) {
    var SIGMA, TOLERANCE, distance, score;
    SIGMA = 30;
    TOLERANCE = 0.02;
    distance = distanceBetweenColors(colorA, colorB);
    return score = Math.min(Math.exp(-(distance / SIGMA) * (distance / SIGMA)) * (1 + TOLERANCE), 1);
  };

  colorScoreInt = function(colorA, colorB) {
    return Math.floor(colorScore(colorA, colorB) * 100);
  };

  getX = function(event) {
    if (event.originalEvent.changedTouches) {
      return event.originalEvent.changedTouches[0].pageX;
    } else {
      return event.originalEvent.pageX;
    }
  };

  percentageToRealValue = function(colorset, parameter, value) {
    return {
      RGB: {
        r: value * 255,
        g: value * 255,
        b: value * 255
      },
      HSV: {
        h: value * 360,
        s: value * 100,
        v: value * 100
      },
      Lab: {
        l: value * 100,
        a: value * 200 - 100,
        b: value * 200 - 100
      }
    }[colorset][parameter];
  };

  colorsetToRealValueArray = function(colorset, values) {
    var parameters, ret;
    parameters = {
      RGB: ['r', 'g', 'b'],
      HSV: ['h', 's', 'v'],
      Lab: ['l', 'a', 'b']
    }[colorset];
    ret = [];
    parameters.forEach(function(parameter) {
      ret.push(percentageToRealValue(colorset, parameter, values[parameter]));
    });
    return ret;
  };

  realValueToPercentage = function(colorset, parameter, value) {
    return {
      RGB: {
        r: value / 255,
        g: value / 255,
        b: value / 255
      },
      HSV: {
        h: value / 360,
        s: value / 100,
        v: value / 100
      },
      Lab: {
        l: value / 100,
        a: (value + 100) / 200,
        b: (value + 100) / 200
      }
    }[colorset][parameter];
  };

  realValueArrayToColorset = function(colorset, values) {
    var i, parameters, ret;
    parameters = {
      RGB: ['r', 'g', 'b'],
      HSV: ['h', 's', 'v'],
      Lab: ['l', 'a', 'b']
    }[colorset];
    ret = {};
    i = 0;
    parameters.forEach(function(parameter) {
      ret[parameter] = realValueToPercentage(colorset, parameter, values[i]);
      i++;
    });
    return ret;
  };

  tinycolorArray = function(input) {
    var RGB;
    RGB = tinycolor(input).toRgb();
    return [RGB.r, RGB.g, RGB.b];
  };

  Question = (function() {
    function Question(game, character) {
      this.game = game;
      this.character = character;
      this.info = this.game.queue.getResult("" + this.character + ".info");
      this.defaultColor = tinycolor(this.info['default']);
      this.originalColor = tinycolor(this.info.color);
      this.baseImage = this.game.queue.getResult("" + this.character + ".base");
      this.colorImage = this.game.queue.getResult("" + this.character + ".color");
      this.questionIndex = this.game.questionIndex;
      this.colorsets = {
        RGB: ['r', 'g', 'b'],
        HSV: ['h', 's', 'v'],
        Lab: ['l', 'a', 'b']
      };
      this.currentImageColor = {
        r: null,
        g: null,
        b: null
      };
      this.yourColor = {
        r: null,
        g: null,
        b: null
      };
      this.currentSliderColor = {
        RGB: {
          r: 0,
          g: 0,
          b: 0
        },
        HSV: {
          h: 0,
          s: 0,
          v: 0
        },
        Lab: {
          l: 0,
          a: 0,
          b: 0
        }
      };
      this.busy = true;
      this.caman = null;
      this.phase = 'slider';
      this.score = null;
      this.game.selectTab('RGB');
      this.selectedColorset = 'RGB';
      this.currentSliderColor.RGB = this.defaultColor.toRgbPercentage();
      this.updateSliders('RGB');
      $('#original-color-preview').css({
        'background-color': this.originalColor.toHexString()
      });
      $('#original-color-info .result-color-value').text(this.originalColor.toHexString());
      $('#original-color-info .result-color-name').text(nearestColor(this.originalColor).name);
      $('#image-field').prepend([
        this.imageElement = $('<div>', {
          id: 'image'
        }).append([
          $('<canvas>').attr({
            id: 'canvas',
            width: this.baseImage.originalWidth,
            height: this.baseImage.originalHeight
          }), this.baseImage
        ]).invisible()
      ]);
      $('#image-info').empty().append([
        $('<span>', {
          "class": 'text-en',
          lang: 'en',
          text: "" + this.info.name.en + "(" + this.info.group.en + ")"
        }), $('<span>', {
          "class": 'text-ja',
          lang: 'ja',
          text: "" + this.info.name.ja + "(" + this.info.group.ja + ")"
        }), document.createTextNode(' - '), $('<a>', {
          href: this.info.source,
          target: '_blank',
          text: 'Color Source'
        })
      ]);
      this.caman = Caman('#canvas', 'img/' + this.character + '/color.png', (function(_this) {
        return function() {
          _this.busy = false;
          return _this.updateImage();
        };
      })(this));
      $('#color-sliders').fadeIn();
    }

    Question.prototype.updateSliders = function(base) {
      var baseColor;
      baseColor = colorsetToRealValueArray(base, this.currentSliderColor[base]);
      Object.keys(this.colorsets).forEach((function(_this) {
        return function(colorset) {
          var color;
          if (colorset !== base) {
            color = colorConvert[base.toLowerCase()][colorset.toLowerCase()](baseColor);
            _this.currentSliderColor[colorset] = realValueArrayToColorset(colorset, color);
          }
          return _this.colorsets[colorset].forEach(function(parameter) {
            return _this.game.moveSlider(colorset, parameter, _this.currentSliderColor[colorset][parameter]);
          });
        };
      })(this));
      return this.updateInfo();
    };

    Question.prototype.updateInfo = function() {
      var color;
      color = tinycolor.fromRatio(this.currentSliderColor.RGB);
      $('.color-preview-value').text(color.toHexString());
      $('.color-preview-square').css('background-color', color.toHexString());
      if (this.phase === 'slider') {
        this.yourColor = $.extend({}, this.currentSliderColor.RGB);
      }
      return Object.keys(this.colorsets).forEach((function(_this) {
        return function(colorset) {
          var sliderColor;
          sliderColor = _this.currentSliderColor[colorset];
          return _this.colorsets[colorset].forEach(function(parameter) {
            var $parameter, $slider, colorArray, colorStop, colorStops, i;
            $parameter = $('.color-parameter-wrap[data-colorset=' + colorset + '][data-parameter=' + parameter + ']');
            $slider = $parameter.find('.color-slider-wrapper');
            colorStop = null;
            colorStops = [];
            i = 0;
            while (i < 7) {
              color = $.extend({}, sliderColor);
              color[parameter] = 1 / 6 * i;
              colorArray = colorsetToRealValueArray(colorset, color);
              if (colorset === 'RGB') {
                colorStop = colorArray;
              } else {
                colorStop = colorConvert[colorset.toLowerCase()].rgb(colorArray);
              }
              colorStops.push({
                r: colorStop[0],
                g: colorStop[1],
                b: colorStop[2]
              });
              i++;
            }
            return $slider.gradient(colorStops);
          });
        };
      })(this));
    };

    Question.prototype.updateImage = function() {
      if (this.busy) {
        return;
      }
      if (this.currentImageColor.r === this.currentSliderColor.RGB.r && this.currentImageColor.g === this.currentSliderColor.RGB.g && this.currentImageColor.b === this.currentSliderColor.RGB.b) {
        return;
      }
      this.busy = true;
      this.currentImageColor = $.extend({}, this.currentSliderColor.RGB);
      $('#rendering').visible();
      this.caman.revert(false);
      this.caman.translate(this.info.color, colorsetToRealValueArray('RGB', this.currentSliderColor.RGB));
      return this.caman.render((function(_this) {
        return function() {
          if (_this.imageElement.css('visibility') === 'hidden') {
            _this.imageElement.visible().hide().fadeIn();
          }
          $('#rendering').invisible();
          _this.busy = false;
          return _this.updateImage();
        };
      })(this));
    };

    Question.prototype.submitResult = function() {
      var color;
      color = tinycolor.fromRatio(this.currentSliderColor.RGB);
      $('#your-color-preview').css({
        'background-color': color.toHexString()
      });
      $('#your-color-info .result-color-value').text(color.toHexString());
      $('#your-color-info .result-color-name').text(nearestColor(color).name);
      this.score = colorScoreInt(color, this.originalColor);
      $('#color-sliders').fadeOut((function(_this) {
        return function() {
          $({
            score: 0
          }).animate({
            score: _this.score
          }, {
            step: function(currentScore) {
              var scoreInt;
              scoreInt = Math.floor(currentScore);
              $('#score-numeral').text(scoreInt);
              return $('#score-bar-inner').css({
                width: scoreInt + '%'
              });
            },
            duration: _this.score * 30,
            easing: 'linear'
          });
          return $('#result-field').fadeIn();
        };
      })(this));
      return this.phase = 'result';
    };

    Question.prototype.setColor = function(input) {
      var color, rgb;
      color = tinycolor(input);
      if (color._format) {
        rgb = color.toRgb();
        this.currentSliderColor.RGB = {
          r: rgb.r / 255,
          g: rgb.g / 255,
          b: rgb.b / 255
        };
        this.updateSliders('RGB');
        return this.updateImage();
      } else {
        return this.updateInfo();
      }
    };

    Question.prototype.previewResult = function(isYourColor) {
      var rgb;
      if (isYourColor) {
        this.currentSliderColor.RGB = $.extend({}, this.yourColor);
      } else {
        rgb = this.originalColor.toRgb();
        this.currentSliderColor.RGB = {
          r: rgb.r / 255,
          g: rgb.g / 255,
          b: rgb.b / 255
        };
      }
      this.updateSliders('RGB');
      return this.updateImage();
    };

    Question.prototype.quit = function(callback) {
      $('#result-field').fadeOut(callback);
      return this.imageElement.fadeOut((function(_this) {
        return function() {
          return _this.imageElement.remove();
        };
      })(this));
    };

    return Question;

  })();

  Game = (function() {
    function Game() {
      var manifest;
      this.characters = ['kirima-syaro', 'kafuu-chino', 'hana-fonteinsutando', 'kasumigaoka-utaha', 'akaza-akari'];
      this.questionIndex = 0;
      this.queue = new createjs.LoadQueue();
      manifest = [];
      this.characters.forEach(function(character) {
        return manifest.push({
          id: character + '.base',
          src: 'img/' + character + '/base.png'
        }, {
          id: character + '.color',
          src: 'img/' + character + '/color.png'
        }, {
          id: character + '.info',
          src: 'img/' + character + '/info.json'
        });
      });
      this.queue.on('fileload', function(event) {
        if (event.item.type === 'image') {
          event.result.originalWidth = event.result.width;
          return event.result.originalHeight = event.result.height;
        }
      });
      this.queue.on('progress', function(event) {
        return $('#loading-background').stop(true).animate({
          height: event.progress * 100 + '%'
        }, 500, 'easeOutExpo');
      });
      this.queue.on('complete', (function(_this) {
        return function() {
          return $(document).ready(function() {
            $('#loading').animate({
              top: '-100%'
            }, function() {
              return $(this).hide();
            });
            return _this.init();
          });
        };
      })(this));
      this.queue.loadManifest(manifest);
    }

    Game.prototype.init = function() {
      this.currentQuestion = new Question(this, this.characters[0]);
      $(window).resize(this.onResize.bind(this));
      this.onResize();
      $('.color-parameter').on('touchstart mousedown', (function(_this) {
        return function(event) {
          var colorset, movePinch, offset, parameter, touchX, width;
          event.preventDefault();
          touchX = getX(event);
          parameter = $(event.currentTarget).data('parameter');
          offset = $(event.currentTarget).offset().left;
          width = $(event.currentTarget).width();
          colorset = $(event.currentTarget).data('colorset');
          movePinch = function(event) {
            var value;
            touchX = getX(event);
            value = (touchX - offset) / width;
            value = Math.max(0, Math.min(value, 1));
            _this.currentQuestion.currentSliderColor[colorset][parameter] = value;
            _this.currentQuestion.updateSliders(colorset);
            return _this.currentQuestion.updateImage();
          };
          $(window).on('touchmove mousemove', movePinch);
          $(window).on('touchend mouseup', function(event) {
            return $(event.currentTarget).off('touchmove mousemove', movePinch);
          });
          return movePinch(event);
        };
      })(this));
      $('.color-preview-value').on('click', (function(_this) {
        return function(event) {
          $(event.currentTarget).attr('contenteditable', true);
          $(event.currentTarget).selectText();
          $(event.currentTarget).on('keypress', function(event) {
            if (event.which === 13) {
              $(event.currentTarget).blur();
              return false;
            } else {
              return true;
            }
          });
          return $(event.currentTarget).on('blur', function(event) {
            $(event.currentTarget).attr('contenteditable', false);
            $(event.currentTarget).off('keypress blur');
            return _this.currentQuestion.setColor($(event.currentTarget).text());
          });
        };
      })(this));
      $('.tab-inner').on('click', (function(_this) {
        return function(event) {
          if (_this.currentQuestion.phase === 'slider') {
            return _this.selectTab($(event.currentTarget).text());
          }
        };
      })(this));
      $('.submit').on('click', (function(_this) {
        return function() {
          return _this.currentQuestion.submitResult();
        };
      })(this));
      $('#your-color-preview').on('click', (function(_this) {
        return function() {
          return _this.currentQuestion.previewResult(true);
        };
      })(this));
      $('#original-color-preview').on('click', (function(_this) {
        return function() {
          return _this.currentQuestion.previewResult(false);
        };
      })(this));
      return $('.go-next').on('click', (function(_this) {
        return function() {
          return _this.goNext();
        };
      })(this));
    };

    Game.prototype.onResize = function(event) {
      var IMAGEINFO_HEIGHT, RENDERING_HEIGHT, boxHeight, boxWidth, fieldHeight, fieldWidth, imageHeight, imageTop, imageWidth, zoom;
      RENDERING_HEIGHT = 40;
      IMAGEINFO_HEIGHT = 30;
      imageHeight = this.queue.getResult('kirima-syaro.base').originalHeight;
      imageWidth = this.queue.getResult('kirima-syaro.base').originalWidth;
      boxWidth = $('#image-panel').width() * 0.9;
      boxHeight = null;
      if (matchMedia('(min-width: 900px)').matches) {
        boxHeight = $('#image-panel').height() - RENDERING_HEIGHT - IMAGEINFO_HEIGHT;
      } else {
        boxHeight = 800;
      }
      zoom = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
      fieldWidth = imageWidth * zoom;
      fieldHeight = imageHeight * zoom;
      $('#image-field').css({
        width: fieldWidth,
        height: fieldHeight,
        '-webkit-transform': 'none',
        '-moz-transform': 'none',
        '-o-transform': 'none',
        transform: 'none'
      });
      if (matchMedia('(min-width: 900px)').matches) {
        imageTop = ($('#image-panel').height() - fieldHeight) / 2;
        $('#image-field').css({
          position: 'absolute',
          top: imageTop,
          left: ($('#image-panel').width() - fieldWidth) / 2,
          margin: '0'
        });
        $('#rendering').css({
          position: 'absolute',
          bottom: imageTop + fieldHeight
        });
        return $('#image-info').css({
          position: 'absolute',
          top: imageTop + fieldHeight
        });
      } else {
        $('#image-field').css({
          position: 'relative',
          top: 0,
          left: 0,
          margin: '0 5%'
        });
        $('#rendering').css({
          position: 'relative',
          bottom: 0
        });
        return $('#image-info').css({
          position: 'relative',
          top: 0
        });
      }
    };

    Game.prototype.moveSlider = function(colorset, parameter, value) {
      var $parameter, $pinch, $value;
      $parameter = $('.color-parameter-wrap[data-colorset=' + colorset + '][data-parameter=' + parameter + ']');
      $pinch = $parameter.find('.color-slider-pinch');
      $value = $parameter.find('.color-value');
      $pinch.css('left', value * 100 + '%');
      return $value.text(Math.floor(percentageToRealValue(colorset, parameter, value)));
    };

    Game.prototype.goNext = function() {
      return this.currentQuestion.quit((function(_this) {
        return function() {
          _this.questionIndex++;
          return _this.currentQuestion = new Question(_this, _this.characters[_this.questionIndex]);
        };
      })(this));
    };

    Game.prototype.selectTab = function(tab) {
      $('.colorset-sliders').hide();
      $('.tab').removeClass('selected');
      $(".colorset-sliders[data-colorset=" + tab + "]").show();
      return $(".tab[data-colorset=" + tab + "]").addClass('selected');
    };

    return Game;

  })();

  availableLanguages = ['en', 'ja'];

  $('html').classes().forEach(function(classname) {
    if (classname.startsWith('lang-')) {
      return $('html').removeClass(classname);
    }
  });

  language = navigator.userLanguage || navigator.language;

  setLanguage = null;

  availableLanguages.forEach(function(availableLanguage) {
    if (language.startsWith(availableLanguage)) {
      return setLanguage = availableLanguage;
    }
  });

  if (!setLanguage) {
    setLanguage = availableLanguages[0];
  }

  $('html').addClass('lang-' + setLanguage);

  $('html').attr('lang', setLanguage);

  game = new Game();

}).call(this);

//# sourceMappingURL=main.js.map
