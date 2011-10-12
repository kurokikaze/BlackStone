var net = require('net'),
	iconv = require('iconv').Iconv,
	zlib = require('zlib'),
    config = require('./config');

if(zlib.Deflate) {
console.log('Deflate present');
} else {
 console.log('No deflate present in zlib');
 }
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

var command = {};

command.keepalive = function() {
	var hash = Math.Random(0, 1337);
	var buf = new Buffer(5);
	buf.writeUInt8(0, 0);
	buf.writeInt32BE(hash, 1);
	return buf;
}

command.kick = function(str) {
	var buf = new Buffer(3 + Buffer.byteLength(str, 'ucs2'));
	buf.writeUInt8(255, 0);
	var prepared_string = str16(str);
	prepared_string.copy(buf, 1, 0);
	return buf;
}

command.time = function(hash) {
	var time = Date.now();
	var buf = new Buffer(9);
	buf.writeUInt8(0x04, 0);
	buf.writeDoubleBE(time/50, 1);
	return buf;
}

command.auth = function(hash) {
	var buf = new Buffer(3 + Buffer.byteLength(hash, 'ucs2'));
	buf.writeUInt8(2, 0);
	var prepared_hash = str16(hash);
	prepared_hash.copy(buf, 1, 0);
	return buf;
}

command.login = function(entity_id, seed, mode, dimension, difficulty, height, maxplayers) {
	var buf = new Buffer(23);
	buf.writeUInt8(0x01, 0);
	buf.writeInt32BE(entity_id, 1); // entity ID
	buf.writeInt16BE(0, 5); // empty string

	buf.writeInt32BE(seed, 7); // not used
	buf.writeInt32BE(seed, 11); // not used

	buf.writeInt32BE(mode, 15); // server mode
	
	buf.writeInt8(dimension, 19); // dimension
	buf.writeInt8(difficulty, 20); //difficulty

	buf.writeUInt8(height, 21); //map height
	buf.writeUInt8(maxplayers, 22); //max players
	
	return buf;
}

command.spawn_position = function(X, Y, Z) {
	var buf = new Buffer(13);
	buf.writeUInt8(0x06, 0);

	buf.writeInt32BE(X, 1);
	buf.writeInt32BE(Y, 5);
	buf.writeInt32BE(Z, 9);

	return buf;
}

command.equip = function(entity_id, slot, item_id, damage) {
	var buf = new Buffer(11);
	buf.writeUInt8(0x05, 0);

	buf.writeInt32BE(entity_id, 1);
	buf.writeInt16BE(slot, 5);
	buf.writeInt16BE(item_id, 7);
	buf.writeInt16BE(damage, 9);

	return buf;
}

command.prechunk = function(X, Z, mode) {
	var buf = new Buffer(10);
	buf.writeUInt8(0x32, 0);

	buf.writeInt32BE(X, 1);
	buf.writeInt32BE(Z, 5);
	buf.writeUInt8(parseInt(1), 9);
	return buf;
}

command.chunk = function(X, Y, Z, Size_X, Size_Y, Size_Z, compressed_chunk) {
	// console.log('Planned chunk length is ' + compressed_chunk.length);
	var buf = new Buffer(18 + compressed_chunk.length);
	buf.writeUInt8(0x33, 0);
	buf.writeInt32BE(X, 1);
	buf.writeInt16BE(Y, 5);
	buf.writeInt32BE(Z, 7);
	buf.writeInt8(Size_X, 11);
	buf.writeInt8(Size_Y, 12);
	buf.writeInt8(Size_Z, 13);
	buf.writeInt32BE(compressed_chunk.length, 14);
	/*if (Buffer.isBuffer(compressed_chunk)) {
		console.log('Type of compressed chunk is buffer');
	}
	if (compressed_chunk instanceof String) {
		console.log('Type of compressed chunk is String');
	}*/
	compressed_chunk.copy(buf, 18, 0);
	return buf;
}

command.position_look = function(x, stance, y, z, yaw, pitch, on_ground) {
	var buf = new Buffer(42);
	buf.writeUInt8(0x0D, 0);
	buf.writeDoubleBE(x, 1);
	buf.writeDoubleBE(stance, 9);
	buf.writeDoubleBE(y, 17);
	buf.writeDoubleBE(z, 25);
	buf.writeFloatBE(yaw, 33);
	buf.writeFloatBE(pitch, 37);
	buf.writeUInt8(parseInt(on_ground), 41);
	return buf;
}

var str16 = function(str) {
	var conv = new iconv('UTF-8', 'UCS-2BE');
	var buf2 = new Buffer(2 + Buffer.byteLength(str, 'ucs2'));
	buf2.writeInt16BE(str.length, 0);
	var bestring = conv.convert(str);
	bestring.copy(buf2, 2, 0);
	return buf2;
}

var readPacket = function(str) {
	conv = new iconv('UCS-2BE', 'UTF-8');
	var packet = {};
	packet.type = str.readUInt8(0);
	// console.log('Got packet of type ' + packet.type);
	packet.fields = {};
	
	switch(packet.type) {
		case 1:
			packet.fields.protocol_version = str.readUInt32BE(1);
			var length_username = str.readUInt16BE(9);
			var str_ucs2be = str.slice(11, 11 + 2*length);
			packet.fields.username = conv.convert(str_ucs2be).toString('utf8');

		case 2:
			var length = str.readUInt16BE(1);
			var str_ucs2be = str.slice(3, 3 + 2*length);
			packet.fields.username = conv.convert(str_ucs2be).toString('utf8');
			break;
		case 3:
			
			break;
		case 11:
			break;
		case 13:
			packet.fields.X = str.readDoubleBE(1);
			packet.fields.Y = str.readDoubleBE(9);
			packet.fields.Stance = str.readDoubleBE(17);
			packet.fields.Z = str.readDoubleBE(25);
			break;
	}
	return packet;
}


var str8 = function(str) {
	var buf2 = new Buffer()
}

var server = net.createServer(function(c) {
	//var data = '';
        var hash = 'deadbeefdeadbeef';
	c.on('data', function(chunk) {
		//console.log(chunk.length + ' bytes of data received');
		//data += chunk;
		var packet = readPacket(chunk);
		if (packet.type == 254) {
			console.log('Client asks for server status');
			var answer = command.kick('BlackStone' + String.fromCharCode(167) + '0' + String.fromCharCode(167) + '1000');
			console.log('answer is ' + answer.length + ' bytes long');
			c.write(answer);
			//c.end();
		} else if (packet.type == 2) {
			console.log('Clients sends username ' + packet.fields.username);
			var answer = command.auth(hash);
			c.write(answer);
		} else if(packet.type == 1) {
			c.write(command.login(1289, 1224, 1, 0, 0, 128, 128));

			// Send chunks
			generate_table(function(table_chunk) {
			
            console.log('Sending chunks of size ' + table_chunk.length);
			for (var x = -7; x <= 7; x++) {
				for (var z = -7; z <= 7; z++) {
				//	c.write(command.prechunk(x, z, 1));
					c.write(command.chunk(x*16, 0, z*16, 15, 127, 15, table_chunk));
				}
			}

			console.log('Sending time');
			c.write(command.time());
			console.log('Sending inventory');
			for (var slot = 0; slot <= 4; slot++) {
				c.write(command.equip(1289, slot, -1, 0));
			}
			console.log('Setting spawn position');
			c.write(command.spawn_position(0,63,0));
		
			console.log('Spawning player');
			c.write(command.position_look(1, 67.2, 65.6, 1, 0, 0, 0));
			//c.write(answer);
			});
		} else {
			if (packet.type != 11) {
				//console.log('Got packet of type ' + packet.type + ', fields: ', packet.fields);
			}
		}
		
	});

	c.on('end', function() {
		console.log('End');
		// console.log('Packet type is ' + data.charCodeAt(0));
	});

});

server.listen(config.port, config.ip);
console.log('Server started on ip ' + config.ip + ', port ' + config.port + ', waiting for init packet');
