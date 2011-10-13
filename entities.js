var eid_pool = [];
var max_eid = 1;
var entities_pool = {};

var make_eid = function() {
	eid_pool.push(max_eid);

	var current_eid = max_eid;
	max_eid++;
	
}

var dispose_eid = function(eid) { 
	eid_pool.splice(eid_pool.indexOf(eid));
}

var _Entity = function() {
	this.getX = function() {
		return this._x;
	}

	this.getY = function() {
		return this._y;
	}
	
	this.getZ = function() {
		return this._z;
	}

}

var Player = function(init_x, init_y, init_z) {
	this._x = init_x;
	this._y = init_y;
	this._z = init_z;

	var EID = make_eid();
	this.getEID = function() {
		return EID;
	}
}

var Mob = function(type, init_x, init_y, init_z) {
	var x = init_x;
	var y = init_y;
	var z = init_z;

	var EID = make_eid();
}
