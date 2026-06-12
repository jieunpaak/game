export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  jumpPressed: boolean;   // edge-triggered
  attackPressed: boolean; // edge-triggered
}

export class InputManager {
  private keys = new Set<string>();
  private prevKeys = new Set<string>();

  constructor() {
    window.addEventListener('keydown', e => {
      if (['ArrowLeft','ArrowRight','ArrowUp','Space','KeyZ','KeyA','KeyD','KeyW'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
  }

  private pressed(code: string) { return this.keys.has(code); }
  private justPressed(code: string) { return this.keys.has(code) && !this.prevKeys.has(code); }

  snapshot(): InputState {
    const state: InputState = {
      left:          this.pressed('ArrowLeft')  || this.pressed('KeyA'),
      right:         this.pressed('ArrowRight') || this.pressed('KeyD'),
      jump:          this.pressed('ArrowUp')    || this.pressed('Space') || this.pressed('KeyW'),
      attack:        this.pressed('KeyZ'),
      jumpPressed:   this.justPressed('ArrowUp') || this.justPressed('Space') || this.justPressed('KeyW'),
      attackPressed: this.justPressed('KeyZ'),
    };
    this.prevKeys = new Set(this.keys);
    return state;
  }
}
