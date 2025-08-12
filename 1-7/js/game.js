// js/game.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const continueButton = document.getElementById('continueButton');
const restartButton = document.getElementById('restartButton');

const controlsDiv = document.getElementById('controls');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const jumpButton = document.getElementById('jumpButton');

const stageClearScreen = document.getElementById('stageClearScreen');
const nextStageButton = document.getElementById('nextStageButton');
const restartFromClearButton = document.getElementById('restartFromClearButton');

const pauseButton = document.getElementById('pauseButton');
const pauseScreen = document.getElementById('pauseScreen');
const resumeButton = document.getElementById('resumeButton');
const restartFromPauseButton = document.getElementById('restartFromPauseButton');

canvas.width = 500;
canvas.height = 500;

// ====================================================================
// ゲームの状態変数
// ====================================================================
let gameRunning = false;
let isGamePaused = false;
let score = 0;
let lives = 3;
let continueCount = 3;
let backgroundX = 0;
const backgroundScrollSpeed = 100; // ピクセル/秒 に調整
let gameSpeed = 1.5; // 強制スクロールの速さ (ステージによって変更される倍率)

let lastEnemySpawnTime = 0;
const enemySpawnInterval = 1500;

let lastItemSpawnTime = 0;
const itemSpawnInterval = 5000;

let isGamePausedForDamage = false;
let damagePauseTimer = 0;
const DAMAGE_PAUSE_DURATION = 150;

let currentStage = 3; // 初期ステージを3に設定 (以前のステージ1に相当)
const MAX_STAGES = 4; // 最大ステージ数を4に設定 (以前のステージ2に相当)
let isStageClearItemSpawned = false;

// ステージ4専用の状態変数
let largeEnemySpawnedInStage4 = false;
let bossEnemyInstance = null;
let bossSpawnProgress = 0; // Milliseconds, tracks time for boss spawn
const BOSS_SPAWN_DELAY = 5000; // 5 seconds

// <<< 追加: ボス戦の調整用定数
const BOSS_BEAM_LENGTH = 450; // (この定数は使わなくなりました)
const REFLECTION_ITEM_SPAWN_INTERVAL = 15000; // 反射アイテムの再出現間隔 (15秒)
let reflectionItemSpawnTimer = 0;

// ====================================================================
// オーディオ関連
// ====================================================================
const bgm = document.getElementById('bgm');
const bgmStage2 = document.getElementById('bgmStage2'); // Stage 4 BGMとして使用
const jumpSound = document.getElementById('jumpSound');
const hitSound = document.getElementById('hitSound');
const enemyHitSound = document.getElementById('enemyHitSound');
const collectItemSound = document.getElementById('collectItemSound');
const blockHitSound = document.getElementById('blockHitSound');
const stageClearSound = document.getElementById('stageClearSound');
const shootSound = document.getElementById('shootSound');
const bombDropSound = document.getElementById('bombDropSound');

// <<< 追加: 新しい効果音
const fireballSound = document.getElementById('fireballSound');
const beamChargeSound = document.getElementById('beamChargeSound');
const beamSound = document.getElementById('beamSound');
const reflectSound = document.getElementById('reflectSound');


function playSound(audioElement) {
    if (audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(e => console.warn("Audio play error:", e));
    }
}

function stopBGM() {
    bgm.pause();
    bgm.currentTime = 0;
    bgmStage2.pause();
    bgmStage2.currentTime = 0;
}

function playBGMForCurrentStage() {
    if (isGamePaused) {
        stopBGM();
        return;
    }
    stopBGM();
    if (currentStage === 3) { // ステージ3のBGM
        bgm.play().catch(e => console.warn("BGM play error:", e));
    } else if (currentStage === 4) { // ステージ4のBGM
        bgmStage2.play().catch(e => console.warn("Stage 4 BGM play error:", e));
    }
}

// ====================================================================
// アセットの読み込み
// ====================================================================
const assets = {
    playerRun: { img: new Image(), src: 'assets/images/player_run.png' },
    playerJump: { img: new Image(), src: 'assets/images/player_jump.png' },
    enemy: { img: new Image(), src: 'assets/images/enemy.png' }, // enemy.pngをスプライトシートとして使用
    flyingEnemy: { img: new Image(), src: 'assets/images/flying_enemy.png' },
    groundEnemy2: { img: new Image(), src: 'assets/images/ground_enemy.png' },
    stage2Enemy: { img: new Image(), src: 'assets/images/stage2_enemy.png' }, // ステージ2/4の敵、ボス画像
    bombDropper: { img: new Image(), src: 'assets/images/bomb_dropper.png' },
    bomb: { img: new Image(), src: 'assets/images/bomb.png' }, // Bomb クラスで使用される画像
    block: { img: new Image(), src: 'assets/images/block.png' },
    breakableBlock: { img: new Image(), src: 'assets/images/breakable_block.png' },
    healthItem: { img: new Image(), src: 'assets/images/health_item.png' },
    invincibilityItem: { img: new Image(), src: 'assets/images/invincibility_item.png' },
    stageClearItem: { img: new Image(), src: 'assets/images/stage_clear_item.png' },
    background: { img: new Image(), src: 'assets/images/background.png' }, // Stage 3 BGM
    backgroundStage2: { img: new Image(), src: 'assets/images/background_stage2.png' }, // Stage 4 BGM
    shootItem: { img: new Image(), src: 'assets/images/shoot_item.png' },
    playerProjectile: { img: new Image(), src: 'assets/images/player_projectile.png' },
    fireball: { img: new Image(), src: 'assets/images/fireball.png' },
    reflectionItem: { img: new Image(), src: 'assets/images/reflection_item.png' },
    beamCharge: { img: new Image(), src: 'assets/images/beam_charge.png' },
    beam: { img: new Image(), src: 'assets/images/beam.png' },
};

let assetsLoadedCount = 0;
const totalAssets = Object.keys(assets).length;
let assetsLoadErrors = [];

function loadAssets() {
    return new Promise((resolve) => {
        for (const key in assets) {
            const asset = assets[key];
            asset.img.onload = () => {
                assetsLoadedCount++;
                console.log(`Loaded: ${asset.src} (${assetsLoadedCount}/${totalAssets})`);
                if (assetsLoadedCount === totalAssets) {
                    if (assetsLoadErrors.length === 0) {
                        resolve();
                    } else {
                        console.error("Some assets failed to load:", assetsLoadErrors);
                        resolve();
                    }
                }
            };
            asset.img.onerror = (e) => {
                console.error(`Failed to load asset: ${asset.src}`, e);
                assetsLoadErrors.push(asset.src);
                assetsLoadedCount++;
                if (assetsLoadedCount === totalAssets) {
                    if (assetsLoadErrors.length === 0) {
                        resolve();
                    } else {
                        console.error("Some assets failed to load:", assetsLoadErrors);
                        resolve();
                    }
                }
            };
            asset.img.src = asset.src;
        }
    });
}

// ====================================================================
// プレイヤーオブジェクト
// ====================================================================
const player = {
    x: 100,
    y: canvas.height - 50 - 50,
    width: 50,
    height: 50,
    velocityY: 0,
    isJumping: false,
    jumpCount: 0,
    maxJumpCount: 2,
    speedX: 0,
    maxSpeedX: 250,
    gravity: 1.2,
    jumpStrength: -550,

    currentFrame: 0,
    frameCounter: 0,
    animationSpeed: 5,
    maxRunFrames: 6,
    maxJumpFrames: 1,
    frameWidth: 32,
    frameHeight: 32,

    isInvincible: false,
    invincibleTimer: 0,
    invincibleDuration: 3000,
    blinkTimer: 0,
    blinkInterval: 50,

    canShoot: false,
    shootCooldown: 0,
    maxShootCooldown: 300,
    projectileSpeed: 500,
    projectileDamage: 50,

    canReflect: false,
    reflectionTimer: 0,
    reflectionDuration: 10000,

    draw() {
        if (this.isInvincible && Math.floor(this.blinkTimer / this.blinkInterval) % 2 === 0) {
            return;
        }
        
        if (this.canReflect) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width, 0, Math.PI * 2);
            ctx.fill();
        }

        let currentImage = assets.playerRun.img;
        let sx = 0;

        if (this.isJumping) {
            currentImage = assets.playerJump.img;
            sx = this.currentFrame * this.frameWidth;
        } else {
            currentImage = assets.playerRun.img;
            if (this.speedX === 0) {
                sx = 0;
            } else {
                sx = this.currentFrame * this.frameWidth;
            }
        }

        if (currentImage.complete && currentImage.naturalHeight !== 0) {
            ctx.drawImage(currentImage,
                          sx, 0,
                          this.frameWidth, this.frameHeight,
                          this.x, this.y,
                          this.width, this.height);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    },

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }

        if (this.canReflect) {
            this.reflectionTimer -= deltaTime;
            if (this.reflectionTimer <= 0) {
                this.canReflect = false;
            }
        }

        this.x += this.speedX * deltaTime / 1000;
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        this.y += this.velocityY * deltaTime / 1000;
        this.velocityY += this.gravity * deltaTime;

        let onGround = false;
        const groundLevel = canvas.height - this.height;

        for (const block of blocks) {
            if (checkCollision(this, block) && this.velocityY >= 0) {
                if (this.y + this.height - (this.velocityY * deltaTime / 1000) <= block.y) {
                    this.y = block.y - this.height;
                    this.velocityY = 0;
                    this.isJumping = false;
                    this.jumpCount = this.maxJumpCount;
                    onGround = true;

                    if (block instanceof MovingPlatform) {
                        this.y += block.moveDirectionY * block.moveSpeedY * deltaTime / 1000;
                    }
                    break;
                }
            }
        }

        if (this.y >= groundLevel && !onGround) {
            this.y = groundLevel;
            this.velocityY = 0;
            this.isJumping = false;
            this.jumpCount = this.maxJumpCount;
            onGround = true;
        }

        if (this.isInvincible) {
            this.invincibleTimer -= deltaTime;
            this.blinkTimer += deltaTime;
            if (this.blinkTimer >= this.blinkInterval * 2) {
                this.blinkTimer = 0;
            }
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
                this.invincibleTimer = 0;
                this.blinkTimer = 0;
            }
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }

        this.frameCounter++;
        if (this.frameCounter >= this.animationSpeed) {
            this.frameCounter = 0;
            if (this.isJumping) {
                this.currentFrame = (this.currentFrame + 1) % this.maxJumpFrames;
            } else if (this.speedX !== 0) {
                this.currentFrame = (this.currentFrame + 1) % this.maxRunFrames;
            } else {
                this.currentFrame = 0;
            }
        }
    },

    jump() {
        if (this.jumpCount > 0) {
            this.velocityY = this.jumpStrength;
            this.isJumping = true;
            this.jumpCount--;
            playSound(jumpSound);
            this.currentFrame = 0;
        }
    },

    takeDamage() {
        if (this.isInvincible) return;

        lives--;
        playSound(hitSound);
        updateUI();
        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;
        this.blinkTimer = 0;
        this.canShoot = false;

        isGamePausedForDamage = true;
        damagePauseTimer = DAMAGE_PAUSE_DURATION;

        if (lives <= 0) {
            gameOver();
        }
    },

    heal() {
        if (lives < 3) {
            lives++;
            playSound(collectItemSound);
            updateUI();
        }
    },

    gainInvincibility() {
        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;
        this.blinkTimer = 0;
        playSound(collectItemSound);
    },
    
    gainReflection() {
        this.canReflect = true;
        this.reflectionTimer = this.reflectionDuration;
        playSound(collectItemSound);
    },

    gainShootAbility() {
        this.canShoot = true;
        this.shootCooldown = 0;
        playSound(collectItemSound);
    },

    shoot() {
        if (this.canShoot && this.shootCooldown <= 0) {
            const projectileWidth = 20;
            const projectileHeight = 20;
            const projectileX = this.x + this.width;
            const projectileY = this.y + this.height / 2 - projectileHeight / 2;
            projectiles.push(new Projectile(projectileX, projectileY, projectileWidth, projectileHeight, this.projectileSpeed, this.projectileDamage, assets.playerProjectile.img));
            playSound(shootSound);
            this.shootCooldown = this.maxShootCooldown;
        }
    }
};

// ====================================================================
// 敵オブジェクト基底クラス
// ====================================================================
class Enemy {
    constructor(x, y, width, height, speed, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.initialHeight = height;
        this.speed = speed;
        this.image = image;
        this.active = true;
        this.isStomped = false;
        this.stompedTimer = 0;
        this.stompedDuration = 200;
        this.squishFactor = 0.2;
        this.frameWidth = 60;
        this.frameHeight = 60;
        this.maxFrames = 4;
        this.currentFrame = 0;
        this.frameCounter = 0;
        this.animationSpeed = 10;
    }

    draw() {
        if (!this.active) return;

        let currentHeight = this.height;
        let currentY = this.y;
        let currentImage = this.image;
        let sx = 0;

        if (this.isStomped) {
            currentHeight = this.initialHeight * this.squishFactor;
            currentY = this.y + (this.initialHeight - currentHeight);
            sx = 0;
        } else {
            sx = this.currentFrame * this.frameWidth;
        }

        if (currentImage.complete && currentImage.naturalHeight !== 0) {
            ctx.drawImage(currentImage,
                          sx, 0,
                          this.frameWidth, this.frameHeight,
                          this.x, currentY,
                          this.width, currentHeight);
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x, currentY, this.width, currentHeight);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        if (this.isStomped) {
            this.stompedTimer -= deltaTime;
            if (this.stompedTimer <= 0) {
                this.active = false;
            }
        } else {
            this.x -= this.speed * gameSpeed * deltaTime / 1000;
            if (this.x + this.width < 0) {
                this.active = false;
            }

            this.frameCounter++;
            if (this.frameCounter >= this.animationSpeed) {
                this.frameCounter = 0;
                this.currentFrame = (this.currentFrame + 1) % this.maxFrames;
            }
        }
    }
}

// ====================================================================
// 飛行する敵クラス
// ====================================================================
class FlyingEnemy extends Enemy {
    constructor(x, y, width, height, speed, amplitude, frequency) {
        super(x, y, width, height, speed, assets.flyingEnemy.img);
        this.startY = y;
        this.amplitude = amplitude;
        this.frequency = frequency;
        this.angle = Math.random() * Math.PI * 2;
        this.frameWidth = 60;
        this.frameHeight = 40;
        this.maxFrames = 2;
        this.animationSpeed = 15;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (isGamePaused || isGamePausedForDamage || this.isStomped) {
            return;
        }
        this.angle += this.frequency * gameSpeed * deltaTime;
        this.y = this.startY + Math.sin(this.angle) * this.amplitude;
    }
}

// ====================================================================
// 地上敵2クラス
// ====================================================================
class GroundEnemy2 extends Enemy {
    constructor(x, y, width, height, speed) {
        super(x, y, width, height, speed, assets.groundEnemy2.img);
        this.frameWidth = 64;
        this.frameHeight = 64;
        this.maxFrames = 2;
        this.animationSpeed = 10;
    }
}

// === ステージ2/4の新しい地上敵クラス ===
class Stage2GroundEnemy extends Enemy {
    constructor(x, y, width, height, speed) {
        super(x, y, width, height, speed, assets.stage2Enemy.img);
        this.frameWidth = 64;
        this.frameHeight = 64;
        this.maxFrames = 2;
        this.animationSpeed = 10;
    }
}

// ====================================================================
// 爆弾を落とす敵クラス
// ====================================================================
class BombDropperEnemy extends Enemy {
    constructor(x, y, width, height, speed) {
        super(x, y, width, height, speed, assets.bombDropper.img);
        this.dropCooldown = 0;
        this.maxDropCooldown = 2000 + Math.random() * 1000;
        this.bombDropSpeed = 0;
        this.frameWidth = 48;
        this.frameHeight = 48;
        this.maxFrames = 2;
        this.animationSpeed = 15;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (isGamePaused || isGamePausedForDamage || this.isStomped) {
            return;
        }

        this.dropCooldown -= deltaTime;
        if (this.dropCooldown <= 0) {
            this.dropBomb();
            this.dropCooldown = this.maxDropCooldown;
        }
    }

    dropBomb() {
        const bombWidth = 50;
        const bombHeight = 50;
        const bombX = this.x + this.width / 2 - bombWidth / 2;
        const bombY = this.y + this.height;
        bombs.push(new Bomb(bombX, bombY, bombWidth, bombHeight, this.bombDropSpeed, assets.bomb.img));
        playSound(bombDropSound);
    }
}

// ====================================================================
// 大型ボス敵クラス (ステージ4専用)
// ====================================================================
class BossEnemy extends Enemy {
    constructor(x, y, width, height, speed) {
        super(x, y, width, height, speed, assets.stage2Enemy.img);
        this.initialHitPoints = 10;
        this.hitPoints = this.initialHitPoints;
        this.isDefeated = false;
        
        this.x = canvas.width - this.width - 20;
        this.y = canvas.height / 2 - this.height / 2;

        this.frameWidth = 142;
        this.frameHeight = 150;
        this.maxFrames = 9;
        this.animationSpeed = 10;

        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 3000;
        this.blinkTimer = 0;
        this.blinkInterval = 50;
        
        this.attackState = 'FIRING';
        this.attackTimer = 2000;
        this.fireballsShot = 0;
        this.chargeEffect = null;
        
        // <<< 修正: ビーム関連のプロパティ
        this.beamTargetY = 0; // 以前の名残ですが、chargeEffectの位置決めに流用
        this.beamAngle = 0;
        this.beamShotTimer = 0;
        this.beamShotInterval = 50; // 50msごとにビーム弾を発射
        
        this.enrageSetsFired = 0;
    }

    draw() {
        if (!this.active && !this.isDefeated) return;
        if (this.isInvincible && Math.floor(this.blinkTimer / this.blinkInterval) % 2 === 0) {
            return;
        }
        
        // 予備動作の描画（ターゲットの表示）
        if (this.attackState === 'CHARGING') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(this.beamTargetY.x, this.beamTargetY.y, 15, 0, Math.PI * 2); // ターゲット位置に円を描画
            ctx.fill();
        }

        if (this.attackState === 'CHARGING' && this.chargeEffect) {
            this.chargeEffect.draw();
        }
        
        super.draw();
    }

    update(deltaTime, player) {
        if (isGamePaused || isGamePausedForDamage || this.isDefeated) {
            return;
        }

        if (this.isInvincible) {
            this.invincibleTimer -= deltaTime;
            this.blinkTimer += deltaTime;
            if (this.blinkTimer >= this.blinkInterval * 2) this.blinkTimer = 0;
            if (this.invincibleTimer <= 0) this.isInvincible = false;
        }
        
        // ステートごとの行動
        if (this.attackState === 'BEAMING') {
            this.beamShotTimer -= deltaTime;
            if (this.beamShotTimer <= 0) {
                this.shootBeamParticle();
                this.beamShotTimer = this.beamShotInterval;
            }
        }
        if (this.attackState === 'CHARGING' && this.chargeEffect) {
            this.chargeEffect.update(deltaTime);
            // ターゲットマーカーをプレイヤーに追従させる
            this.beamTargetY = {x: player.x + player.width / 2, y: player.y + player.height / 2};
        }

        this.frameCounter++;
        if (this.frameCounter >= this.animationSpeed) {
            this.frameCounter = 0;
            this.currentFrame = (this.currentFrame + 1) % this.maxFrames;
        }
        
        this.attackTimer -= deltaTime;
        if (this.attackTimer <= 0) {
            this.performAttack(player);
        }
    }

    performAttack(player) {
        switch (this.attackState) {
            case 'FIRING':
                this.shootFireball(player);
                this.fireballsShot++;

                if (this.fireballsShot >= 3) {
                    this.fireballsShot = 0;
                    if (this.hitPoints <= this.initialHitPoints / 2 && this.enrageSetsFired < 2) {
                        this.enrageSetsFired++;
                        this.attackTimer = 1500;
                    } else {
                        this.enrageSetsFired = 0;
                        this.attackState = 'CHARGING';
                        this.attackTimer = 2000; // 2秒間のチャージ時間
                        this.beamTargetY = {x: player.x + player.width / 2, y: player.y + player.height / 2};
                        this.chargeEffect = new BeamCharge(this.x - 50, this.y + this.height / 2);
                        playSound(beamChargeSound);
                    }
                } else {
                    this.attackTimer = 500;
                }
                break;
            case 'CHARGING':
                // <<< 修正: ビーム発射ステートへ移行
                this.attackState = 'BEAMING';
                this.attackTimer = 1500; // 1.5秒間ビームを撃ち続ける
                this.beamShotTimer = 0;
                // チャージ完了時点のプレイヤー位置への角度を計算・保存
                const targetPos = this.beamTargetY;
                this.beamAngle = Math.atan2(targetPos.y - (this.y + this.height / 2), targetPos.x - this.x);
                this.chargeEffect = null;
                playSound(beamSound);
                break;
            case 'BEAMING':
                // ビーム照射が終わったらFIRINGステートへ
                this.attackState = 'FIRING';
                this.attackTimer = 2000; // 次の攻撃までのクールダウン
                break;
        }
    }

    takeHit() {
        if (this.isInvincible || this.isDefeated) return;

        this.hitPoints--;
        playSound(enemyHitSound);

        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;
        this.blinkTimer = 0;

        if (this.hitPoints <= 0) {
            this.isDefeated = true;
            this.active = false;
            if (!isStageClearItemSpawned) {
                const itemWidth = 40;
                const itemHeight = 40;
                const itemX = this.x + this.width / 2 - itemWidth / 2;
                const itemY = this.y + this.height / 2 - itemHeight / 2;
                items.push(new Item(itemX, itemY, itemWidth, itemHeight, 'stage_clear', true));
                isStageClearItemSpawned = true;
            }
        }
    }
    
    shootFireball(player) {
        if (!this.active || isGamePaused || isGamePausedForDamage) return;

        const fireballWidth = 100;
        const fireballHeight = 100;
        const startX = this.x - fireballWidth;
        const startY = this.y + this.height / 2 - fireballHeight / 2;

        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;

        const fireball = new Fireball(startX, startY, fireballWidth, fireballHeight, targetX, targetY, assets.fireball.img);
        enemyProjectiles.push(fireball);
        playSound(fireballSound);
    }
    
    // <<< 追加: ビーム弾を発射するメソッド
    shootBeamParticle() {
        if (!this.active || isGamePaused || isGamePausedForDamage) return;
        const particleSpeed = 600;
        const particleSize = 180;
        
        const startX = this.x; // ボスの左端から
        const startY = this.y + this.height / 2; // ボスの中心の高さから

        const velocityX = Math.cos(this.beamAngle) * particleSpeed;
        const velocityY = Math.sin(this.beamAngle) * particleSpeed;

        const particle = new BeamParticle(startX, startY, particleSize, particleSize, velocityX, velocityY, assets.beam.img);
        enemyProjectiles.push(particle);
    }
}


let enemies = [];
let projectiles = [];
let enemyProjectiles = [];
let bombs = [];

function spawnEnemy() {
    const random = Math.random();
    let enemyWidth, enemyHeight, enemySpeed;

    if (currentStage === 3) {
        if (random < 0.3) {
            enemyWidth = 60;
            enemyHeight = 60;
            enemySpeed = 80 + Math.random() * 40;
            const dropY = Math.random() * (canvas.height * 0.3);
            enemies.push(new BombDropperEnemy(canvas.width, dropY, enemyWidth, enemyHeight, enemySpeed));
        } else if (random < 0.6) {
            enemyWidth = 60;
            enemyHeight = 60;
            enemySpeed = 100 + Math.random() * 50;
            enemies.push(new Enemy(canvas.width, canvas.height - enemyHeight, enemyWidth, enemyHeight, enemySpeed, assets.enemy.img));
        } else if (random < 0.8) {
            enemyWidth = 50;
            enemyHeight = 30;
            enemySpeed = 80 + Math.random() * 40;
            const flyY = canvas.height * 0.4 + Math.random() * (canvas.height * 0.2);
            const amplitude = 20 + Math.random() * 30;
            const frequency = 0.00005 + Math.random() * 0.00005;
            enemies.push(new FlyingEnemy(canvas.width, flyY, enemyWidth, enemyHeight, enemySpeed, amplitude, frequency));
        } else {
            enemyWidth = 80;
            enemyHeight = 110;
            enemySpeed = 120 + Math.random() * 60;
            enemies.push(new GroundEnemy2(canvas.width, canvas.height - enemyHeight, enemyWidth, enemyHeight, enemySpeed));
        }
    }
}

function spawnBoss() {
    if (currentStage === 4 && !largeEnemySpawnedInStage4 && bossEnemyInstance === null) {
        const enemyWidth = 150;
        const enemyHeight = 300;
        const enemySpeed = 0;
        
        bossEnemyInstance = new BossEnemy(0, 0, enemyWidth, enemyHeight, enemySpeed);
        enemies.push(bossEnemyInstance);
        largeEnemySpawnedInStage4 = true;
        
        items.push(new Item(canvas.width / 2 - 20, canvas.height - 100, 40, 40, 'reflection', true));
    }
}

// ====================================================================
// Projectile クラス
// ====================================================================
class Projectile {
    constructor(x, y, width, height, speed, damage, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.damage = damage;
        this.image = image;
        this.active = true;
    }

    draw() {
        if (this.active && this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else if (this.active) {
            ctx.fillStyle = 'blue';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        if (!this.active) return;
        this.x += this.speed * deltaTime / 1000;
        if (this.x > canvas.width) {
            this.active = false;
        }
    }
}

// ====================================================================
// Bomb クラス
// ====================================================================
class Bomb {
    constructor(x, y, width, height, velocityY, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocityY = velocityY;
        this.image = image;
        this.active = true;
        this.gravity = 2;
    }

    draw() {
        if (this.active && this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else if (this.active) {
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        if (!this.active) return;

        this.x -= backgroundScrollSpeed * gameSpeed * deltaTime / 1000;
        this.y += this.velocityY * deltaTime / 1000;
        this.velocityY += this.gravity * deltaTime;

        if (this.x + this.width < 0 || this.y > canvas.height + 50) {
            this.active = false;
        }
    }
}

// ====================================================================
// Fireball クラス
// ====================================================================
class Fireball {
    constructor(x, y, width, height, targetX, targetY, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
        this.active = true;
        this.speed = 500;
        this.isReflected = false;

        let angle = Math.atan2(targetY - y, targetX - x);
        
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
        
        this.frameWidth = 64; 
        this.frameHeight = 56; 
        this.maxFrames = 1; 
        this.currentFrame = 0;
        this.frameCounter = 0;
        this.animationSpeed = 8; 
    }

    draw() {
        if (!this.active) return;
        if (this.isReflected) {
            ctx.filter = 'hue-rotate(180deg) saturate(2)';
        }

        const sx = this.currentFrame * this.frameWidth;

        if (this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, 
                          sx, 0, this.frameWidth, this.frameHeight,
                          this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.isReflected ? 'cyan' : 'orange';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        ctx.filter = 'none';
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage || !this.active) {
            return;
        }
        
        this.frameCounter++;
        if (this.frameCounter >= this.animationSpeed) {
            this.frameCounter = 0;
            this.currentFrame = (this.currentFrame + 1) % this.maxFrames;
        }

        this.x += this.velocityX * deltaTime / 1000;
        this.y += this.velocityY * deltaTime / 1000;

        if (this.x < -this.width || this.x > canvas.width || this.y < -this.height || this.y > canvas.height) {
            this.active = false;
        }
    }
}

// ====================================================================
// BeamParticle クラス (<<< 新規追加)
// ====================================================================
class BeamParticle {
    constructor(x, y, width, height, velocityX, velocityY, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.image = image;
        this.active = true;
        
        this.frameWidth = 100;
        this.frameHeight = 100;
        this.maxFrames = 1;
        this.currentFrame = 0;
        this.frameCounter = 0;
        this.animationSpeed = 2;
    }
    
    update(deltaTime) {
        if (!this.active || isGamePaused || isGamePausedForDamage) return;
        
        this.frameCounter++;
        if (this.frameCounter >= this.animationSpeed) {
            this.frameCounter = 0;
            this.currentFrame = (this.currentFrame + 1) % this.maxFrames;
        }

        this.x += this.velocityX * deltaTime / 1000;
        this.y += this.velocityY * deltaTime / 1000;

        if (this.x < -this.width || this.x > canvas.width || this.y < -this.height || this.y > canvas.height) {
            this.active = false;
        }
    }
    
    draw() {
        if (!this.active) return;
        
        const sx = this.currentFrame * this.frameWidth;
        if (this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image,
                          sx, 0, this.frameWidth, this.frameHeight,
                          this.x - this.width / 2 + 40, this.y - this.height / 2 + 40, // 中心に描画
                          this.width, this.height);
        } else {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }
    }
}


// ====================================================================
// BeamCharge クラス
// ====================================================================
class BeamCharge {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 0;
        this.maxSize = 200;
        this.image = assets.beamCharge.img;
        this.active = true;
    }
    
    update(deltaTime) {
        if (this.size < this.maxSize) {
            this.size += 50 * deltaTime / 1000;
        }
    }
    
    draw() {
         if (this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        } else {
            ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}


// ====================================================================
// ブロックオブジェクト
// ====================================================================
class Block {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = assets.block.img;
    }

    draw() {
        if (this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'brown';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        this.x -= backgroundScrollSpeed * gameSpeed * deltaTime / 1000;
    }
}

// ====================================================================
// 上下に動く足場クラス
// ====================================================================
class MovingPlatform extends Block {
    constructor(x, y, width, height, minY, maxY, moveSpeedY) {
        super(x, y, width, height);
        this.startY = y;
        this.minY = minY;
        this.maxY = maxY;
        this.moveSpeedY = moveSpeedY;
        this.moveDirectionY = -1;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }

        this.y += this.moveDirectionY * this.moveSpeedY * deltaTime / 1000;

        if (this.moveDirectionY === -1 && this.y <= this.minY) {
            this.y = this.minY;
            this.moveDirectionY = 1;
        } else if (this.moveDirectionY === 1 && this.y + this.height >= this.maxY) {
            this.y = this.maxY - this.height;
            this.moveDirectionY = -1;
        }
    }
}

// ====================================================================
// アイテム出現ブロッククラス
// ====================================================================
class BreakableBlock extends Block {
    constructor(x, y, width, height, hasItem = false, itemType = 'health') {
        super(x, y, width, height);
        this.image = assets.breakableBlock.img;
        this.isBroken = false;
        this.hasItem = hasItem;
        this.itemType = itemType;
        this.originalHeight = height;
        this.breakTimer = 0;
        this.breakDuration = 100;
    }

    draw() {
        if (this.isBroken) {
            if (this.breakTimer > 0) {
                if (this.image.complete && this.image.naturalHeight !== 0) {
                     ctx.drawImage(this.image, this.x, this.y, this.width, this.originalHeight * 0.5);
                } else {
                    ctx.fillStyle = 'gray';
                    ctx.fillRect(this.x, this.y + this.originalHeight * 0.2, this.width, this.originalHeight * 0.8);
                }
            }
            return;
        }
        super.draw();
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        if (this.isBroken) {
            this.breakTimer -= deltaTime;
        }
    }

    hitFromBelow() {
        if (this.isBroken) return;
        this.isBroken = true;
        this.breakTimer = this.breakDuration;
        playSound(blockHitSound);

        if (this.hasItem) {
            const itemWidth = 30;
            const itemHeight = 30;
            const itemX = this.x + this.width / 2 - itemWidth / 2;
            const itemY = this.y - itemHeight - 5;

            const spawnedItem = new Item(itemX, itemY, itemWidth, itemHeight, this.itemType);
            items.push(spawnedItem);
        }
    }
}

let blocks = [];
let items = [];

// ====================================================================
// ステージの要素をセットアップする関数
// ====================================================================
function setupStageElements(stageNum) {
    blocks = [];

    if (stageNum === 3) {
        gameSpeed = 1.0;
        blocks.push(new Block(50, canvas.height - 100, 100, 30));
        blocks.push(new Block(200, canvas.height - 200, 120, 30));
        blocks.push(new Block(350, canvas.height - 100, 80, 30));
        blocks.push(new BreakableBlock(500, canvas.height - 250, 70, 30, true, 'health'));
        blocks.push(new Block(650, canvas.height - 150, 90, 30));
    } else if (stageNum === 4) {
        gameSpeed = 0;
    }
}

// ====================================================================
// プレイヤーとステージコンテンツをリセットする関数
// ====================================================================
function resetPlayerAndStageContent() {
    player.x = 100;
    player.y = canvas.height - 50 - 50;
    player.velocityY = 0;
    player.isJumping = false;
    player.jumpCount = player.maxJumpCount;
    player.isInvincible = false;
    player.invincibleTimer = 0;
    player.canShoot = false;
    player.canReflect = false;

    enemies = [];
    items = [];
    projectiles = [];
    enemyProjectiles = [];
    bombs = [];
    isStageClearItemSpawned = false;

    largeEnemySpawnedInStage4 = false;
    bossEnemyInstance = null;
    bossSpawnProgress = 0;
    
    backgroundX = 0;
    reflectionItemSpawnTimer = 0; 
}

// ====================================================================
// ゲーム全体を初期状態にリセットする関数
// ====================================================================
function resetFullGame() {
    score = 0;
    lives = 5;
    continueCount = 3;
    currentStage = 3;
    setupStageElements(currentStage);
    resetPlayerAndStageContent();
    updateUI();
    stopBGM();
}

// ====================================================================
// アイテムオブジェクト
// ====================================================================
class Item {
    constructor(x, y, width, height, type, isFixed = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        if (type === 'health') {
            this.image = assets.healthItem.img;
        } else if (type === 'invincibility') {
            this.image = assets.invincibilityItem.img;
        } else if (type === 'stage_clear') {
            this.image = assets.stageClearItem.img;
        } else if (type === 'shoot_ability') {
            this.image = assets.shootItem.img;
        } else if (type === 'reflection') {
            this.image = assets.reflectionItem.img;
        }
        this.active = true;
        this.isFixed = isFixed;
    }

    draw() {
        if (this.active && this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else if (!this.active) {
        } else {
            if (this.type === 'health') ctx.fillStyle = 'pink';
            else if (this.type === 'invincibility') ctx.fillStyle = 'gray';
            else if (this.type === 'stage_clear') ctx.fillStyle = 'gold';
            else if (this.type === 'shoot_ability') ctx.fillStyle = 'purple';
            else if (this.type === 'reflection') ctx.fillStyle = 'cyan';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        if (!this.isFixed) {
            this.x -= backgroundScrollSpeed * gameSpeed * deltaTime / 1000;
            if (this.x + this.width < 0) {
                this.active = false;
            }
        }
    }
}

function spawnItem() {
    if (currentStage === 4) return;
    
    const itemWidth = 30;
    const itemHeight = 30;
    const itemX = canvas.width;
    const itemY = canvas.height - itemHeight - (Math.random() * 150 + 100);
    
    let itemType;
    const random = Math.random();

    if (currentStage === 3) {
        itemType = random < 0.7 ? 'health' : 'invincibility';
    }
    items.push(new Item(itemX, itemY, itemWidth, itemHeight, itemType));
}

// ====================================================================
// 衝突判定
// ====================================================================
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// ====================================================================
// ステージクリアに必要なスコアを返す関数
// ====================================================================
function getStageClearScore() {
    switch (currentStage) {
        case 3:
            return 6000;
        case 4:
            return 9999999;
        default:
            return 6000;
    }
}

// ====================================================================
// ゲームオーバー処理
// ====================================================================
function gameOver() {
    gameRunning = false;
    stopBGM();
    gameOverScreen.classList.remove('hidden');
    controlsDiv.classList.add('hidden');
    pauseButton.classList.add('hidden');
    updateContinueButton();
}

function updateContinueButton() {
    continueButton.textContent = `CONTINUE (${continueCount})`;
    if (continueCount <= 0) {
        continueButton.disabled = true;
        continueButton.textContent = `CONTINUE (0)`;
    } else {
        continueButton.disabled = false;
    }
}

// ====================================================================
// ゲームのリセットと開始ロジック
// ====================================================================
function startGameLoop() {
    gameOverScreen.classList.add('hidden');
    stageClearScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    controlsDiv.classList.remove('hidden');
    pauseButton.classList.remove('hidden');
    gameRunning = true;
    isGamePaused = false;
    playBGMForCurrentStage();
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function continueGame() {
    if (continueCount > 0) {
        continueCount--;
        lives = 5;
        resetPlayerAndStageContent();
        setupStageElements(currentStage);
        updateUI();
        startGameLoop();
    }
}

function restartGame() {
    resetFullGame();
    startGameLoop();
}

function stageClear() {
    gameRunning = false;
    stopBGM();
    playSound(stageClearSound);
    stageClearScreen.classList.remove('hidden');
    controlsDiv.classList.add('hidden');
    pauseButton.classList.add('hidden');

    if (currentStage < MAX_STAGES) {
        nextStageButton.textContent = "NEXT STAGE";
        nextStageButton.disabled = false;
        nextStageButton.onclick = startNextStage;
    } else {
        nextStageButton.textContent = "TITLE BACK";
        nextStageButton.disabled = false;
        nextStageButton.onclick = () => {
            window.location.href = '../index.html';
        };
    }
}

function startNextStage() {
    if (currentStage < MAX_STAGES) {
        currentStage++;
        lives = 5;
        setupStageElements(currentStage);
        resetPlayerAndStageContent();
        updateUI();
        startGameLoop();
    }
}

// ポーズ機能関連の関数
function togglePause() {
    if (!gameRunning) return;

    isGamePaused = !isGamePaused;
    if (isGamePaused) {
        pauseScreen.classList.remove('hidden');
        controlsDiv.classList.add('hidden');
        pauseButton.classList.add('hidden');
        stopBGM();
    } else {
        pauseScreen.classList.add('hidden');
        controlsDiv.classList.remove('hidden');
        pauseButton.classList.remove('hidden');
        playBGMForCurrentStage();
        lastFrameTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function resumeGame() {
    togglePause();
}

function restartGameFromPause() {
    togglePause();
    restartGame();
}

// ====================================================================
// UIの更新
// ====================================================================
function updateUI() {
    if (currentStage === 4 && bossEnemyInstance && (bossEnemyInstance.active || bossEnemyInstance.isDefeated) && bossEnemyInstance.hitPoints > 0) {
        scoreDisplay.textContent = `BOSS HP: ${bossEnemyInstance.hitPoints}`;
    } else {
        scoreDisplay.textContent = `Score: ${score} (Stage ${currentStage})`;
    }
    livesDisplay.textContent = `Lives: ${lives}`;
}

let lastFrameTime = 0;

// ====================================================================
// ゲームループ
// ====================================================================
function gameLoop(currentTime) {
    if (!gameRunning) return;

    if (lastFrameTime === 0 || isGamePaused) {
        lastFrameTime = currentTime;
    }
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    if (isGamePausedForDamage) {
        damagePauseTimer -= deltaTime;
        if (damagePauseTimer <= 0) {
            isGamePausedForDamage = false;
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let currentBackground = (currentStage === 3 || currentStage === 4) ? assets.backgroundStage2.img : assets.background.img;
    if (!isGamePaused && !isGamePausedForDamage) {
        if (currentBackground.complete && currentBackground.naturalHeight !== 0) {
            if (gameSpeed > 0) {
                ctx.drawImage(currentBackground, backgroundX, 0, canvas.width, canvas.height);
                ctx.drawImage(currentBackground, backgroundX + canvas.width, 0, canvas.width, canvas.height);
                backgroundX -= backgroundScrollSpeed * gameSpeed * deltaTime / 1000;
                if (backgroundX <= -canvas.width) {
                    backgroundX = 0;
                }
            } else {
                ctx.drawImage(currentBackground, 0, 0, canvas.width, canvas.height);
            }
        } else {
            ctx.fillStyle = (currentStage === 3 || currentStage === 4) ? 'darkblue' : 'skyblue';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } else {
        if (currentBackground.complete && currentBackground.naturalHeight !== 0) {
             if (gameSpeed > 0) {
                ctx.drawImage(currentBackground, backgroundX, 0, canvas.width, canvas.height);
                ctx.drawImage(currentBackground, backgroundX + canvas.width, 0, canvas.width, canvas.height);
            } else {
                 ctx.drawImage(currentBackground, 0, 0, canvas.width, canvas.height);
            }
        } else {
            ctx.fillStyle = (currentStage === 3 || currentStage === 4) ? 'darkblue' : 'skyblue';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    if (!isGamePaused && !isGamePausedForDamage) {
        player.update(deltaTime);

        if (player.y > canvas.height + 50) {
            player.takeDamage();
            if (lives > 0) {
                player.x = 100;
                player.y = canvas.height - player.height;
                player.velocityY = 0;
                player.isJumping = false;
                player.jumpCount = player.maxJumpCount;
            }
        }

        if (currentStage === 4) {
            if (!largeEnemySpawnedInStage4 && bossEnemyInstance === null) {
                bossSpawnProgress += deltaTime;
                if (bossSpawnProgress >= BOSS_SPAWN_DELAY) spawnBoss();
            }
            const reflectionItemExists = items.some(item => item.type === 'reflection');
            if (bossEnemyInstance && bossEnemyInstance.active && !reflectionItemExists) {
                reflectionItemSpawnTimer += deltaTime;
                if (reflectionItemSpawnTimer >= REFLECTION_ITEM_SPAWN_INTERVAL) {
                    items.push(new Item(canvas.width / 2 - 20, canvas.height - 100, 40, 40, 'reflection', true));
                    reflectionItemSpawnTimer = 0;
                }
            }
        } else {
            if (currentTime - lastEnemySpawnTime > enemySpawnInterval) {
                spawnEnemy();
                lastEnemySpawnTime = currentTime;
            }
        }

        enemies = enemies.filter(enemy => enemy.active || enemy.isStomped || (enemy instanceof BossEnemy && !enemy.isDefeated));
        enemies.forEach(enemy => {
            if (enemy instanceof BossEnemy) {
                enemy.update(deltaTime, player);
            } else {
                enemy.update(deltaTime);
            }
            
            if (checkCollision(player, enemy) && !enemy.isStomped) {
                const playerBottom = player.y + player.height;
                const enemyTop = enemy.y;
                
                if (player.velocityY > 0 && playerBottom < enemyTop + enemy.height / 2 && !(enemy instanceof BossEnemy)) {
                    enemy.isStomped = true;
                    enemy.stompedTimer = enemy.stompedDuration;
                    score += 100;
                    playSound(enemyHitSound);
                    player.velocityY = player.jumpStrength / 2;
                    player.isJumping = true;
                } else {
                    player.takeDamage();
                }
            }
        });

        projectiles = projectiles.filter(p => p.active);
        projectiles.forEach(p => {
            p.update(deltaTime);
            enemies.forEach(enemy => {
                if (enemy.active && !enemy.isStomped && checkCollision(p, enemy) && !(enemy instanceof BossEnemy)) {
                    p.active = false;
                    enemy.active = false;
                    score += 150;
                    playSound(enemyHitSound);
                }
            });
        });
        
        enemyProjectiles = enemyProjectiles.filter(ep => ep.active);
        enemyProjectiles.forEach(ep => {
            ep.update(deltaTime);

            if (checkCollision(player, ep)) {
                if (ep instanceof Fireball) {
                    if (player.canReflect && !ep.isReflected) {
                        ep.isReflected = true;
                        ep.velocityX *= -1; 
                        ep.velocityY *= -1;
                        playSound(reflectSound); 
                    } else if (!ep.isReflected) {
                        player.takeDamage();
                        ep.active = false; 
                    }
                } else { // BeamParticleなどの他の弾
                    player.takeDamage();
                    ep.active = false;
                }
            }
            
            if (ep instanceof Fireball && ep.isReflected && bossEnemyInstance && checkCollision(ep, bossEnemyInstance)) {
                bossEnemyInstance.takeHit();
                ep.active = false;
            }
        });

        bombs = bombs.filter(b => b.active);
        bombs.forEach(bomb => {
            bomb.update(deltaTime);
            if (checkCollision(player, bomb)) {
                player.takeDamage();
                bomb.active = false;
            }
        });


        blocks = blocks.filter(block => block.x + block.width > 0 && !(block instanceof BreakableBlock && block.isBroken && block.breakTimer <= 0));
        blocks.forEach(block => {
            block.update(deltaTime);
        });

        if (blocks.length > 0 && blocks[blocks.length - 1].x < canvas.width * 0.8 && currentStage !== 4) {
            const lastBlock = blocks[blocks.length - 1];
            const newBlockWidth = 80 + Math.random() * 50;
            const gap = 50 + Math.random() * 50;
            const newBlockX = lastBlock.x + lastBlock.width + gap;
            let newBlockY = lastBlock.y + (Math.random() - 0.5) * 50;
            newBlockY = Math.max(canvas.height - 400, Math.min(canvas.height - 50, newBlockY));

            const blockTypeRoll = Math.random();
            if (blockTypeRoll < 0.25) {
                const hasItem = Math.random() < 0.8;
                const itemType = Math.random() < 0.5 ? 'health' : 'invincibility';
                blocks.push(new BreakableBlock(newBlockX, newBlockY, newBlockWidth, 30, hasItem, itemType));
            } else {
                blocks.push(new Block(newBlockX, newBlockY, newBlockWidth, 30));
            }
        }

        for (const block of blocks) {
            if (block instanceof BreakableBlock && !block.isBroken) {
                if (player.velocityY < 0 && checkCollision(player, block)) {
                    if (player.y < block.y + block.height && player.y + player.height > block.y + block.height) {
                        block.hitFromBelow();
                        player.velocityY = 0;
                        player.y = block.y + block.height;
                    }
                }
            }
        }
        
        if (currentStage === 3 && !isStageClearItemSpawned && score >= getStageClearScore()) {
            const itemWidth = 40;
            const itemHeight = 40;
            const itemX = canvas.width + 100;
            const itemY = canvas.height - itemHeight - 100;
            items.push(new Item(itemX, itemY, itemWidth, itemHeight, 'stage_clear'));
            isStageClearItemSpawned = true;
        }

        items = items.filter(item => item.active);
        items.forEach(item => {
            item.update(deltaTime);
            
            if (checkCollision(player, item)) {
                if (item.type === 'health') {
                    player.heal();
                } else if (item.type === 'invincibility') {
                    player.gainInvincibility();
                } else if (item.type === 'shoot_ability') {
                    player.gainShootAbility();
                } else if (item.type === 'reflection') {
                    player.gainReflection();
                } else if (item.type === 'stage_clear') {
                    item.active = false;
                    stageClear();
                    return;
                }
                item.active = false;
            }
        });

        if (currentStage !== 4) {
            score++;
        }
    }

    player.draw();
    enemies.forEach(enemy => enemy.draw());
    projectiles.forEach(p => p.draw());
    enemyProjectiles.forEach(ep => ep.draw());
    bombs.forEach(bomb => bomb.draw());
    blocks.forEach(block => block.draw());
    items.forEach(item => item.draw());

    updateUI();

    requestAnimationFrame(gameLoop);
}

// ====================================================================
// イベントリスナー
// ====================================================================
document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;

    if (e.code === 'Escape') {
        togglePause();
        return;
    }

    if (isGamePaused || isGamePausedForDamage) return;

    if (e.code === 'Space' || e.code === 'ArrowUp') {
        player.jump();
    }
    if (e.code === 'ArrowRight') {
        player.speedX = player.maxSpeedX;
    }
    if (e.code === 'ArrowLeft') {
        player.speedX = -player.maxSpeedX;
    }
    if (e.code === 'KeyX') {
        player.shoot();
    }
});

document.addEventListener('keyup', (e) => {
    if (!gameRunning || isGamePaused || isGamePausedForDamage) return;

    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        player.speedX = 0;
    }
});

leftButton.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = -player.maxSpeedX; });
leftButton.addEventListener('touchend', (e) => { e.preventDefault(); if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = 0; });
leftButton.addEventListener('mousedown', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = -player.maxSpeedX; });
leftButton.addEventListener('mouseup', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = 0; });
leftButton.addEventListener('mouseleave', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage && e.buttons === 0) player.speedX = 0; });

rightButton.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = player.maxSpeedX; });
rightButton.addEventListener('touchend', (e) => { e.preventDefault(); if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = 0; });
rightButton.addEventListener('mousedown', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = player.maxSpeedX; });
rightButton.addEventListener('mouseup', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = 0; });
rightButton.addEventListener('mouseleave', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage && e.buttons === 0) player.speedX = 0; });

jumpButton.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.jump(); });
jumpButton.addEventListener('mousedown', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.jump(); });

startButton.addEventListener('click', () => {
    if (assetsLoadedCount === totalAssets) {
        if (assetsLoadErrors.length > 0) {
            console.error("ゲーム開始: 一部のアセットの読み込みに失敗しました。");
        } else {
            console.log("ゲーム開始: 全てのアセットが正常にロードされました。");
        }
        startScreen.classList.add('hidden');
        controlsDiv.classList.remove('hidden');
        pauseButton.classList.remove('hidden');
        resetFullGame();
        startGameLoop();
    } else {
        console.log(`ゲーム開始待機中: アセットを読み込み中です...`);
    }
});

continueButton.addEventListener('click', continueGame);
restartButton.addEventListener('click', restartGame);
nextStageButton.addEventListener('click', startNextStage);
restartFromClearButton.addEventListener('click', restartGame);
pauseButton.addEventListener('click', togglePause);
resumeButton.addEventListener('click', resumeGame);
restartFromPauseButton.addEventListener('click', restartGameFromPause);

// ====================================================================
// ゲームの初期化
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    loadAssets().then(() => {
        console.log("DOM Loaded: All asset loading attempts completed.");
        if (assetsLoadErrors.length > 0) {
            console.warn("DOM Loaded: Some assets failed to load.");
        }
    }).catch(error => {
        console.error("DOM Loaded: Unexpected error during asset loading promise:", error);
    });
});