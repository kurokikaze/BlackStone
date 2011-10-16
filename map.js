var events = require('events'),
	zlib = require('zlib');

var map = function() {
	events.EventEmitter.call(this);
	var chunks = [];

	this.getChunk = function(x, y) {
		if (chunks[x] && chunks[x][y]) {
			return chunks[x][y];
		} else {
			// Generate missing chunk
		}
	}
};

var generate_table = function(callback) {
	var chunk = new Buffer(16 * 16 * 128 + 16384 * 3);
	var index = 0;

	for (var x = 0; x < 16; x++) {
		for (var z = 0; z < 16; z++) {
			for (var y = 0; y< 128; y++) {
				index = y + (z * 128) + (x * 128 * 16);
				if (y > 62) {
					chunk.writeUInt8(0, index);
				} else {
					chunk.writeUInt8(1, index);
				}
				if (y <= 1) {
					chunk.writeUInt8(7, index);
				}
			}
		}
	}

	chunk.fill(0, 32768, 32768+16384); // empty metadata
	chunk.fill(255, 32768+16384, 32768+16384*2); // full brightness
	chunk.fill(255, 32768 + 16384*2, 32768+16384*3); //full sky light

    console.log('Uncompressed chunk size: ' + chunk.length);

	var compressor = zlib.Deflate();

	var data = [];
	compressor.on('data', function(data_part) { 
		data.push(data_part);
	});
	compressor.on('end', function() {
		var total_length = 0;
		for (i in data) {
			total_length = data[i].length;
		}
		console.log('Chunk size after compression: ' + total_length);
		var out_data = new Buffer(total_length);
		var pointer = 0;
		for (i in data) {
			data[i].copy(out_data, pointer, 0);
			pointer += data[i].length;
		}
		callback(out_data);

	});
	compressor.write(chunk);
	compressor.end();
	if (!callback) {
		return chunk;
	}
}

sys.inherits(map, events.EventEmitter);

exports.map = map;

