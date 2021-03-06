"use strict";

//>>LREditor.Behaviour.name: Hanger
//>>LREditor.Behaviour.params : {"hookX" : 0, "hookY" : 0}
var Hanger = function(_gameobject){
	LR.Behaviour.call(this,_gameobject);
	this.player = null;
	this.formerGrav = 1;
	this.formerAngle = 0;
	this.playerBasePos = null;

	this.minAngle = 20;
	this.maxAngle = 160;
	this.currentAngle = this.minAngle;
	this.direction = 1;

	this.speed = 160;
	this.distance = 1;

	this.hookX = 0;
	this.hookY = 0;

	this.released = false;

  	this.go.game.inputManager.bindKeyPress("jump",this.release,this);  
  	if(! this.entity.game.device.desktop)	
		this.go.game.inputManager.bindMousePress(this.release,this);
}

Hanger.prototype = Object.create(LR.Behaviour.prototype);
Hanger.prototype.constructor = Hanger;

Hanger.prototype.create = function(_data){
	if( _data.distance != null ) this.distance = _data.distance;
	if( _data.hookX != null ) this.hookX = _data.hookX;
	if( _data.hookY != null ) this.hookY = _data.hookY;
}

Hanger.prototype.update = function(){
  if(this.player && this.released == false){
  	//Modify the angle from min to max
  	if( this.direction > 0){
  		this.currentAngle += this.speed * this.entity.game.time.elapsed * 0.001;
  		if (this.currentAngle > this.maxAngle ){
  			this.currentAngle = this.maxAngle;
  			this.direction = -1;
  			this.player.go.body.setZeroVelocity();
  		}
  	}else{
  		this.currentAngle -= this.speed * this.entity.game.time.elapsed * 0.001;
  		if( this.currentAngle < this.minAngle){
  			this.currentAngle = this.minAngle;
  			this.direction = 1;
  			this.player.go.body.setZeroVelocity();
  		}
  	}

  	//rotate the base point
  	var rotatedPoint = LR.Utils.rotatePoint(new Phaser.Point(1,0), this.currentAngle);
  	rotatedPoint.x *= this.distance;
  	rotatedPoint.y *= this.distance;

  	this.player.go.worldX = this.entity.world.x + this.hookX + rotatedPoint.x ;
  	this.player.go.worldY = this.entity.world.y + this.hookY + rotatedPoint.y ;

  	this.player.entity.angle = this.currentAngle - 90;
  }
}

Hanger.prototype.hang = function(){
	this.player = this.playerHair.player;
	if( this.player.dead == true){
		this.player == null;
		return;
	}
	this.player.onHang();

	this.formerAngle = this.player.entity.angle;
	this.formerGrav = this.player.go.gravity;

	this.player.go.gravity = 0;
	//compute base values
	var toPlayer = Phaser.Point.subtract(this.player.entity.world,this.entity.world);
	this.currentAngle = LR.Utils.angle(new Phaser.Point(1,0), toPlayer.normalize());	 		
	this.direction = this.player.direction > 0 ? -1 : 1;
}

Hanger.prototype.release = function(){
	if( this.player ){
		//compute direction of the release
		var vector = Phaser.Point.subtract(this.player.entity.world,this.entity.world);
		//safety to avoiding kiming jumping to vertically
		if(vector.y > 30)
			vector.y = 30;
		Phaser.Point.normalize(vector,vector);

		//unhang the player
		this.player.onReleaseHang(this.formerGrav, vector);	
		this.player = null;
		this.playerHair = null;
		this.released = true;
		this.go.playSound("release",0.5);
	}
}

//This method is automatically called when the body of the player collides with another cody
Hanger.prototype.onBeginContact = function(_otherBody, _myShape, _otherShape, _equation){
	//console.log("begin" + this.released + (this.player == null));
  	if(_otherBody.go.layer == "player" && this.player == null && this.released == false){

  		this.playerHair = _otherBody.go.getBehaviour(PlayerHair);
  		
	  	if( this.playerHair != null && this.playerHair.isShapeAndStatusHook(_otherShape) ){
  			this.hang();
	  	}
    }
}

Hanger.prototype.onEndContact = function(_contactData){	
	//console.log("end " + this.released);
	if( this.released == false)
		return;
	this.released = false;
}