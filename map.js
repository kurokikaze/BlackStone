var events = require('events'),
	zlib = require('zlib'),
    util = require('util'),
    Step = require('step');

var chunk = function(chunk_x, chunk_z) {
    events.EventEmitter.call(this);
    var compressed;
    var blocks = [];

    var that = this;
    var already_compressed = false;

    var x, y, z;
    for (x = 0; x < 16; x++) {
        for (y = 0; y < 128; y++) {
            for (z = 0; z < 16; z++) {
                if (!blocks[x]) { // create rows if needed
                    blocks[x] = [];
                }
                if (!blocks[x][y]) { // create columns if needed
                    blocks[x][y] = [];
                }
                
                // Actual generation
                if (y > 62) {
                    blocks[x][y][z] = 0;
                } else if (y == 62) {
                    if (Math.floor(Math.random() * 101) == 100) {
                        blocks[x][y][z] = 20;
                    }
                    blocks[x][y][z] = 2; //grass surface
                } else if (y <= 1) {
                    blocks[x][y][z] = 7;
                } else {
                    blocks[x][y][z] = 1;
                }
            }
        }
    }
    
    var compress = function() {
	    var chunk_data = new Buffer(16 * 16 * 128 + 16384 * 3);
	    var index = 0;
        var x, y, z;
	    for (x = 0; x < 16; x++) {
		    for (z = 0; z < 16; z++) {
			    for (y = 0; y< 128; y++) {
				    index = y + (z * 128) + (x * 128 * 16);
                    // console.log('Writing ' + blocks[x][y][z] + ' at position ' + index);
				    chunk_data.writeUInt8(blocks[x][y][z] , index);
	    		}
		    }
    	}

	    chunk_data.fill(0, 32768, 32768+16384); // empty metadata
    	chunk_data.fill(255, 32768+16384, 32768+16384*2); // full brightness
	    chunk_data.fill(255, 32768 + 16384*2, 32768+16384*3); //full sky light

	    var compressor = new zlib.Deflate();
    	var data = [];

	    compressor.on('data', function(data_part) { 
		    data.push(data_part);
            console.log('got part of compressed buffer for ' + chunk_x + ', ' + chunk_z + ': ' + data_part.length + ' bytes');
    	});

	    compressor.on('end', function(data_part) {
       	    var total_length = 0;
    		for (var i in data) {
	    		total_length += data[i].length;
		    }
    		console.log('Chunk size after compression: ' + total_length);
	    	var out_data = new Buffer(total_length);
		    var pointer = 0;
    		for (i in data) {
	    		data[i].copy(out_data, pointer, 0);
    			pointer += data[i].length;
	    	}
    	    compressed = out_data;
            already_compressed = true;
            console.log('Compressed chunk at ' + chunk_x + ', ' + chunk_z);
            that.emit('compressed');
	    });
        console.log('Writing ' + chunk_data.length + ' bytes to compressor');
    	compressor.write(chunk_data);
	    compressor.end();
    }

    this.updateBlock = function(x, y, z, type) {
        block[x][y][z] = type;
        already_compressed = false;
        compress();
    }
    
    this.getBlock = function(x, y, z) {
        return block[x][y][z];
    }

    this.getCompressed = function(callback) {
        if (already_compressed) {
            callback(compressed);
        } else { // Wait for data to be compressed
            that.once('compressed', callback);
        }
    }

    console.log('Generated chunk at ' + chunk_x + ', ' + chunk_z);
    compress();
}

util.inherits(chunk, events.EventEmitter);

var map = function() {
	events.EventEmitter.call(this);
	var chunks = [];

	this.getChunk = function(x, z, callback) {
        if (!chunks[x]) {
            chunks[x] = [];
        }

		if (chunks[x][z]) {
			chunks[x][z].getCompressed(callback);            
		} else {
            // new chunk needed at position
            chunks[x][z] = new chunk(x, z);
            chunks[x][z].getCompressed(callback);
        }
	}
    this.preGenerate = function(x, z) {
        if (!chunks[x]) {
            chunks[x] = [];
        }
        if (!chunks[x][z]) {
            chunks[x][z] = new chunk(x, z);
        }
    }
};


util.inherits(map, events.EventEmitter);

exports.map = map;

