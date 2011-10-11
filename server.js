var net = require('net'),
	iconv = require('iconv').Iconv,
	zlib = require('zlib'),
    config = require('./config');

if(zlib.deflate) {
console.log('Deflate present');
} else {
 console.log('No defklate present in zlib');
 }
var generate_table = function() {
	var chunk = new Buffer(16 * 16 * 128 + 16384 * 3);
	var index = 0;

	for (var x = 0; x++; x < 16) {
		for (var z = 0; z++; z < 16) {
			for (var y = 1; y++; y < 128) {
				index = y + (z * 128) + (x * 127 * 16);
				if (y > 30) {
					chunk[index] = 0;
				} else {
					chunk[index] = 1;
				}
			}
		}
	}
	chunk.fill(0, 32768, 32768+16384); // empty metadata
	chunk.fill(255, 32768+16384, 32768+16384*2); // full brightness
	chunk.fill(255, 32768 + 16384*2, 32768+16384*3); //full sky light

    console.log('Uncompressed chunk size: ' + chunk.length);
	//var gzip = new compress.Gzip;
	//gzip.init();
    //

    //var zlib = 
	var compressed_chunk_data = zlib.Deflate(chunk);

	return compressed_chunk_data;
}

var command = {};

command.kick = function(str) {
	var buf = new Buffer(3 + Buffer.byteLength(str, 'ucs2'));
	buf[0] = 255;
	var prepared_string = str16(str);
	prepared_string.copy(buf, 1, 0);
	return buf;
}

command.auth = function(hash) {
	var buf = new Buffer(3 + Buffer.byteLength(hash, 'ucs2'));
	buf[0] = 2;
	var prepared_hash = str16(hash);
	prepared_hash.copy(buf, 1, 0);
	return buf;
}

command.login = function(entity_id, seed, mode, dimension, difficulty, height, maxplayers) {
	var buf = new Buffer(23);
	buf[0] = 1;
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

command.chunk = function(X, Y, Z, Size_X, Size_Y, Size_Z, compressed_chunk) {
	var buf = new Buffer(18 + compressed_chunk.length);
	buf.writeInt8(0x33, 0);
	buf.writeInt32BE(X, 1);
	buf.writeInt16BE(Y, 5);
	buf.writeInt32BE(Z, 7);
	buf.writeInt8(Size_X, 11);
	buf.writeInt8(Size_Y, 12);
	buf.writeInt8(Size_Z, 13);
	buf.writeInt32BE(compressed_chunk.length, 14);
	compressed_chunk.copy(buf, 18, 0);
	return buf;
}

command.position_look = function(x, stance, y, z, yaw, pitch, on_ground) {
	var buf = new Buffer(42);
	buf.writeInt8(0x0D, 0);
	buf.writeDoubleBE(x, 1);
	buf.writeDoubleBE(y, 9);
	buf.writeDoubleBE(stance, 17);
	buf.writeDoubleBE(z, 25);
	buf.writeFloatBE(yaw, 33);
	buf.writeFloatBE(pitch, 37);
	buf.writeInt8(on_ground, 41);
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
	packet.type = str[0];
	packet.fields = {};
	
	switch(str[0]) {
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
		case 65533:
			break;
	}
	return packet;
}


var str8 = function(str) {
	var buf2 = new Buffer()
}

var server = net.createServer(function(c) {
	var data = '';
        var hash = 'deadbeefdeadbeef';
	c.on('data', function(chunk) {
		console.log(chunk.length + ' bytes of data received');
		data += chunk;
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
			var answer = command.login(1289, 1224, 1, 0, 0, 128, 128);
			c.write(answer);

			// Send chunks
			var table_chunk = generate_table();
            console.log('Sending chunks');
			for (var x = -7; x++; x<7) {
				for (var z = -7; z++; z<7) {
					var answer_part = command.chunk(x, 0, z, 15, 127, 15, table_chunk);
                    //console.log('Sending chunk for ' + x + ', ' + z + ', size is' + answer_part.length);
					c.write(answer_part);
				}
			}
			var answer = command.position_look(0, 33, 0, 0, 0, 0, 1);
            
			c.write(answer);
		} else {
			if (packet.type != 11) {
				console.log('Got packet of type ' + packet.type + ', fields: ', packet.fields);
			}
		}
		
	});

	c.on('end', function() {
		console.log('End');
		console.log('Packet type is ' + data.charCodeAt(0));
	});

});

server.listen(config.port, config.ip);
console.log('Server started on ip ' + config.ip + ', port ' + config.port + ', waiting for init packet');
