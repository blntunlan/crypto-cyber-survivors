import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';

const DIAGONAL_AXIS = Math.SQRT1_2;

export class KeyboardInput {
  private keyW = false;
  private keyS = false;
  private keyA = false;
  private keyD = false;
  private arrowUp = false;
  private arrowDown = false;
  private arrowLeft = false;
  private arrowRight = false;
  private spaceHeld = false;
  private pendingDash = false;
  private disposed = false;

  private readonly handleKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;

    switch (keyboardEvent.code) {
      case 'KeyW':
        this.keyW = true;
        break;
      case 'KeyS':
        this.keyS = true;
        break;
      case 'KeyA':
        this.keyA = true;
        break;
      case 'KeyD':
        this.keyD = true;
        break;
      case 'ArrowUp':
        this.arrowUp = true;
        break;
      case 'ArrowDown':
        this.arrowDown = true;
        break;
      case 'ArrowLeft':
        this.arrowLeft = true;
        break;
      case 'ArrowRight':
        this.arrowRight = true;
        break;
      case 'Space':
        if (!keyboardEvent.repeat && !this.spaceHeld) {
          this.pendingDash = true;
        }
        this.spaceHeld = true;
        break;
      default:
        break;
    }
  };

  private readonly handleKeyUp = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;

    switch (keyboardEvent.code) {
      case 'KeyW':
        this.keyW = false;
        break;
      case 'KeyS':
        this.keyS = false;
        break;
      case 'KeyA':
        this.keyA = false;
        break;
      case 'KeyD':
        this.keyD = false;
        break;
      case 'ArrowUp':
        this.arrowUp = false;
        break;
      case 'ArrowDown':
        this.arrowDown = false;
        break;
      case 'ArrowLeft':
        this.arrowLeft = false;
        break;
      case 'ArrowRight':
        this.arrowRight = false;
        break;
      case 'Space':
        this.spaceHeld = false;
        break;
      default:
        break;
    }
  };

  private readonly handleBlur = (): void => {
    this.clearState();
  };

  public constructor(private readonly target: EventTarget) {
    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('blur', this.handleBlur);
  }

  public sample(out: PlayerIntent): void {
    if (this.disposed) {
      out.moveX = 0;
      out.moveY = 0;
      out.dashPressed = false;
      return;
    }

    const horizontal =
      Number(this.keyD || this.arrowRight) - Number(this.keyA || this.arrowLeft);
    const vertical =
      Number(this.keyW || this.arrowUp) - Number(this.keyS || this.arrowDown);

    if (horizontal !== 0 && vertical !== 0) {
      out.moveX = horizontal * DIAGONAL_AXIS;
      out.moveY = vertical * DIAGONAL_AXIS;
    } else {
      out.moveX = horizontal;
      out.moveY = vertical;
    }

    out.dashPressed = this.pendingDash;
    this.pendingDash = false;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.target.removeEventListener('blur', this.handleBlur);
    this.clearState();
    this.disposed = true;
  }

  private clearState(): void {
    this.keyW = false;
    this.keyS = false;
    this.keyA = false;
    this.keyD = false;
    this.arrowUp = false;
    this.arrowDown = false;
    this.arrowLeft = false;
    this.arrowRight = false;
    this.spaceHeld = false;
    this.pendingDash = false;
  }
}
