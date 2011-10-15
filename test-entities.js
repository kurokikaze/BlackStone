var entities = require('./entities');

console.log('Number of entities: ' + entities.number());
var mob = new entities.Mob(52, 1, 62.5*32, 1);

console.log('Mob created, eid is ' + mob.getEID());

console.log('Coords are ' + mob.getX() + ':' + mob.getY() + ':' + mob.getZ());
console.log('Number of entities: ' + entities.number());
console.log('Removing mob');
mob.remove();

console.log('Number of entities: ' + entities.number());
