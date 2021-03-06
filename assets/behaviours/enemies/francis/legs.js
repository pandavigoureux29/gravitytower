"use strict";
//>>LREditor.Behaviour.name : Francis.Legs
//>>LREditor.Behaviour.params : {}
if(!Francis)
	var Francis = {};

Francis.Legs = function(_gameobject){
	LR.Behaviour.call(this, _gameobject);
}

Francis.Legs.prototype = Object.create(LR.Behaviour.prototype);
Francis.Legs.prototype.constructor = Francis.Legs;

Francis.Legs.prototype.create = function(_data){
	this.legs = new Array();
	for(var i=0; i < this.entity.children.length; i++){
		this.legs.push( this.entity.children[i].go.getBehaviour(Francis.Leg) );
	}
}

//============ STUN ========================
Francis.Legs.prototype.stun = function(){
	for(var i=0;  i < this.legs.length; i ++){
		this.legs[i].stun();
	}
}

Francis.Legs.prototype.unstun = function(){
	for(var i=0;  i < this.legs.length; i ++){
		this.legs[i].unstun();
	}
}

Francis.Legs.prototype.rot = function(_color,_time){
	for(var i=0;  i < this.legs.length; i ++){
		this.legs[i].rot(_color,_time);
	}
}