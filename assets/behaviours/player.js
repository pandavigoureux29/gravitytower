"use strict";

//>>LREditor.Behaviour.name: Player

var Player = function(_gameobject) {
	LR.Behaviour.call(this, _gameobject);

  //Speed Values
  this.baseSpeed = 200;
  this.speed = this.baseSpeed;
  this.airSpeed = this.speed;
  this.acc = 10;

  this.onGround = false;
  this.groundContacts = 0;

  this.dead = false;
  this.jumpPower = 300;
  this.gravity = 1;

  this.direction = 1;

  //get the feet shape by its name
  this.feetSensor = this.go.getShapeByName("feet");
  this.mainShape = this.go.getShapeByName("mainShape");

  //============= INPUTS =======================
  //use the inputManager to be notified when the JUMP key is pressed
  this.go.game.inputManager.bindKeyPress("jump",this.onJump,this);
  this.go.game.inputManager.bindKeyRelease("jump",this.onJumpRelease,this);
  //press to move
  this.go.game.inputManager.bindKeyPress("left", this.onMoveLeft, this);
  this.go.game.inputManager.bindKeyPress("right", this.onMoveRight, this);
  //Stop on release
  this.go.game.inputManager.bindKeyRelease("left", this.onMoveRelease, this);
  this.go.game.inputManager.bindKeyRelease("right", this.onMoveRelease, this);

  //inputs variables
  this.isMovePressed = false;
  this.isJumpPressed = false;

  //Allowing variables
  this.canJump = true;
  this.canMove = true;

  //Make camera follow the player
  this.entity.game.camera.bounds = null;
  this.entity.game.camera.follow(this.entity,Phaser.Camera.FOLLOW_PLATFORMER);

  //State
  this.state = "idle";
  this.lastState = this.state;

  //respawn
  this.respawnPosition = new Phaser.Point(this.entity.x, this.entity.y);
  this.respawnDirection = 1;

  this.lives = this.entity.game.playerSave.getSave()["lives"];
  this.entity.game.playerSave["coins"] = 0;

};

Player.prototype = Object.create(LR.Behaviour.prototype);
Player.prototype.constructor = Player;

Player.prototype.create = function(_data) {
  this.hair = LR.Entity.FindByName(this.entity.parent, _data.hair_name).go.getBehaviour(PlayerHair);
  this.hair.player = this;
}

Player.prototype.update = function() {
  if( this.dead == true )
    return;
  switch(this.state){
    case "run" : this.updateRun(); 
      break;
    case "jump" : this.updateJump();
      break;
  }
}

Player.prototype.postUpdate = function(){
  this.hair.followPlayer();
}

//This method is automatically called when the body of the player collides with another cody
Player.prototype.onBeginContact = function(_otherBody, _myShape, _otherShape, _equation){
  //if the collision is from the feet shape
  if( _myShape == this.feetSensor ){
    //Enemy collision
    if(_otherBody.go.layer == "enemy"){
      var enemy = _otherBody.go.getBehaviour(Enemy);
      if( enemy ){
        _otherBody.go.sendMessage("onHitJump");
        this.jump(true);
      }
    }else if( _otherShape.sensor == false || _otherShape.sensor == null){
      this.groundContacts ++;
      this.onGround = true;
      if( this.isMovePressed )
        this.run();
      else
        this.idleize();
    }
  }
}

Player.prototype.onEndContact = function(contactData){
  if( contactData.myShape == this.feetSensor && this.isLayerGround(contactData.otherBody.go.layer) ){
    this.groundContacts --;
    if( this.groundContacts == 0 && this.state != "jump"){
      this.fall();
    }
  }
  //console.log("endPlayer " + contactData.otherBody.go.name);
}

//=========================================================
//                  UPDATES
//=========================================================

Player.prototype.updateRun = function(){
  this.entity.body.velocity.x = this.direction * this.speed;
}

Player.prototype.updateJump = function(){  
  //wait for the body to fall (according to gravity)
  //when this.fall is called, the state changes, so updateJump is not called anymore
  if( this.entity.body.velocity.y * this.gravity < 0){
    this.fall();
  }
}

//=========================================================
//                  KEY CALLBACKS
//=========================================================

Player.prototype.onMoveLeft = function(_key){
  this.isMovePressed = true;
  if( ! this.canMove ){
    return;
  }
  if( this.onGround ){
    this.run(-1);
  }else{
    this.runAir(-1,this.airSpeed)
  }
  this.scaleByGravity();
}

Player.prototype.onMoveRight = function(_key){
  this.isMovePressed = true;  
  if( ! this.canMove ){
    return;
  }
  if( this.onGround ){
    this.run(1);
  }else{
    this.runAir(1,this.airSpeed);
  }
  this.scaleByGravity();
}

Player.prototype.onMoveRelease = function(){
  this.isMovePressed = false;

  if( ! this.canMove )
    return;

  if( this.onGround ){
    this.idleize();
  }else{
    this.airSpeed = this.speed * 0.5;
  }
}

Player.prototype.onJump = function(_key){
  this.isJumpPressed = true;

  if( ! this.canJump )
    return;

  this.jump();
}

Player.prototype.onJumpRelease = function(_key){
  this.isJumpPressed = false;
  if( ! this.canJump )
    return;
}

Player.prototype.idleize = function(_key){
  this.idle();
  this.scaleByGravity();
}

//=========================================================
//                  EXTERNAL CALLBACKS
//=========================================================

Player.prototype.onActivatePower = function(_data){
  this.hair.activatePower(_data.power);
}

Player.prototype.onHang = function(){
  this.changeState("hanged");
  this.canMove = false;
  this.canJump = false;
  this.entity.body.setZeroVelocity();
}

Player.prototype.onReleaseHang = function(_gravity,_vector){
  this.changeState("jump");
  this.canMove = true;
  this.canJump = true;
  this.changeGravity( { "gravity":_gravity });
  this.entity.body.velocity.x = _vector.x * 220;
  this.entity.body.velocity.y = _vector.y * -150 - Math.abs(_vector.x) * 220;
}

Player.prototype.onCollectCoin = function(_data){
  var count = 1;
  if( _data.count ) count = _data.count;
  this.entity.game.playerSave["coins"] += count;
  this.entity.game.pollinator.dispatch("onCoinsChanged")
}

//=========================================================
//                  ACTIONS
//=========================================================

Player.prototype.idle = function(_direction){
  this.changeState("idle");
  if( _direction != null ) this.direction = _direction;

  this.entity.body.velocity.x = 0;
  //flip and play anim
  this.go.entity.scale.x = this.direction * this.gravity;
  this.scaleByGravity();

  this.entity.animations.play('idle');
  this.hair.idle();

  this.preBlink();
}

Player.prototype.fall = function(){
  this.changeState("fall");
  this.entity.play("fall");
  this.onGround = false;
}


Player.prototype.run = function(_direction, _speed ){
  this.changeState("run");
  if( _direction != null ) this.direction = _direction;
  if( _speed == null ) _speed = this.speed;
  
  //flip and play anim
  this.entity.animations.play('run');
  this.scaleByGravity();
  //play hair anim
  this.hair.run();

  this.entity.body.velocity.x = this.direction * _speed ;
}

Player.prototype.runAir = function(_direction, _speed ){

  if( _direction != null ) this.direction = _direction;
  if( _speed == null ) _speed = this.speed;
  
  this.entity.body.velocity.x = this.direction * _speed ;
}


Player.prototype.jump = function(_force, _jumpPower){
  if( this.onGround || _force == true){
    this.changeState("jump");
    this.onGround = false;
    //apply jump force
    if( _jumpPower != null)
      this.go.body.velocity.y = -_jumpPower * this.gravity;
    else
      this.go.body.velocity.y = -this.jumpPower * this.gravity;
    this.entity.animations.play('jump');
    this.scaleByGravity();
    //affect air moving speed
    this.airSpeed = this.isMovePressed ? this.speed : this.speed * 0.5;
  }
}

//=========================================================
//                  BLINK
//=========================================================

Player.prototype.preBlink = function(){
  //set a timer
  this.entity.game.time.events.add(
      Phaser.Timer.SECOND * 3, 
      this.onBlinkTimerEnded,
      this);
}

Player.prototype.onBlinkTimerEnded = function(){
  if( this.state == "idle"){
    this.entity.animations.play("blink");
    this.preBlink();
  }
}

//=========================================================
//                  DEATH
//=========================================================

Player.prototype.hit = function(_data){
  if( _data.shape !== this.mainShape)
    return;
  this.die();
}

Player.prototype.die = function(){
  if(this.dead == true)
    return;
  this.dead = true;
  this.onGround = false;
  //Enable all shapes to be sensors
  this.go.enableSensor();
  //Disable contact events
  this.enableEvents = false;

  this.entity.animations.play('dead', 10, true);
  this.go.body.moveUp(300);
  this.entity.game.camera.follow(null);

  //DEATH !!!
  if(this.lives == 0){
    //set a timer
    this.entity.game.time.events.add(
      Phaser.Timer.SECOND * 3, 
      function(){ this.entity.game.state.start("Level",true,false,{levelName: "menu_select_levels"});},
      this);
    return;
  }

  //Accounts
  this.lives --;
  this.entity.game.playerSave.getSave()["lives"] = this.lives;
  this.entity.game.pollinator.dispatch("onLivesChanged");

  //set a timer
    this.entity.game.time.events.add(
      Phaser.Timer.SECOND * 3, 
      function(){ this.respawn();},
      this);
}

Player.prototype.respawn = function(){
  //this.entity.game.pollinator.dispatch("onPlayerRespawn");
  this.hair.deactivatePower();
  this.entity.body.setZeroVelocity();
  this.mainShape.sensor = false;
  this.state = "jump";
  this.entity.game.camera.follow(this.entity);
  this.enableEvents = true;
  this.dead = false;
  //respawn
  this.direction = this.respawnDirection;
  this.go.setPosition( this.respawnPosition.x, this.respawnPosition.y);
  this.scaleByGravity();
}

//Called by a trigger finish (in general)
Player.prototype.finish = function(_data){  
  this.entity.animations.play('win', 10, true);
  this.enabled = false;
  //set a timer
  this.entity.game.time.events.add(
    Phaser.Timer.SECOND * 0.1, 
    function(){ this.entity.game.state.start("Level",true,false,{levelName: "menu_select_levels"});},
    this);
}

Player.prototype.checkpoint = function(_dataSent){
  this.respawnPosition = new Phaser.Point( _dataSent.sender.entity.x, _dataSent.sender.entity.y);
  if( _dataSent.direction )
    this.respawnDirection = _dataSent.direction;
  _dataSent.sender.entity.frame = 1;
}

//=========================================================
//                  GRAVITY
//=========================================================

// Change gravity. An object is passed as a parameter and contains the new gravity
Player.prototype.changeGravity = function(_data){
  if( ! this.isGravityAffected ){
    return;
  }
  //keep and apply gravity
  this.gravity = _data.gravity < 0 ? -1 : 1;
  this.go.gravity = _data.gravity;
  //rotate
  var angle = _data.gravity < 0 ? 180 : 0;
  this.entity.body.angle = angle;
  this.entity.angle = angle;
  //Scale
  this.scaleByGravity();
}

Player.prototype.scaleByGravity = function(){
  this.entity.scale.x = this.direction  * this.gravity;
}

//=========================================================
//                  STATES
//=========================================================

Player.prototype.changeState = function(_newState){
  this.lastState = this.state;
  this.state = _newState;
}

Player.prototype.isLayerGround = function( _layer ){
  return _layer == "ground" || _layer == "box";
}

Object.defineProperty( Player.prototype, "isGravityAffected",
  {
    get : function(){
      return this.state != "hanged";
    }
  }
);