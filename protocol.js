var iconv = require('iconv').Iconv;

var command = {};

command.keepalive = function() {
	var hash = parseInt(Math.random(0, 1337));
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
};

command.mob_spawn = function(EID, type, X, Y, Z, yaw, pitch, metadata) {
	var buf = new Buffer(21);
	buf.writeUInt8(0x18, 0);
	buf.writeInt32BE(EID, 1);
	buf.writeUInt8(type, 5);
	buf.writeInt32BE(parseInt(X), 6);
	buf.writeInt32BE(parseInt(Y), 10);
	buf.writeInt32BE(parseInt(Z), 14);
	buf.writeInt8(yaw, 18);
	buf.writeInt8(pitch, 19);
	buf.writeUInt8(0x7F, 20);
	return buf;
};

command.entity_velocity = function(EID, deltaX, deltaY, deltaZ) {
	var buf = new Buffer(11);
	buf.writeUInt8(0x1C, 0);
	buf.writeInt32BE(EID, 1);
	buf.writeInt16BE(parseInt(deltaX), 5);
	buf.writeInt16BE(parseInt(deltaY), 7);
	buf.writeInt16BE(parseInt(deltaZ), 9);

	return buf;
};

command.entity_relative_move = function(EID, deltaX, deltaY, deltaZ) {
	var buf = new Buffer(8);
	buf.writeUInt8(0x1F, 0);
	buf.writeInt32BE(EID, 1);
	buf.writeInt8(deltaX, 5);
	buf.writeInt8(deltaY, 6);
	buf.writeInt8(deltaZ, 7);

	return buf;
}

command.prechunk = function(X, Z, mode) {
	var buf = new Buffer(10);
	buf.writeUInt8(0x32, 0);

	buf.writeInt32BE(X, 1);
	buf.writeInt32BE(Z, 5);
	buf.writeUInt8(parseInt(1), 9);
	return buf;
};

command.chunk = function(X, Y, Z, Size_X, Size_Y, Size_Z, compressed_chunk) {
	var buf = new Buffer(18 + compressed_chunk.length);
	buf.writeUInt8(0x33, 0);
	buf.writeInt32BE(X, 1);
	buf.writeInt16BE(Y, 5);
	buf.writeInt32BE(Z, 7);
	buf.writeInt8(Size_X, 11);
	buf.writeInt8(Size_Y, 12);
	buf.writeInt8(Size_Z, 13);
	buf.writeInt32BE(compressed_chunk.length, 14);

	compressed_chunk.copy(buf, 18, 0);
	return buf;
};

command.position_look = function(x, stance, y, z, yaw, pitch, on_ground) {
	var buf = new Buffer(42);
	buf.writeUInt8(0x0D, 0);
	buf.writeDoubleBE(x, 1);
	buf.writeDoubleBE(stance, 9);
	buf.writeDoubleBE(y, 17);
	buf.writeDoubleBE(z, 25);
	buf.writeFloatBE(parseFloat(yaw), 33);
	buf.writeFloatBE(parseFloat(pitch), 37);
	buf.writeUInt8(parseInt(on_ground), 41);
	return buf;
};

var str16 = function(str) {
	var conv = new iconv('UTF-8', 'UCS-2BE');
	var buf2 = new Buffer(2 + Buffer.byteLength(str, 'ucs2'));
	buf2.writeInt16BE(str.length, 0);
	var bestring = conv.convert(str);
	bestring.copy(buf2, 2, 0);
	return buf2;
};

var readPacket = function(str) {
	conv = new iconv('UCS-2BE', 'UTF-8');
	var packet = {};
	packet.type = str.readUInt8(0);
	packet.fields = {};
//    console.log('Got packet of type ' + packet.type);
	
	switch(packet.type) {
		case 1:
			packet.fields.protocol_version = str.readUInt32BE(1);
			var length_username = str.readUInt16BE(9);
			var str_ucs2be = str.slice(11, 11 + 2*length);
			packet.fields.username = conv.convert(str_ucs2be).toString('utf8');
			break;
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
			packet.fields.yaw = str.readFloatBE(33);
			packet.fields.pitch = str.readFloatBE(37);
			packet.fields.on_ground = str.readUInt8(41);
			break;
	}
	return packet;
}

module.exports.command = command;
module.exports.readPacket = readPacket;
