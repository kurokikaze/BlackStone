var entities = require('./entities');

console.log('Number of entities: ' + entities.number());
var mob = new entities.Player();

console.log('Player created, eid is ' + mob.getEID());

console.log('Coords are ' + mob.getX() + ':' + mob.getY() + ':' + mob.getZ());
console.log('Number of entities: ' + entities.number());
console.log('Removing mob');
mob.remove();

console.log('Number of entities: ' + entities.number());

console.log('Creating several mobs');

var mobs = [];
for (var i = 0; i < 10; i++) {
	mobs.push(new entities.Mob(52, 1, 2000, 10));
}

console.log('Mobs created, EIDs used:' + entities.number());
