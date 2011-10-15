var net = require('net'),
	zlib = require('zlib'),
    config = require('./config'),
	entities = require('./entities'),
	command = require('./protocol').command,
	readPacket = require('./protocol').readPacket;


var max_current_entity = 1;
var users = [];
var mobs = [];

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


var str8 = function(str) {
	var buf2 = new Buffer()
}

var server = net.createServer(function(c) {
	var current_entity;
	var user = new entities.Player();
	var hash = 'deadbeefdeadbeef';
	c.on('data', function(chunk) {
		var packet = readPacket(chunk);
		switch (packet.type) {
		case 13:
			user.x = packet.fields.X;
			user.y = packet.fields.Y;
			user.z = packet.fields.Z;
			user.stance = packet.fields.stance;
			user.pitch = packet.fields.pitch;
			user.yaw = packet.fields.yaw;
			break;
		case 254:
			console.log('Client asks for server status');
			var answer = command.kick('BlackStone' + String.fromCharCode(167) + '0' + String.fromCharCode(167) + '1000');
			console.log('answer is ' + answer.length + ' bytes long');
			c.write(answer);
			//c.end();
			break;
		case 2:
			console.log('Clients sends username ' + packet.fields.username);
			c.write(command.auth(hash));
			
			current_entity = max_current_entity;
			max_current_entity++;
			user = {
				'username' : packet.fields.username,
				'x' : 1,
				'y' : 65.6,
				'z' : 1,
				'yaw' : 0.0,
				'pitch' : 0.0,
				'stance' : 67.2,
				'on_ground': 1
			}
			users[current_entity] = user;
			break;
		case 1:
			c.write(command.login(1289, 1224, 1, 0, 0, 128, 128));

			// Send chunks
			generate_table(function(table_chunk) {
			
            console.log('Sending chunks of size ' + table_chunk.length);
			for (var x = -7; x<=7; x++) {
				for (var z = -7; z <= 7; z++) {
					c.write(command.prechunk(x, z, 1));
				}
			}
			for (var x = -7; x <= 7; x++) {
				for (var z = -7; z <= 7; z++) {
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
			c.write(command.spawn_position(0, 63, 0));
		
			console.log('Spawning player');
			c.write(command.position_look(user.x, user.stance, user.y, user.z, user.pitch, user.yaw, user.on_ground));
			});
			setTimeout(function() {
				console.log('Spawning mob');
				var mob = new entities.Mob(entities.mob_types.villager, 32, 2032, 32);
				c.write(command.mob_spawn(mob.getEID(), mob.getType(), mob.getX(),  mob.getY(), mob.getZ(), -27, 0, {}));
				setInterval(function(){
					c.write(command.entity_relative_move(0x233, 32, 0, 0));
					c.write(command.entity_velocity(0x233, 1300, 0, 0));
				}, 500);
			}, 10000);
			break;
		case 255: // Player disconnects
			user.remove();
			break;
		}
	});

	c.on('end', function() {
		console.log('End');
		if (user && user.pulse) {
			user.pulse.stop();
		}
		// console.log('Packet type is ' + data.charCodeAt(0));
	});

});

server.listen(config.port, config.ip);
console.log('Server started on ip ' + config.ip + ', port ' + config.port + ', waiting for init packet');
