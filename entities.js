var eid_pool = [];
var max_eid = 1;
var entities_pool = {};

var make_eid = function() {
	eid_pool.push(max_eid);

	var current_eid = max_eid;
	max_eid++;
	return current_eid;
	
}

var register_in_pool = function(entity) {
	entities_pool[entity.getEID()] = entity;
}

var number = function() {
	return eid_pool.length;
}

var unregister_from_pool = function(entity) {
	entities_pool[entity.getEID()] = undefined;
}
var get = function(EID) {
	if (eid_pool.indexOf(EID)) { //if EID is active
		return entities_pool[EID];
	}
}

var dispose_eid = function(eid) { 
	eid_pool.splice(eid_pool.indexOf(eid));
}

var _Entity = function(init_x, init_y, init_z) {
	var x = init_x;
	var y = init_y;
	var z = init_z;
	var map;
	var EID = make_eid();
	var that = this;
	this.getX = function() {
		return x;
	}

	this.getY = function() {
		return y;
	}
	
	this.getZ = function() {
		return z;
	}
	this.map = function() {
		return map
	}

	this.getEID = function() {
		return EID;
	}

	this.register = function(newmap) {
		var map = newmap;
	}

	this.remove = function() {
		dispose_eid(EID); // Free EID
		unregister_from_pool(that);
	}

}

var Player = function(init_username, init_x, init_y, init_z) {
	var entity = new _Entity(init_x, init_y, init_z);
	this.getEID = entity.getEID;
	this.getX = entity.getX;
	this.getY = entity.getY;
	this.getZ = entity.getZ;
	this.register = entity.register;
	this.map = entity.map;
	this.remove = entity.remove;

	var username = init_username;
	
	this.getUsername = function() {
		return username;
	}
	register_in_pool(this);
}

var Mob = function(init_type, init_x, init_y, init_z) {
	var entity = new _Entity(init_x, init_y, init_z);

	this.getEID = entity.getEID;
	this.getX = entity.getX;
	this.getY = entity.getY;
	this.getZ = entity.getZ;
	this.register = entity.register;
	this.map = entity.map;
	this.remove = entity.remove;

	var type = init_type;
	this.getType = function() {
		return type;
	};
	register_in_pool(this);
}

module.exports.Player = Player;
module.exports.Mob = Mob;
module.exports.number = number;
module.exports.get = get;
