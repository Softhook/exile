
let player;
let terrain = [];
let bullets = [];
let enemies = []; // Will hold different types of enemies
let pickups = [];
let exitPortal; // Single exit portal per level
let updrafts = [];
let enemyBullets = [];
let buttons = [];
let gates = [];


let cameraX = 0;
let cameraY = 0;

const GRAVITY = 0.08;
const THRUST_FORCE = 0.2;
const ROTATION_SPEED = 0.05;
const PLAYER_SPRITE_SIZE = 25; // Used for drawing the astronaut parts

// Game state variables
let score = 0;
let fuel = 1000;
let maxFuel = 1000;
let ammo = 20;
let maxAmmo = 20;
const THRUST_FUEL_COST = 0.75;
const SHOOT_AMMO_COST = 1;
const ENEMY_HIT_FUEL_LOSS = 50;
const ENEMY_BULLET_FUEL_LOSS = 30;
let gameRunning = true;
let gameWon = false;

const GRID_SIZE = 40; // Size of one cell in the level map

const levels = [
  [ // Level 1 Modified
    "XXXXXXXXXXXXXXXXXXXXXX",
    "X U                  X",
    "X P  E      T1     D1X", // Player, Enemy, Turret (ID1), Gate (ID1)
    "X XXXX   XXXX  XX  XX",
    "X   X    X  X  F   GX", // Exit portal moved for gate demo
    "X A X B1 X  X XXXX  X", // Button (ID1), Ammo
    "X XXXX XXXX X X H   X", // Shield pickup
    "X        S X X  E   X",
    "XXXXXXXXXXXXXXXXXXXXXX"
  ],
  [ // Level 2
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "X      U                    X",
    "X P                         X",
    "X XXXX     E      XXXXXX    X",
    "X        XXXX    X  T0  X   X", // Turret 0
    "X  E    X    S  X   D0  X E X", // Gate 0
    "X  XXXXXX  B0   X F  A X  XXXX", // Button 0
    "X  X    X     X      XXXX  EX",
    "X  X E  XXXXXXXXXXXXXXXXXXXXX",
    "X  X                        X",
    "X  XXXXXXXXXXXXXXXX       G X",
    "X                           X",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  ],
   [ // Level 3 - More verticality and tighter spaces
    "XXXXXXXXXXXXXXX",
    "XG            X",
    "XXXX XXXXXXXXXX",
    "X X         X X",
    "X X S F   E X X",
    "X XUXXXXXXXXX X",
    "X X         X X",
    "X X EXXXXXXXX X",
    "X X X T2    X X", // Turret 2
    "X X X A   D2X X", // Gate 2
    "X X XXXXXXX X X",
    "X     B2    X X", // Button 2
    "X XXXXXXXXXXX X",
    "X P           X",
    "XXXXXXXXXXXXXXX"
  ]
];
let currentLevelIndex = 0;


// --- Player Class ---
class Player {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.angle = -PI / 2; // Pointing upwards
        this.size = PLAYER_SPRITE_SIZE * 0.8; // Collision size
        this.spriteSize = PLAYER_SPRITE_SIZE; // Visual size
        this.isThrusting = false;
        this.onGround = false;
        this.lastHorizontalFacing = 1; // 1 for right, -1 for left
        this.shieldTimer = 0;
    }

    isShieldActive() {
        return this.shieldTimer > 0;
    }

    activateShield(duration) {
        this.shieldTimer = duration;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    thrust() {
        if (!gameRunning) return;
        let thrustVector = p5.Vector.fromAngle(this.angle);
        thrustVector.mult(THRUST_FORCE);
        this.applyForce(thrustVector);
        this.isThrusting = true;
    }

    rotate(delta) {
        if (!gameRunning) return;
        this.angle += delta;
        let currentHorizontalComponent = cos(this.angle);
        if (abs(currentHorizontalComponent) > 0.1) {
             this.lastHorizontalFacing = (currentHorizontalComponent > 0) ? 1 : -1;
        } else {
            let rightVecHorizontalComponent = cos(this.angle + PI/2);
            if (abs(rightVecHorizontalComponent) > 0.1) {
                 this.lastHorizontalFacing = (rightVecHorizontalComponent > 0) ? 1 : -1;
            }
        }
    }
    
    getBulletFireAngle() {
        return (this.lastHorizontalFacing > 0) ? 0 : PI;
    }


    update() {
        if (!gameRunning) return;
        this.applyForce(createVector(0, GRAVITY));
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);
        this.vel.mult(0.99);
        this.isThrusting = false;
        if (this.shieldTimer > 0) {
            this.shieldTimer--;
        }
    }

    collidesWith(block) { // Generic collision check, used for terrain, gates
        let targetX = block.x !== undefined ? block.x : block.pos.x;
        let targetY = block.y !== undefined ? block.y : block.pos.y;
        let targetW = block.w !== undefined ? block.w : block.size;
        let targetH = block.h !== undefined ? block.h : block.size;
        
        return (
            this.pos.x - this.size / 2 < targetX + targetW / 2 &&
            this.pos.x + this.size / 2 > targetX - targetW / 2 &&
            this.pos.y - this.size / 2 < targetY + targetH / 2 &&
            this.pos.y + this.size / 2 > targetY - targetH / 2
        );
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle + PI / 2); 
        
        let s = this.spriteSize;

        // Shield Effect
        if (this.isShieldActive()) {
            let shieldAlpha = map(sin(frameCount * 0.2), -1, 1, 30, 70);
            let shieldHue = (frameCount * 2) % 360;
            fill(shieldHue, 80, 100, shieldAlpha);
            noStroke();
            ellipse(0, 0, s * 1.5, s * 1.5);
        }

        // Jetpack
        fill(150, 80, 60); stroke(100, 70, 50); strokeWeight(1);
        rectMode(CENTER);
        rect(0, s * 0.15, s * 0.6, s * 0.7, s*0.1); 
        fill(120, 70, 70);
        rect(-s * 0.15, s * 0.5, s * 0.2, s * 0.25, s*0.05);
        rect(s * 0.15, s * 0.5, s * 0.2, s * 0.25, s*0.05);

        // Astronaut Body
        fill(220, 60, 100); stroke(200, 50, 80); strokeWeight(1.5);
        ellipse(0, 0, s * 0.55, s * 0.85);
        
        // Helmet
        fill(300, 20, 100); stroke(250, 30, 90);
        ellipse(0, -s * 0.35, s * 0.5, s * 0.5);
        fill(10, 80, 70, 50);
        ellipse(0, -s*0.35, s*0.4, s*0.4);

        if (this.isThrusting && fuel > 0) {
            let flameHue = frameCount % 10 < 5 ? 0 : 40;
            for (let i = -1; i <= 1; i += 2) {
                push();
                translate(i * s * 0.15, s * 0.55);
                fill(flameHue, 100, 100);
                triangle(-s * 0.08, 0, s * 0.08, 0, 0, s * 0.4 + random(-s*0.05, s*0.05));
                fill(flameHue + 20, 100, 100, 80);
                triangle(-s * 0.05, 0, s * 0.05, 0, 0, s * 0.3 + random(-s*0.03, s*0.03));
                pop();
            }
        }
        pop();
    }
}

// --- Terrain Block Class ---
class TerrainBlock {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.hue = random(200, 220); this.sat = random(5, 15); this.bri = random(30, 50);
    }
    draw() {
        push();
        rectMode(CENTER); fill(this.hue, this.sat, this.bri);
        stroke(this.hue, this.sat, this.bri - 15); strokeWeight(2);
        rect(this.x, this.y, this.w, this.h);
        pop();
    }
}

// --- Bullet Class ---
class Bullet {
    constructor(x, y, angle) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.fromAngle(angle);
        this.vel.mult(12); this.size = 8; this.lifespan = 180;
    }
    update() { this.pos.add(this.vel); this.lifespan--; }
    draw() {
        push(); fill(50, 100, 100); noStroke(); ellipse(this.pos.x, this.pos.y, this.size); pop();
    }
    isDead() { return (this.lifespan < 0); }
    hits(target) {
        if (target instanceof Enemy || target instanceof TurretEnemy) { // Check TurretEnemy too
            let d = dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
            return d < this.size / 2 + target.size / 2;
        } else if (target instanceof TerrainBlock || (target instanceof GateBlock && !target.isOpen)) {
             let targetX = target.x !== undefined ? target.x : target.pos.x;
            let targetY = target.y !== undefined ? target.y : target.pos.y;
            let targetW = target.w !== undefined ? target.w : target.size;
            let targetH = target.h !== undefined ? target.h : target.size;
            return (
                this.pos.x + this.size/2 > targetX - targetW / 2 &&
                this.pos.x - this.size/2 < targetX + targetW / 2 &&
                this.pos.y + this.size/2 > targetY - targetH / 2 &&
                this.pos.y - this.size/2 < targetY + targetH / 2
            );
        }
        return false;
    }
}

// --- EnemyBullet Class (fired by Turrets) ---
class EnemyBullet {
    constructor(x, y, targetPos) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.sub(targetPos, this.pos).normalize().mult(5); // Slower than player bullets
        this.size = 10;
        this.lifespan = 240; // Lasts a bit longer
        this.hue = 0; // Red
    }
    update() { this.pos.add(this.vel); this.lifespan--; }
    draw() {
        push(); fill(this.hue, 90, 90); stroke(this.hue, 90, 70); strokeWeight(1);
        ellipse(this.pos.x, this.pos.y, this.size); pop();
    }
    isDead() { return (this.lifespan < 0); }
    hits(target) { // Simplified, only checks player and terrain
        if (target instanceof Player) {
            let d = dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
            return d < this.size / 2 + target.size / 2;
        } else if (target instanceof TerrainBlock || (target instanceof GateBlock && !target.isOpen)) {
            let targetX = target.x !== undefined ? target.x : target.pos.x;
            let targetY = target.y !== undefined ? target.y : target.pos.y;
            let targetW = target.w !== undefined ? target.w : target.size;
            let targetH = target.h !== undefined ? target.h : target.size;
            return (
                this.pos.x + this.size/2 > targetX - targetW / 2 &&
                this.pos.x - this.size/2 < targetX + targetW / 2 &&
                this.pos.y + this.size/2 > targetY - targetH / 2 &&
                this.pos.y - this.size/2 < targetY + targetH / 2
            );
        }
        return false;
    }
}


// --- Base Enemy Class --- (Can be extended or used directly)
class Enemy {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(0.5, 1.5));
        this.size = random(25, 35);
        this.health = 3;
        this.baseHue = random(0, 30);
        this.hitTimer = 0;
        this.type = "chaser";
    }
    update(playerPos, _terrainObjects, _enemyBulletsRef) { // Add enemyBulletsRef for polymorphism
        this.pos.add(this.vel);
        if (this.hitTimer > 0) this.hitTimer--;
        let distToPlayer = dist(this.pos.x, this.pos.y, playerPos.x, playerPos.y);
        if (distToPlayer < 300 && distToPlayer > this.size) {
            let desired = p5.Vector.sub(playerPos, this.pos);
            desired.normalize(); desired.mult(0.1);
            this.vel.add(desired); this.vel.limit(1.8);
        }
        // Basic terrain collision for chaser enemy
        for (let block of terrain) { if (this.collidesWith(block)) { this.handleTerrainCollision(block);}}
        for (let gate of gates) { if (!gate.isOpen && this.collidesWith(gate)) { this.handleTerrainCollision(gate);}}

    }
    handleTerrainCollision(block){
        let dx = this.pos.x - (block.x || block.pos.x);
        let dy = this.pos.y - (block.y || block.pos.y);
        let combinedHalfWidths = this.size / 2 + (block.w || block.size) / 2;
        let combinedHalfHeights = this.size / 2 + (block.h || block.size) / 2;
        let overlapX = combinedHalfWidths - abs(dx);
        let overlapY = combinedHalfHeights - abs(dy);
        if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
                this.vel.x *= -0.8; this.pos.x += (dx > 0 ? overlapX : -overlapX) * 0.6;
            } else {
                this.vel.y *= -0.8; this.pos.y += (dy > 0 ? overlapY : -overlapY) * 0.6;
            }
        }
    }
    collidesWith(block) { // Generic collision for enemies
         let targetX = block.x !== undefined ? block.x : block.pos.x;
         let targetY = block.y !== undefined ? block.y : block.pos.y;
         let targetW = block.w !== undefined ? block.w : block.size; // Gates use .size
         let targetH = block.h !== undefined ? block.h : block.size; // Gates use .size
         return (
            this.pos.x - this.size / 2 < targetX + targetW / 2 &&
            this.pos.x + this.size / 2 > targetX - targetW / 2 &&
            this.pos.y - this.size / 2 < targetY + targetH / 2 &&
            this.pos.y + this.size / 2 > targetY - targetH / 2
        );
    }
    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        let currentHue = this.hitTimer > 0 ? (this.baseHue + 180) % 360 : this.baseHue;
        fill(currentHue, 80, 80 + (this.hitTimer > 0 ? 20 : 0));
        stroke(currentHue, 80, 60); strokeWeight(2);
        ellipse(0, 0, this.size);
        let eyeAngle = this.vel.heading();
        fill(0); noStroke();
        push(); rotate(eyeAngle); ellipse(this.size / 3, 0, this.size / 4, this.size/5); pop();
        pop();
    }
    takeDamage() { this.health--; this.hitTimer = 10; return this.health <= 0; }
}

// --- Turret Enemy Class ---
class TurretEnemy {
    constructor(x, y, id = 0) { // ID not used by turret itself yet, but good for consistency
        this.pos = createVector(x, y);
        this.size = GRID_SIZE * 0.8;
        this.health = 5;
        this.baseHue = 240; // Blueish
        this.hitTimer = 0;
        this.fireCooldown = 0;
        this.fireRate = 120; // Frames between shots
        this.range = GRID_SIZE * 7;
        this.angle = 0;
        this.type = "turret";
        this.id = id; // Store ID if needed later
    }

    update(playerPos, _terrainObjects, enemyBulletsRef) {
        if (this.hitTimer > 0) this.hitTimer--;
        this.fireCooldown = max(0, this.fireCooldown - 1);

        let distToPlayer = dist(this.pos.x, this.pos.y, playerPos.x, playerPos.y);
        if (distToPlayer < this.range) {
            this.angle = atan2(playerPos.y - this.pos.y, playerPos.x - this.pos.x);
            if (this.fireCooldown === 0) {
                enemyBulletsRef.push(new EnemyBullet(this.pos.x, this.pos.y, playerPos));
                this.fireCooldown = this.fireRate;
            }
        } else {
            this.angle += 0.005; // Slow idle rotation
        }
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        
        // Base
        let currentHue = this.hitTimer > 0 ? (this.baseHue + 180) % 360 : this.baseHue;
        fill(currentHue, 70, 60 - (this.hitTimer > 0 ? 10:0) );
        stroke(currentHue, 70, 40); strokeWeight(2);
        rectMode(CENTER);
        rect(0, this.size * 0.2, this.size, this.size * 0.6, 4); // Base

        // Turret Barrel
        rotate(this.angle);
        fill(currentHue, 80, 70 - (this.hitTimer > 0 ? 10:0));
        stroke(currentHue, 80, 50);
        rect(this.size * 0.4, 0, this.size * 0.8, this.size * 0.3, 3); // Barrel
        ellipse(0,0, this.size*0.5); // Central part
        pop();
    }
    takeDamage() { this.health--; this.hitTimer = 10; return this.health <= 0; }
    // Turrets don't have collidesWith for movement, they are static
    // But player bullets need to hit them using their .pos and .size
}


// --- Pickup Class ---
class Pickup {
    constructor(x, y, type = "fuel") {
        this.pos = createVector(x, y);
        this.size = 18; this.type = type;
        this.baseHue = (type === "fuel") ? 120 : (type === "ammo" ? 200 : (type === "shield" ? 180 : 50));
        this.collected = false; this.bobOffset = random(TWO_PI);
    }
    draw() {
        if (this.collected) return;
        push();
        let bobAmount = sin(frameCount * 0.05 + this.bobOffset) * 3;
        translate(this.pos.x, this.pos.y + bobAmount);
        let saturation = 90 + sin(frameCount * 0.1 + this.bobOffset) * 10;
        fill(this.baseHue, saturation, 90);
        stroke(0,0,20, 80); strokeWeight(1.5); rectMode(CENTER);
        if (this.type === "fuel") {
            ellipse(0,0, this.size * 0.8, this.size * 1.2);
            fill(this.baseHue, saturation, 70); rect(0, -this.size*0.3, this.size*0.5, this.size*0.1);
        } else if (this.type === "ammo") {
            rect(0,0, this.size, this.size, 3);
            fill(this.baseHue, saturation, 70); ellipse(0,0, this.size*0.4, this.size*0.4);
        } else if (this.type === "shield") {
            // Draw a shield icon
            beginShape();
            vertex(0, -this.size * 0.6);
            bezierVertex(-this.size*0.8, -this.size*0.3, -this.size*0.5, this.size*0.5, 0, this.size*0.6);
            bezierVertex(this.size*0.5, this.size*0.5, this.size*0.8, -this.size*0.3, 0, -this.size*0.6);
            endShape(CLOSE);
             fill(this.baseHue, saturation-20, 80);
             ellipse(0,0,this.size*0.5, this.size*0.5);
        } else { // Score
            translate(0, -2); beginShape();
            for (let i = 0; i < 5; i++) {
                let angle = TWO_PI * i / 5 - HALF_PI;
                let x = cos(angle) * this.size / 1.8; let y = sin(angle) * this.size / 1.8; vertex(x, y);
                angle += TWO_PI / 10;
                x = cos(angle) * this.size / 3.6; y = sin(angle) * this.size / 3.6; vertex(x, y);
            } endShape(CLOSE);
        }
        pop();
    }
    checkCollision(player) {
        if (this.collected) return false;
        let d = dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y);
        if (d < this.size / 2 + player.size / 2) {
            this.collected = true; return true;
        } return false;
    }
}

// --- ExitPortal Class ---
class ExitPortal {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.size = GRID_SIZE * 0.7; this.collisionSize = GRID_SIZE * 0.5; this.angle = 0;
    }
    draw() {
        push();
        translate(this.pos.x, this.pos.y); this.angle += 0.03;
        for (let i = 0; i < 6; i++) {
            push(); rotate(this.angle + i * TWO_PI / 6);
            let hue = (frameCount * 1.5 + i * 60) % 360;
            let alpha = map(sin(frameCount * 0.05 + i * PI / 3), -1, 1, 30, 90);
            let eW = this.size * (0.5 + 0.5 * sin(frameCount * 0.02 + i * PI/2.5));
            let eH = this.size * (0.5 + 0.5 * cos(frameCount * 0.02 + i * PI/2.5));
            fill(hue, 90, 100, alpha); noStroke(); ellipse(0, 0, eW, eH); pop();
        }
        fill(0,0,100, 50 + 30 * sin(frameCount*0.1)); ellipse(0,0, this.size*0.3);
        pop();
    }
    checkCollision(player) {
        let d = dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y);
        return d < this.collisionSize / 2 + player.size / 2;
    }
}

// --- Updraft Class ---
class Updraft {
    constructor(x, y, w, h, strength) {
        this.pos = createVector(x, y);
        this.w = w; this.h = h;
        this.strength = strength;
        this.particles = [];
        for(let i=0; i < 20; i++) {
            this.particles.push({
                x: random(-this.w/2, this.w/2),
                y: random(this.h),
                size: random(2,5)
            });
        }
    }

    applyEffect(player) {
        if (player.pos.x > this.pos.x - this.w / 2 && player.pos.x < this.pos.x + this.w / 2 &&
            player.pos.y > this.pos.y - this.h / 2 && player.pos.y < this.pos.y + this.h / 2) {
            player.applyForce(createVector(0, -this.strength));
        }
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        noStroke();
        // Draw particles
        for(let p of this.particles) {
            p.y -= this.strength * 15; // Move particles up
            if (p.y < -this.h/2) {
                p.y = this.h/2; // Reset particle to bottom
                p.x = random(-this.w/2, this.w/2);
            }
            fill(180, 50, 100, map(p.y, this.h/2, -this.h/2, 0, 60)); // Fade out at top
            ellipse(p.x, p.y, p.size, p.size*2);
        }
        pop();
    }
}

// --- Button Class ---
class ButtonObject {
    constructor(x,y, id) {
        this.pos = createVector(x,y);
        this.size = GRID_SIZE * 0.8;
        this.id = id;
        this.isPressed = false;
        this.heightOffset = 0; // For visual press effect
    }

    update(player) {
        if (!this.isPressed) {
            const playerCX = player.pos.x;
            const playerHalfSize = player.size / 2;
            const playerFeetY = player.pos.y + playerHalfSize;

            // Calculate the current top Y position of the button's pressable plate
            // Plate center Y without offset: this.pos.y - this.size * 0.25
            // Plate half height: (this.size * 0.3) / 2
            const plateTopActualY = (this.pos.y - this.size * 0.25) - (this.size * 0.3 / 2) + this.heightOffset;
            const plateHalfW = (this.size * 0.9) / 2; // Plate is slightly narrower than button base
            
            // Check for horizontal overlap between player and the button's plate
            const overlapsX = abs(playerCX - this.pos.x) < (playerHalfSize + plateHalfW);

            if (overlapsX) {
                // Check vertical condition: player's feet should be on or very near the plate's top surface
                const verticalProximity = abs(playerFeetY - plateTopActualY);
                
                // Tolerance: player's feet can be slightly above or sink slightly into/past the button's top surface
                const pressTolerance = player.size * 0.25; // Increased tolerance slightly

                // Player should be generally moving downwards, stationary, or only slightly upwards
                // to prevent pressing while flying far above or rapidly away.
                if (verticalProximity < pressTolerance && player.vel.y > -0.8) { 
                    this.isPressed = true;
                }
            }
        }
        // Visual feedback for press
        this.heightOffset = lerp(this.heightOffset, this.isPressed ? this.size * 0.2 : 0, 0.2);
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        // Base
        fill(100, 10, 40); noStroke();
        rectMode(CENTER);
        rect(0, this.size * 0.1, this.size, this.size * 0.8, 3); 

        // Plate
        fill(this.isPressed ? 20 : 40, 80, 70);
        stroke(0,0,20); strokeWeight(1);
        rect(0, -this.size*0.25 + this.heightOffset, this.size * 0.9, this.size * 0.3, 3);
        pop();
    }

    reset() { 
        this.isPressed = false;
        this.heightOffset = 0;
    }
}

// --- Gate Class ---
class GateBlock {
    constructor(x,y,w,h,id) {
        this.pos = createVector(x,y);
        this.w = w; this.h = h; 
        this.id = id;
        this.isOpen = false;
        this.visualOpenness = 0; // For animation
    }

    update(buttonsList) {
        let linkedButtonPressed = false;
        for(let btn of buttonsList) {
            if (btn.id === this.id && btn.isPressed) {
                linkedButtonPressed = true;
                break;
            }
        }
        this.isOpen = linkedButtonPressed;
        this.visualOpenness = lerp(this.visualOpenness, this.isOpen ? 1 : 0, 0.1);
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        rectMode(CENTER);
        
        let gateColorHue = this.isOpen ? 120 : 0; 
        let gateBrightness = this.isOpen ? 70 : 50;

        fill(gateColorHue, 60, gateBrightness);
        stroke(gateColorHue, 60, gateBrightness - 20);
        strokeWeight(2);

        let currentHeight = this.h * (1 - this.visualOpenness);
        let yOffset = -this.h * this.visualOpenness / 2;

        if (currentHeight > 1) { 
             rect(0, yOffset, this.w, currentHeight);
        }
        
        fill(0,0,30); noStroke();
        rect(0, -this.h/2 - 2.5, this.w + 5, 5); 
        rect(0,  this.h/2 + 2.5, this.w + 5, 5); 


        pop();
    }
}


function loadLevel(levelIdx) {
    if (levelIdx >= levels.length) {
        gameWon = true; gameRunning = false; return;
    }

    terrain = []; bullets = []; enemies = []; pickups = []; exitPortal = null;
    updrafts = []; enemyBullets = []; buttons = []; gates = [];

    let levelData = levels[levelIdx];
    for (let r = 0; r < levelData.length; r++) {
        for (let c = 0; c < levelData[r].length; c++) {
            let char = levelData[r][c];
            let x = c * GRID_SIZE + GRID_SIZE / 2;
            let y = r * GRID_SIZE + GRID_SIZE / 2;

            if (char === 'X') {
                terrain.push(new TerrainBlock(x, y, GRID_SIZE, GRID_SIZE));
            } else if (char === 'P') {
                player.pos.set(x, y); player.vel.set(0, 0); player.angle = -PI / 2;
                player.lastHorizontalFacing = 1; player.shieldTimer = 0;
            } else if (char === 'E') {
                enemies.push(new Enemy(x, y));
            } else if (char === 'F') {
                pickups.push(new Pickup(x, y, "fuel"));
            } else if (char === 'A') {
                pickups.push(new Pickup(x, y, "ammo"));
            } else if (char === 'S') {
                pickups.push(new Pickup(x, y, "score"));
            } else if (char === 'H') {
                pickups.push(new Pickup(x,y, "shield"));
            } else if (char === 'G') {
                exitPortal = new ExitPortal(x, y);
            } else if (char === 'U') {
                updrafts.push(new Updraft(x, y, GRID_SIZE, GRID_SIZE * 3, GRAVITY * 2.5)); 
            } else if (char === 'T') {
                let id = parseInt(levelData[r][c+1]); c++; 
                enemies.push(new TurretEnemy(x,y, id));
            } else if (char === 'B') {
                let id = parseInt(levelData[r][c+1]); c++; 
                buttons.push(new ButtonObject(x,y,id));
            } else if (char === 'D') {
                let id = parseInt(levelData[r][c+1]); c++; 
                gates.push(new GateBlock(x,y,GRID_SIZE, GRID_SIZE, id));
            }
        }
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 100);
    player = new Player(0,0);
    loadLevel(currentLevelIndex);
    gameRunning = true; gameWon = false;
}

function handleInput() {
    if (!gameRunning) return;
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { player.rotate(-ROTATION_SPEED); }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { player.rotate(ROTATION_SPEED); }
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
        if (fuel > 0) { player.thrust(); fuel -= THRUST_FUEL_COST; if (fuel < 0) fuel = 0; }
    }
}

function keyPressed() {
    if (!gameRunning && !gameWon) { if (keyCode === 82) { restartGame(); } return; }
    if (gameWon) { if (keyCode === 82) { restartGame(); } return; }
    if (keyCode === 32) { // Spacebar
        if (ammo > 0) {
            let bulletAngle = player.getBulletFireAngle();
            let offsetDistance = player.spriteSize * 0.5;
            let bulletStartX = player.pos.x + cos(bulletAngle) * offsetDistance;
            let bulletStartY = player.pos.y + sin(bulletAngle) * offsetDistance;
            bullets.push(new Bullet(bulletStartX, bulletStartY, bulletAngle));
            ammo -= SHOOT_AMMO_COST;
        }
    }
}

function handlePlayerCollisions() {
    player.onGround = false;
    let collidables = [...terrain];
    for(let gate of gates) {
        if(!gate.isOpen) collidables.push(gate);
    }

    for (let block of collidables) {
        if (player.collidesWith(block)) {
            let blockX = block.x !== undefined ? block.x : block.pos.x;
            let blockY = block.y !== undefined ? block.y : block.pos.y;
            let blockW = block.w !== undefined ? block.w : GRID_SIZE; 
            let blockH = block.h !== undefined ? block.h : GRID_SIZE;


            let dx = player.pos.x - blockX;
            let dy = player.pos.y - blockY;
            let combinedHalfWidths = player.size / 2 + blockW / 2;
            let combinedHalfHeights = player.size / 2 + blockH / 2;
            let overlapX = combinedHalfWidths - abs(dx);
            let overlapY = combinedHalfHeights - abs(dy);

            if (overlapX > 0 && overlapY > 0) {
                let collisionDamping = 0.3;
                if (overlapX < overlapY) {
                    player.pos.x += (dx > 0 ? overlapX : -overlapX) * 1.01;
                    player.vel.x *= -collisionDamping;
                } else {
                    player.pos.y += (dy > 0 ? overlapY : -overlapY) * 1.01;
                    if (player.vel.y > 0 && dy < 0) player.onGround = true; 
                    player.vel.y *= -collisionDamping;
                }
                 if (player.collidesWith(block)) { 
                    player.pos.add(p5.Vector.random2D().mult(0.2));
                }
            }
        }
    }
}

function restartGame() {
    score = 0; fuel = maxFuel; ammo = maxAmmo;
    currentLevelIndex = 0; gameWon = false;
    loadLevel(currentLevelIndex); // This will also reset buttons via their constructor and GateBlock.isOpen
    // Reset buttons explicitly if they persist across loads (they don't currently)
    // buttons.forEach(b => b.reset()); 
    // gates.forEach(g => { g.isOpen = false; g.visualOpenness = 0; });

    gameRunning = true;
    loop();
}


function draw() {
    background(230, 50, 10);

    if (gameRunning) {
        handleInput();
        player.update();

        for (let updraft of updrafts) { updraft.applyEffect(player); }
        for (let button of buttons) { button.update(player); }
        for (let gate of gates) { gate.update(buttons); }
        
        handlePlayerCollisions();


        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].update();
            let hitSomething = false;
            let collidableTerrain = [...terrain];
            gates.forEach(g => { if(!g.isOpen) collidableTerrain.push(g); });

            for (let block of collidableTerrain) { if (bullets[i].hits(block)) { bullets.splice(i, 1); hitSomething = true; break; } }
            if (hitSomething) continue;

            for (let j = enemies.length - 1; j >= 0; j--) {
                if (bullets[i] && bullets[i].hits(enemies[j])) {
                    if (enemies[j].takeDamage()) { enemies.splice(j, 1); score += (enemies[j].type === "turret" ? 150 : 100); }
                    bullets.splice(i, 1); hitSomething = true; break;
                }
            }
            if (hitSomething) continue;
            if (bullets[i] && bullets[i].isDead()) { bullets.splice(i, 1); }
        }

        for (let i = enemyBullets.length -1; i >= 0; i--) {
            enemyBullets[i].update();
            let hitSomething = false;
            let collidableTerrain = [...terrain];
            gates.forEach(g => { if(!g.isOpen) collidableTerrain.push(g); });

            for (let block of collidableTerrain) { if (enemyBullets[i].hits(block)) { enemyBullets.splice(i, 1); hitSomething = true; break; } }
            if (hitSomething) continue;

            if (enemyBullets[i].hits(player)) {
                if (!player.isShieldActive()) {
                    fuel = max(0, fuel - ENEMY_BULLET_FUEL_LOSS);
                }
                let knockbackDir = p5.Vector.sub(player.pos, enemyBullets[i].pos).normalize();
                player.applyForce(knockbackDir.mult(2));

                enemyBullets.splice(i,1);
                hitSomething = true;
            }
            if (hitSomething) continue;
            if (enemyBullets[i].isDead()) { enemyBullets.splice(i,1); }
        }


        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update(player.pos, terrain, enemyBullets); 
            let d = dist(player.pos.x, player.pos.y, enemies[i].pos.x, enemies[i].pos.y);
            if (d < player.size / 2 + enemies[i].size / 2) { 
                if (!player.isShieldActive()) {
                    let knockback = p5.Vector.sub(player.pos, enemies[i].pos);
                    knockback.setMag(6);
                    player.applyForce(knockback);
                    player.vel.add(knockback.mult(0.25));
                    fuel = max(0, fuel - ENEMY_HIT_FUEL_LOSS);
                } else { 
                     let knockback = p5.Vector.sub(enemies[i].pos, player.pos);
                     knockback.setMag(3);
                     enemies[i].vel.add(knockback);
                }
            }
        }

        for (let i = pickups.length - 1; i >= 0; i--) {
            if (pickups[i].checkCollision(player)) {
                if (pickups[i].type === "fuel") fuel = min(fuel + 350, maxFuel);
                else if (pickups[i].type === "ammo") ammo = min(ammo + 8, maxAmmo);
                else if (pickups[i].type === "score") score += 50;
                else if (pickups[i].type === "shield") player.activateShield(300); 
                pickups.splice(i, 1);
            }
        }
        
        if (exitPortal && exitPortal.checkCollision(player)) {
            currentLevelIndex++;
            loadLevel(currentLevelIndex); 
        }


        if (fuel <= 0 && !player.onGround && player.vel.y > 0.01) { 
            gameRunning = false;
        } else if (fuel <=0 && player.onGround) { 
             gameRunning = false;
        }
    }

    let targetCameraX = -player.pos.x + width / 2;
    let targetCameraY = -player.pos.y + height / 2;
    cameraX = lerp(cameraX, targetCameraX, 0.08);
    cameraY = lerp(cameraY, targetCameraY, 0.08);

    push();
    translate(cameraX, cameraY);
    for (let updraft of updrafts) updraft.draw();
    for (let block of terrain) block.draw();
    for (let gate of gates) gate.draw();
    if(exitPortal) exitPortal.draw();
    for (let pickup of pickups) pickup.draw();
    for (let button of buttons) button.draw();
    for (let bullet of bullets) bullet.draw();
    for (let eb of enemyBullets) eb.draw();
    for (let enemy of enemies) enemy.draw();
    player.draw();
    pop();

    // UI Drawing
    let barWidth = 180; let barHeight = 22;
    fill(0,0,10, 70); rect(15, 15, barWidth + 10, barHeight + 10, 5);
    fill(0,0,0, 50); rect(20, 20, barWidth, barHeight,3);
    let fuelColorHue = map(fuel, 0, maxFuel, 0, 120);
    fill(fuelColorHue, 100, 80); rect(20, 20, map(fuel, 0, maxFuel, 0, barWidth), barHeight,3);
    fill(0,0,100); textSize(15); textAlign(LEFT, CENTER); textStyle(BOLD);
    text("FUEL", 20 + barWidth + 15, 20 + barHeight / 2);

    fill(0,0,10, 70); rect(15, 55, barWidth + 10, barHeight + 10, 5); 
    fill(0,0,100); text("AMMO: " + ammo + "/" + maxAmmo, 25, 55 + (barHeight+10)/2 -2);

    fill(0,0,10, 70); rect(15, 95, barWidth + 10, barHeight + 10, 5); 
    fill(0,0,100); text("SCORE: " + score, 25, 95 + (barHeight+10)/2 -2);
    
    fill(0,0,100);
    text("LVL: " + (currentLevelIndex + 1) + "/" + levels.length, width - 100, 30); 
    if(player.isShieldActive()){
        fill(180, 80, 100);
        text("SHIELD: " + floor(player.shieldTimer/60)+ "s", width -100, 60);
    }
    textStyle(NORMAL);


    if (!gameRunning) {
        fill(0, 0, 0, 70); rect(0,0,width,height);
        textAlign(CENTER, CENTER); textStyle(BOLD);
        if (gameWon) {
            textSize(60); fill(60, 100, 100);
            text("YOU WIN!", width / 2, height / 2 - 40);
        } else {
            textSize(60); fill(0, 80, 90);
            text("GAME OVER", width / 2, height / 2 - 40);
        }
        textSize(28); fill(0,0,100);
        text("Final Score: " + score, width/2, height/2 + 20);
        text("Press 'R' to Restart", width / 2, height / 2 + 70);
        textStyle(NORMAL);
        noLoop();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

