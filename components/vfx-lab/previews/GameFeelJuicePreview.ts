import { type VfxPreviewModule } from '../../../types/vfxLab';

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  vx: number;
  vy: number;
  isCrit: boolean;
  isSuperCrit: boolean;
}

interface CoinParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  symbol: string;
  angle: number;
  spin: number;
}

interface State {
  listenersAttached: boolean;
  attachedCanvas: HTMLCanvasElement | null;
  cleanup: (() => void) | null;
  mouseX: number;
  mouseY: number;

  floatingTexts: FloatingText[];
  coins: CoinParticle[];

  // Game Feel properties
  shakeX: number;
  shakeY: number;
  shakeTimer: number;
  shakeType: 'pump' | 'dump' | 'neutral';
  glitchTimer: number;

  cashOutTimer: number;
  timeScale: number;

  levelUpTimer: number;
  levelUpCardHover: number; // -1 = none, 0, 1, 2 = cards
  xpProgress: number;

  nearMissTimer: number;
  nearMissOrbX: number;
  nearMissOrbY: number;

  announcerText: string;
  announcerTimer: number;
  announcerColor: string;
}

// Button layout coordinates (5 buttons along the top)
const BUTTONS = [
  { label: 'Crit Pop', x: 7, w: 50 },
  { label: 'Market Sk', x: 61, w: 50 },
  { label: 'Cash Out', x: 115, w: 50 },
  { label: 'Level Up', x: 169, w: 50 },
  { label: 'Near Miss', x: 223, w: 50 },
];
const BUTTON_Y = 6;
const BUTTON_H = 20;

export const GameFeelJuicePreview: VfxPreviewModule<State> = {
  id: 'other-game-feel-juice-showcase',
  category: 'other',
  label: 'Game Feel & Juice Showcase',
  description:
    'Yeni game feel geliştirmelerini test etme alanı. Düğmelere tıklayın veya ekrana tıklayarak sekerek düşen hasar sayıları spawn edin!',

  init: () => ({
    listenersAttached: false,
    attachedCanvas: null,
    cleanup: null,
    mouseX: 0,
    mouseY: 0,
    floatingTexts: [],
    coins: [],
    shakeX: 0,
    shakeY: 0,
    shakeTimer: 0,
    shakeType: 'neutral',
    glitchTimer: 0,
    cashOutTimer: 0,
    timeScale: 1.0,
    levelUpTimer: 0,
    levelUpCardHover: -1,
    xpProgress: 0,
    nearMissTimer: 0,
    nearMissOrbX: 0,
    nearMissOrbY: 0,
    announcerText: '',
    announcerTimer: 0,
    announcerColor: '#ffffff',
  }),

  tick: (state, sim, dtMs) => {
    // 1. Time scale governor for bullet time / slow-mo
    let effectiveDt = dtMs;
    if (state.cashOutTimer > 0) {
      state.timeScale = 0.2;
      effectiveDt = dtMs * state.timeScale;
      state.cashOutTimer -= dtMs;
    } else if (state.nearMissTimer > 0) {
      state.timeScale = 0.25;
      effectiveDt = dtMs * state.timeScale;
      state.nearMissTimer -= dtMs;
    } else {
      state.timeScale = 1.0;
    }

    // 2. Announcer timing
    if (state.announcerTimer > 0) {
      state.announcerTimer -= dtMs;
      if (state.announcerTimer <= 0) {
        state.announcerText = '';
      }
    }

    // 3. Glitch timing
    if (state.glitchTimer > 0) {
      state.glitchTimer -= dtMs;
    }

    // 4. Update Bouncy Damage Numbers
    const gravity = 0.15;
    const floorY = sim.height - 20;

    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const text = state.floatingTexts[i]!;
      // Apply physics velocity
      text.x += text.vx * (effectiveDt / 16.6);
      text.y += text.vy * (effectiveDt / 16.6);
      text.vy += gravity * (effectiveDt / 16.6);

      // Bounce on floor
      if (text.y >= floorY) {
        text.y = floorY;
        text.vy = -text.vy * 0.45; // Bounce absorption
        text.vx *= 0.7; // Friction

        // Stop bouncing when velocity gets too small
        if (Math.abs(text.vy) < 0.8) {
          text.vy = 0;
        }
      }

      // Life decay
      text.life -= 0.015 * (effectiveDt / 16.6);
      if (text.life <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }

    // 5. Update Coins (Take Profit rain)
    for (let i = state.coins.length - 1; i >= 0; i--) {
      const coin = state.coins[i]!;
      coin.x += coin.vx * (effectiveDt / 16.6);
      coin.y += coin.vy * (effectiveDt / 16.6);
      coin.vy += 0.12 * (effectiveDt / 16.6); // Gravity
      coin.angle += coin.spin * (effectiveDt / 16.6);

      coin.life -= 0.012 * (effectiveDt / 16.6);
      if (coin.life <= 0 || coin.y > sim.height) {
        state.coins.splice(i, 1);
      }
    }

    // 6. Spawn Coins if Cash Out is active
    if (state.cashOutTimer > 0 && Math.random() < 0.4) {
      // Spawn golden coins at random top positions falling down
      state.coins.push({
        x: sim.playerX + (Math.random() - 0.5) * 80,
        y: sim.playerY - 20,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 4 - 2,
        life: 1.0,
        color: Math.random() > 0.3 ? '#ffd700' : '#22c55e', // Gold or Green
        symbol: Math.random() > 0.5 ? '$' : '₿',
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2,
      });
    }

    // 7. Update Level Up timers and card hovers
    if (state.levelUpTimer > 0) {
      state.levelUpTimer -= dtMs;

      // Sim Card Hover checks
      const mx = state.mouseX;
      const my = state.mouseY;
      if (my >= 80 && my <= 160) {
        if (mx >= 35 && mx <= 95) state.levelUpCardHover = 0;
        else if (mx >= 110 && mx <= 170) state.levelUpCardHover = 1;
        else if (mx >= 185 && mx <= 245) state.levelUpCardHover = 2;
        else state.levelUpCardHover = -1;
      } else {
        state.levelUpCardHover = -1;
      }
    }

    // 8. Update Near Miss Orb path
    if (state.nearMissTimer > 0) {
      // Move projectile from left to right, grazing the player (center)
      const duration = 1000;
      const progress = (duration - state.nearMissTimer) / duration;
      state.nearMissOrbX = -20 + progress * (sim.width + 40);
      // Path equation to graze player center (140, 110) at y = 122 (12px offset, close call!)
      state.nearMissOrbY = 60 + Math.sin(progress * Math.PI) * 62;
    }

    // 9. Update Screen Shake offsets
    if (state.shakeTimer > 0) {
      state.shakeTimer -= dtMs;
      if (state.shakeTimer <= 0) {
        state.shakeX = 0;
        state.shakeY = 0;
        state.shakeType = 'neutral';
      } else {
        const factor = state.shakeTimer / 500; // Decay factor
        if (state.shakeType === 'pump') {
          // Upward biased shake
          state.shakeX = (Math.random() - 0.5) * 4 * factor;
          state.shakeY = -Math.random() * 10 * factor;
        } else if (state.shakeType === 'dump') {
          // Downward biased shake
          state.shakeX = (Math.random() - 0.5) * 4 * factor;
          state.shakeY = Math.random() * 10 * factor;
        } else {
          // Normal random shake
          state.shakeX = (Math.random() - 0.5) * 8 * factor;
          state.shakeY = (Math.random() - 0.5) * 8 * factor;
        }
      }
    }
  },

  render: (ctx, state, sim) => {
    // Canvas dimensions helper
    const w = sim.width;
    const h = sim.height;

    // Attach click listeners to canvas once it is drawn
    if (!state.listenersAttached) {
      state.listenersAttached = true;
      state.attachedCanvas = ctx.canvas;
      const canvas = ctx.canvas;

      const triggerCritPop = (cx: number, cy: number) => {
        const isSuper = Math.random() < 0.15;
        const isCrit = isSuper || Math.random() < 0.4;
        const damageVal = Math.floor(
          Math.random() * (isSuper ? 800 : isCrit ? 300 : 80) + (isCrit ? 100 : 10)
        );
        const text = damageVal.toString() + (isSuper ? '!!' : isCrit ? '!' : '');
        const color = isSuper ? '#ff3333' : isCrit ? '#ffd700' : '#e2e8f0';
        const size = isSuper ? 26 : isCrit ? 20 : 14;

        state.floatingTexts.push({
          x: cx,
          y: cy,
          text,
          color,
          size,
          life: 1.0,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 5 - 4,
          isCrit,
          isSuperCrit: isSuper,
        });

        // Super crit screenshake trigger
        if (isSuper) {
          state.shakeTimer = 350;
          state.shakeType = 'neutral';

          state.announcerText = 'CRITICAL PUMP!';
          state.announcerTimer = 800;
          state.announcerColor = '#ff3333';
        }
      };

      const triggerMarketShake = () => {
        const isPump = Math.random() > 0.5;
        state.shakeTimer = 500;
        state.shakeType = isPump ? 'pump' : 'dump';
        state.glitchTimer = 400; // Glitch overlay duration

        state.announcerText = isPump ? 'BULL RUN!' : 'MARGIN CALL!';
        state.announcerTimer = 1000;
        state.announcerColor = isPump ? '#39ff14' : '#ff3333';
      };

      const triggerCashOut = () => {
        state.cashOutTimer = 1500;
        state.announcerText = 'TAKE PROFIT!';
        state.announcerTimer = 1500;
        state.announcerColor = '#ffd700';

        // Spawn starting ring explosion
        for (let i = 0; i < 20; i++) {
          state.coins.push({
            x: sim.playerX,
            y: sim.playerY,
            vx: (Math.random() - 0.5) * 8,
            vy: -Math.random() * 6 - 3,
            life: 1.0,
            color: '#ffd700',
            symbol: '$',
            angle: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.3,
          });
        }
      };

      const triggerLevelUp = () => {
        state.levelUpTimer = 3000; // Card screen active for 3s
        state.announcerText = 'LEVEL UP!';
        state.announcerTimer = 1200;
        state.announcerColor = '#bc13fe';
      };

      const triggerNearMiss = () => {
        state.nearMissTimer = 1000; // Graze animation 1s
        state.nearMissOrbX = -20;
        state.nearMissOrbY = 60;
        state.announcerText = 'HODL!';
        state.announcerTimer = 1000;
        state.announcerColor = '#00f0ff';
      };

      const onMouseDown = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Check button click
        if (my >= BUTTON_Y && my <= BUTTON_Y + BUTTON_H) {
          for (let i = 0; i < BUTTONS.length; i++) {
            const btn = BUTTONS[i]!;
            if (mx >= btn.x && mx <= btn.x + btn.w) {
              if (i === 0) triggerCritPop(sim.playerX, sim.playerY - 20);
              else if (i === 1) triggerMarketShake();
              else if (i === 2) triggerCashOut();
              else if (i === 3) triggerLevelUp();
              else if (i === 4) triggerNearMiss();
              return;
            }
          }
        }

        // Click outside buttons -> Spawn damage pop
        if (my > BUTTON_Y + BUTTON_H + 5) {
          triggerCritPop(mx, my);
        }
      };

      const onMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        state.mouseX = e.clientX - rect.left;
        state.mouseY = e.clientY - rect.top;
      };

      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mousemove', onMouseMove);

      state.cleanup = () => {
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mousemove', onMouseMove);
      };
    }

    // Safety checks for canvas swaps
    if (state.attachedCanvas && state.attachedCanvas !== ctx.canvas) {
      state.cleanup?.();
      state.listenersAttached = false;
      state.attachedCanvas = null;
    }

    // Apply Screen Shake transform
    ctx.save();
    if (state.shakeTimer > 0) {
      ctx.translate(state.shakeX, state.shakeY);
    }

    // Draw grid environment
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Draw Floor marker line
    ctx.strokeStyle = 'rgba(148,163,184,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h - 20);
    ctx.lineTo(w, h - 20);
    ctx.stroke();

    // 1. Draw Player
    ctx.save();
    ctx.translate(sim.playerX, sim.playerY);

    // Squashing scale based on status
    let sx = 1.0;
    let sy = 1.0;
    if (state.nearMissTimer > 0) {
      // Near miss squash tension
      const progress = (1000 - state.nearMissTimer) / 1000;
      const stretch = Math.sin(progress * Math.PI) * 0.25;
      sx = 1.0 - stretch;
      sy = 1.0 + stretch;
    } else if (state.cashOutTimer > 0) {
      // Portal zoom squash
      sx = 0.8;
      sy = 1.2;
    }
    ctx.scale(sx, sy);

    // Draw player body
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw simple sunglasses for cyberpunk look
    ctx.fillStyle = '#000000';
    ctx.fillRect(-5, -3, 10, 3);
    ctx.restore();

    // 2. Draw Coin rain (Take Profit)
    for (const coin of state.coins) {
      ctx.save();
      ctx.translate(coin.x, coin.y);
      ctx.rotate(coin.angle);
      ctx.globalAlpha = Math.min(1.0, coin.life * 1.5);

      ctx.fillStyle = coin.color;
      ctx.shadowBlur = 5;
      ctx.shadowColor = coin.color;

      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(coin.symbol, 0, 0);
      ctx.restore();
    }

    // 3. Draw Bouncy Floating Damage Numbers
    for (const text of state.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1.0, text.life * 2.0);
      ctx.font = `bold ${text.size}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = text.isCrit ? 4 : 2;
      ctx.strokeText(text.text, text.x, text.y);

      // Glow for crits
      if (text.isCrit) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = text.color;
      }

      // Fill
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }

    // 4. Draw Portal (Cash-Out / Take profit)
    if (state.cashOutTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.8, state.cashOutTimer / 500);
      const ringRadius = 50 - (state.cashOutTimer % 500) * 0.08;

      // Glowing green take profit field
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#39ff14';

      ctx.beginPath();
      ctx.arc(sim.playerX, sim.playerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw Near Miss Orb
    if (state.nearMissTimer > 0) {
      // Red projectile
      ctx.save();
      ctx.fillStyle = '#ff3333';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ff3333';
      ctx.beginPath();
      ctx.arc(state.nearMissOrbX, state.nearMissOrbY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Trailing guide path
      ctx.restore();
      ctx.strokeStyle = 'rgba(255, 51, 51, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(-10, 60);
      ctx.bezierCurveTo(w / 3, 122, (2 * w) / 3, 122, w + 10, 60);
      ctx.stroke();
      ctx.setLineDash([]); // Reset
    }

    // Restore shake translate before drawing UI layer
    ctx.restore();

    // 6. Draw Level Up holographic screen
    if (state.levelUpTimer > 0) {
      ctx.save();
      // Translucent panel
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 30, w, h - 50);

      ctx.fillStyle = '#bc13fe';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HOLOGRAPHIC CHIP SELECT', w / 2, 50);

      const cards = [
        { title: 'CRIT', desc: '+15%', color: '#ffd700' },
        { title: 'SPD', desc: '+20%', color: '#00f0ff' },
        { title: 'SHIELD', desc: '+30%', color: '#39ff14' },
      ];

      cards.forEach((card, idx) => {
        const cx = 35 + idx * 75;
        const cy = 80;
        const cw = 60;
        const ch = 80;
        const isHovered = state.levelUpCardHover === idx;

        ctx.save();
        if (isHovered) {
          // Hover tilt transform
          ctx.translate(cx + cw / 2, cy + ch / 2);
          ctx.scale(1.08, 1.08);
          ctx.rotate(0.04);
          ctx.translate(-(cx + cw / 2), -(cy + ch / 2));

          ctx.strokeStyle = card.color;
          ctx.shadowBlur = 15;
          ctx.shadowColor = card.color;
          ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        }

        ctx.lineWidth = 1.5;
        ctx.fillRect(cx, cy, cw, ch);
        ctx.strokeRect(cx, cy, cw, ch);

        // Card Content
        ctx.shadowBlur = 0; // Reset glow for text
        ctx.fillStyle = isHovered ? card.color : '#e2e8f0';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(card.title, cx + cw / 2, cy + 25);

        ctx.fillStyle = '#64748b';
        ctx.font = '8px monospace';
        ctx.fillText(card.desc, cx + cw / 2, cy + 48);
        ctx.restore();
      });

      ctx.restore();
    }

    // 7. Announcer Text overlay
    if (state.announcerText) {
      ctx.save();
      const scale = 1.0 + Math.sin((state.announcerTimer / 1000) * Math.PI) * 0.15;
      ctx.translate(w / 2, h / 2 - 20);
      ctx.scale(scale, scale);

      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(state.announcerText, 0, 0);

      ctx.shadowBlur = 12;
      ctx.shadowColor = state.announcerColor;
      ctx.fillStyle = state.announcerColor;
      ctx.fillText(state.announcerText, 0, 0);
      ctx.restore();
    }

    // 8. Market volatility glitch overlay (draw lines)
    if (state.glitchTimer > 0 && Math.random() > 0.4) {
      ctx.fillStyle =
        state.shakeType === 'pump'
          ? 'rgba(57, 255, 20, 0.15)'
          : 'rgba(255, 51, 51, 0.15)';
      const scanH = 8 + Math.random() * 20;
      const scanY = Math.random() * h;
      ctx.fillRect(0, scanY, w, scanH);

      // Color skew offset indicator
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('[SYSTEM_VOLATILITY_GLITCH]', 10, h - 25);
    }

    // 9. Draw interactive buttons HUD on top
    BUTTONS.forEach(btn => {
      const mx = state.mouseX;
      const my = state.mouseY;
      const isHovered =
        my >= BUTTON_Y &&
        my <= BUTTON_Y + BUTTON_H &&
        mx >= btn.x &&
        mx <= btn.x + btn.w;

      ctx.save();
      ctx.fillStyle = isHovered ? '#334155' : '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.fillRect(btn.x, BUTTON_Y, btn.w, BUTTON_H);
      ctx.strokeRect(btn.x, BUTTON_Y, btn.w, BUTTON_H);

      ctx.fillStyle = isHovered ? '#39ff14' : '#e2e8f0';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, BUTTON_Y + BUTTON_H / 2);
      ctx.restore();
    });

    // 10. Frame info details
    ctx.fillStyle = '#64748b';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Scale: ${state.timeScale.toFixed(2)}x`, 10, h - 8);
    ctx.textAlign = 'right';
    ctx.fillText('HODL Lab v2.0', w - 10, h - 8);
  },
};
