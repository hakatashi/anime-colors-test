// PreLoad Images

var queue = new createjs.LoadQueue();

var characters = [
	'hana',
];

var manifest = [];

characters.forEach(function (character) {
	manifest.push({
		id: character + '.base',
		src: 'img/' + character + '/base.png',
	}, {
		id: character + '.color',
		src: 'img/' + character + '/color.png',
	});
});

queue.on('complete', handleComplete, this);
queue.loadManifest(manifest);

// Extend Caman with custom colorchanging plugin

Caman.Filter.register('translate', function (fromRGB, toRGB) {
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

function handleComplete() {
	$(document).ready(function () {
		$('#image-field').prepend(queue.getResult('hana.base'));
		var timer = new Date();
		Caman('#canvas', 'img/hana/color.png', function () {
			this.translate([255, 255, 224], [65, 48, 122]);
			this.render(function () {
				console.log('Rendering Time: ' + (new Date() - timer));
				$('#image-field').removeClass('invisible');
			});
		});

		function getX(event) {
			if (event.originalEvent.changedTouches) {
				return event.originalEvent.changedTouches[0].pageX;
			} else {
				return event.originalEvent.pageX;
			}
		}

		// enable pinches
		$('.color-parameter').bind({
			'touchstart mousedown': function (event) {
				event.preventDefault();

				var touchX = getX(event);

				var offset = $(this).offset().left;
				var width = $(this).width();
				var $pinch = $(this).find('.color-slider-pinch');

				var movePinch = function (event) {
					var touchX = getX(event);
					var value = (touchX - offset) / width;
					$pinch.css('left', value * 100 + '%');
				}

				$(window).bind('touchmove mousemove', movePinch);
				$(window).bind('touchend mouseup', function () {
					$(this).unbind('touchmove mousemove', movePinch);
				});

				movePinch(event);
			},
		})
	});
}
