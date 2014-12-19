// PreLoad Images

var queue = new createjs.LoadQueue();

var characters = [
	'syaro',
];

var manifest = [];

characters.forEach(function (character) {
	manifest.push({
		id: character + '.base',
		src: 'img/' + character + '/base.png',
	}, {
		id: character + '.color',
		src: 'img/' + character + '/color.png',
	}, {
		id: character + '.info',
		src: 'img/' + character + '/info.json',
	});
});

queue.on('fileload', function (event) {
	// preserve size of image
	if (event.item.type === 'image') {
		event.result.originalWidth = event.result.width;
		event.result.originalHeight = event.result.height;
	}
});

queue.on('complete', handleComplete, this);
queue.loadManifest(manifest);

function tinycolorArray(input) {
	var RGB = tinycolor(input).toRgb();
	return [RGB.r, RGB.g, RGB.b];
}

// Extend Caman with custom colorchanging plugin

Caman.Filter.register('translate', function (fromRGB, toRGB) {
	if (!Array.isArray(fromRGB)) fromRGB = tinycolorArray(fromRGB);
	if (!Array.isArray(toRGB)) toRGB = tinycolorArray(toRGB);

	var from = colorConvert.rgb.hsv(fromRGB);
	var to = colorConvert.rgb.hsv(toRGB);

	this.process('translate', function (colorRGB) {
		var color = colorConvert.rgb.hsv([colorRGB.r, colorRGB.g, colorRGB.b]);

		color[0] = (color[0] + to[0] - from[0] + 360) % 360;
		if (color[1] <= from[1]) color[1] = color[1] * to[1] / from[1];
		else color[1] = 255 - (255 - color[1]) * (255 - to[1]) / (255 - from[1]);
		if (color[2] <= from[2]) color[2] = color[2] * to[2] / from[2];
		else color[2] = 255 - (255 - color[2]) * (255 - to[2]) / (255 - from[2]);

		var RGB = colorConvert.hsv.rgb(color);
		colorRGB.r = RGB[0];
		colorRGB.g = RGB[1];
		colorRGB.b = RGB[2];

		return colorRGB;
	});
});

function onResize(event) {
	// fit #image-field to be contained in #image-panel
	// 'box' means max acceptable size of #image-panel in #image-field.

	var RENDERING_HEIGHT = 40;
	var IMAGEINFO_HEIGHT = 30;

	var imageHeight = queue.getResult('syaro.base').originalHeight;
	var imageWidth = queue.getResult('syaro.base').originalWidth;

	var boxWidth = $('#image-panel').width() * 0.9;
	var boxHeight = null;

	if (matchMedia('(min-width: 900px)').matches) {
		boxHeight = $('#image-panel').height() - RENDERING_HEIGHT - IMAGEINFO_HEIGHT;
	} else {
		boxHeight = 800;
	}

	var zoom = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
	var fieldWidth = imageWidth * zoom;
	var fieldHeight = imageHeight * zoom;

	$('#image-field').css({
		width: fieldWidth,
		height: fieldHeight,
		'-webkit-transform': 'none',
		'-moz-transform': 'none',
		'-o-transform': 'none',
		transform: 'none'
	});

	if (matchMedia('(min-width: 900px)').matches) {
		var imageTop = ($('#image-panel').height() - fieldHeight) / 2;

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
		$('#image-info').css({
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
		$('#image-info').css({
			position: 'relative',
			top: 0
		});
	}
}

var currentColor = {R: 0, G: 0, B: 0};
var currentSlider = {R: 0, G: 0, B: 0};
var colorset = 'RGB';
var colorsets = [['R', 'G', 'B'], ['H', 'S', 'V'], ['L', 'a', 'b']];
var caman = null;
var busy = true;

function handleComplete() {
	$(document).ready(function () {
		$(window).resize(onResize);
		onResize();

		// start rendering
		$('#image').prepend(queue.getResult('syaro.base'));
		$('#rendering').removeClass('invisible');
		var info = queue.getResult('syaro.info');

		var defaultColor = tinycolor(info.default);
		var initColor = null;
		var rgb = null;

		if (location.hash && (initColor = tinycolor(location.hash))._format) {
			rgb = initColor.toRgb();
		} else {
			rgb = defaultColor.toRgb();
		}

		currentSlider = {R: rgb.r, G: rgb.g, B: rgb.b};
		updateSliders();

		var timer = new Date();
		caman = Caman('#canvas', 'img/syaro/color.png', function () {
			busy = false;
			updateImage();
		});

		function getX(event) {
			if (event.originalEvent.changedTouches) {
				return event.originalEvent.changedTouches[0].pageX;
			} else {
				return event.originalEvent.pageX;
			}
		}

		function moveSlider(parameter, value) {
			var $parameter = $('.color-parameter-wrap[data-parameter=' + parameter + ']');
			var $pinch = $parameter.find('.color-slider-pinch');
			var $value = $parameter.find('.color-value');

			if (parameter === 'a' || parameter === 'b') {
				$pinch.css('left', value / 255 * 100 + 50 + '%');
			} else {
				$pinch.css('left', value / 255 * 100 + '%');
			}
			$value.text(Math.floor(value));
		}

		// enable pinches
		$('.color-parameter').bind('touchstart mousedown', function (event) {
			event.preventDefault();

			var $this = $(this);

			var touchX = getX(event);
			var parameter = $(this).data('parameter');

			var offset = $(this).offset().left;
			var width = $(this).width();
			var colorset = $(this).data('colorset');

			var movePinch = null;

			if (colorset === 'RGB') {
				movePinch = function (event) {
					var touchX = getX(event);
					var value = (touchX - offset) / width;

					value = Math.max(0, Math.min(value, 1));
					currentSlider[parameter] = Math.floor(value * 255);
					updateImage();
					updateSliders();
				}
			} else {
				movePinch = function (event) {
					var paramIndex = {H: 0, S: 1, V: 2, L: 0, a: 1, b: 2}[parameter];
					var rgb = [currentSlider.R, currentSlider.G, currentSlider.B];

					var touchX = getX(event);
					var value = (touchX - offset) / width;
					value = Math.max(0, Math.min(value, 1));
					if (parameter === 'a' || parameter === 'b') value -= 0.5;

					var currentColor = colorConvert.rgb[colorset.toLowerCase()](rgb);
					if (parameter === 'H') currentColor[paramIndex] = value * 360;
					else if (parameter === 'a') currentColor[paramIndex] = value * 200;
					else if (parameter === 'b') currentColor[paramIndex] = value * 200;
					else currentColor[paramIndex] = value * 100;

					var newColor = colorConvert[colorset.toLowerCase()].rgb(currentColor);
					currentSlider = {R: newColor[0], G: newColor[1], B: newColor[2]};

					updateImage();
					updateSliders();
				}
			}

			$(window).bind('touchmove mousemove', movePinch);
			$(window).bind('touchend mouseup', function () {
				$(this).unbind('touchmove mousemove', movePinch);
			});

			movePinch(event);
		});

		$('.color-preview-value').click(function (event) {
			$(this).attr('contenteditable', true);
			$(this).selectText();

			// handle enter keypress
			$(this).keypress(function (e) {
				if (e.which === 13) {
					$(this).blur();
					return false;
				} else return true;
			});

			$(this).blur(function () {
				$(this).attr('contenteditable', false);
				$(this).unbind('keypress blur');

				var newColor = tinycolor($(this).text());
				if (newColor._format) {
					var rgb = newColor.toRgb();
					currentSlider = {R: rgb.r, G: rgb.g, B: rgb.b};
					updateSliders();
					updateImage();
				} else {
					updateInfo();
				}
			});
		});

		// tab switching
		$('.tab-inner').click(function () {
			colorset = $(this).text();
			$('.colorset-sliders').hide();
			$('.tab').removeClass('selected');
			$('.colorset-sliders[data-colorset=' + colorset + ']').show();
			$(this).parent('.tab').addClass('selected');
		});

		function updateSliders() {
			var rgb = [currentSlider.R, currentSlider.G, currentSlider.B];

			colorsets.forEach(function (colorset) {
				var name = colorset.join('');
				var color = null;

				if (name === 'RGB') color = rgb;
				else color = colorConvert.rgb[name.toLowerCase()](rgb).map(function (val) { return val / 100 * 255 });

				colorset.forEach(function (parameter, index) {
					if (parameter === 'H') color[index] = color[index] / 360 * 100;
					else if (parameter === 'a') color[index] = color[index] / 200 * 100;
					else if (parameter === 'b') color[index] = color[index] / 200 * 100;

					moveSlider(parameter, color[index]);
				});
			});

			updateInfo();
		}

		function updateInfo() {
			var color = tinycolor({r: currentSlider.R, g: currentSlider.G, b: currentSlider.B});
			$('.color-preview-value').text(color.toHexString());
			$('.color-preview-square').css('background-color', color.toHexString());

			location.replace(color.toHexString());

			// update sliders gradients
			colorsets.forEach(function (colorset) {
				var name = colorset.join('');

				colorset.forEach(function (parameter, index) {
					var par = parameter.toLowerCase();
					var $parameter = $('.color-parameter-wrap[data-parameter=' + parameter + ']');
					var $slider = $parameter.find('.color-slider-wrapper');

					var color = null;
					var colorStop = null;
					var colorStops = [];
					var rgb = [currentSlider.R, currentSlider.G, currentSlider.B];
					for (var i = 0; i < 7; i++) {
						if (name === 'RGB') {
							colorStop = {r: currentSlider.R, g: currentSlider.G, b: currentSlider.B};
							colorStop[par] = 255 / 6 * i;
						} else if (name === 'HSV') {
							color = colorConvert.rgb.hsv(rgb);
							if (parameter === 'H') color[0] = 360 / 6 * i;
							else color[index] = 100 / 6 * i;
							color = colorConvert.hsv.rgb(color);
							colorStop = {r: color[0], g: color[1], b: color[2]};
						} else if (name === 'Lab') {
							color = colorConvert.rgb.lab(rgb);
							if (parameter === 'L') color[0] = 100 / 6 * i;
							else if (parameter === 'a') color[1] = 200 / 6 * i - 100;
							else if (parameter === 'b') color[2] = 200 / 6 * i - 100;
							color = colorConvert.lab.rgb(color);
							colorStop = {r: color[0], g: color[1], b: color[2]};
						}
						colorStops.push(colorStop);
					}

					$slider.gradient(colorStops);
				});
			});
		}

		function updateImage() {
			if (busy) return;
			if (currentColor.R === currentSlider.R
			 && currentColor.G === currentSlider.G
			 && currentColor.B === currentSlider.B) return;

			busy = true;
			currentColor.R = currentSlider.R;
			currentColor.G = currentSlider.G;
			currentColor.B = currentSlider.B;
			$('#rendering').removeClass('invisible');

			caman.revert(false);
			caman.translate(info.color, [currentSlider.R, currentSlider.G, currentSlider.B]);
			caman.render(function () {
				$('#image').removeClass('invisible');
				$('#rendering').addClass('invisible');

				busy = false;
				updateImage();
			});
		}
	});
}
