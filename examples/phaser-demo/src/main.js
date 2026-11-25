// Star Catcher: a 30-second round to try the Playtest panel (move, collect, time out, restart).
import Phaser from 'phaser';

const WIDTH = 480;
const HEIGHT = 320;
const ROUND_SECONDS = 30;
const PLAYER_SPEED = 180;

class PlayScene extends Phaser.Scene {
  constructor() {
    super('play');
  }

  create() {
    this.makeTextures();
    this.score = 0;
    this.timeLeft = ROUND_SECONDS;
    this.over = false;

    this.player = this.physics.add.image(WIDTH / 2, HEIGHT / 2, 'player').setCollideWorldBounds(true);
    this.star = this.physics.add.image(0, 0, 'star');
    this.placeStar();
    this.physics.add.overlap(this.player, this.star, () => this.collect());

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.hud = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' });
    this.message = this.add
      .text(WIDTH / 2, HEIGHT / 2, '', { fontFamily: 'monospace', fontSize: '20px', color: '#ffe066', align: 'center' })
      .setOrigin(0.5);

    this.clock = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeLeft -= 1;
        if (this.timeLeft <= 0) this.endRound();
      },
    });
    console.log('Star Catcher: round started');
  }

  makeTextures() {
    if (this.textures.exists('player')) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4dabf7).fillRoundedRect(0, 0, 24, 24, 6);
    g.generateTexture('player', 24, 24);
    g.clear();
    g.fillStyle(0xffd43b).fillPoints(
      Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 === 0 ? 10 : 4;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        return new Phaser.Math.Vector2(10 + r * Math.cos(a), 10 + r * Math.sin(a));
      }),
      true
    );
    g.generateTexture('star', 20, 20);
    g.destroy();
  }

  placeStar() {
    this.star.setPosition(Phaser.Math.Between(20, WIDTH - 20), Phaser.Math.Between(40, HEIGHT - 20));
  }

  collect() {
    if (this.over) return;
    this.score += 1;
    this.placeStar();
    this.tweens.add({ targets: this.player, scale: 1.3, duration: 80, yoyo: true });
  }

  endRound() {
    this.over = true;
    this.clock.remove();
    this.player.setVelocity(0, 0);
    this.message.setText(`Time! ${this.score} stars\nPress R to play again`);
    console.log(`Star Catcher: round over with ${this.score} stars`);
  }

  update() {
    this.hud.setText(`Stars ${this.score}   Time ${Math.max(0, this.timeLeft)}`);
    if (this.over) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.restart();
      return;
    }
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const velocity = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up))
      .normalize()
      .scale(PLAYER_SPEED);
    this.player.setVelocity(velocity.x, velocity.y);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#1c2541',
  physics: { default: 'arcade' },
  scene: [PlayScene],
});
