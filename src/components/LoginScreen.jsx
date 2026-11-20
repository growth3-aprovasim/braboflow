import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, Eye, EyeOff, Sun, Moon, LogIn } from 'lucide-react';
import logoImg from '../assets/logo.png';
import logoBlackImg from '../assets/logo-preta.png';
import { authenticateUser } from '../services/authService';

function DispatchArrowsCanvas({ theme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const createArrow = (prewarm = false) => {
      const edge = Math.floor(Math.random() * 4); // 0: left, 1: bottom, 2: right, 3: top
      const margin = 80;
      let x = 0;
      let y = 0;
      let baseAngle = 0;

      if (edge === 0) {
        x = -margin;
        y = Math.random() * height;
        baseAngle = (Math.random() - 0.5) * 1.1;
      } else if (edge === 1) {
        x = Math.random() * width;
        y = height + margin;
        baseAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      } else if (edge === 2) {
        x = width + margin;
        y = Math.random() * height;
        baseAngle = Math.PI + (Math.random() - 0.5) * 1.1;
      } else {
        x = Math.random() * width;
        y = -margin;
        baseAngle = Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      }

      if (prewarm) {
        x = Math.random() * width;
        y = Math.random() * height;
      }

      const willImpact = Math.random() < 0.48;
      return {
        x,
        y,
        angle: baseAngle,
        speed: 1.5 + Math.random() * 1.6,
        turnDrift: (Math.random() - 0.5) * 0.0055,
        age: 0,
        size: 9 + Math.random() * 6,
        maxTrail: 75 + Math.floor(Math.random() * 45),
        opacity: 0.22 + Math.random() * 0.2,
        willImpact,
        impactDelay: 110 + Math.floor(Math.random() * 180),
        impacted: false,
        trail: []
      };
    };

    const arrows = Array.from({ length: 6 }, () => createArrow(true));
    const impacts = [];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const isLight = theme === 'light';
      const goldRgb = isLight ? '217, 119, 6' : '247, 186, 18';

      // Draw expanding delivery/impact ripples in the background
      for (let k = impacts.length - 1; k >= 0; k--) {
        const imp = impacts[k];
        imp.radius += imp.speed;
        imp.alpha *= 0.955;

        if (imp.alpha < 0.015 || imp.radius >= imp.maxRadius) {
          impacts.splice(k, 1);
          continue;
        }

        // Soft central flash
        const coreAlpha = Math.max(0, imp.alpha * (1 - imp.radius / imp.maxRadius) * 0.85);
        if (coreAlpha > 0.01) {
          ctx.beginPath();
          ctx.arc(imp.x, imp.y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${imp.rgb}, ${coreAlpha.toFixed(3)})`;
          ctx.fill();
        }

        // Outer expanding ring
        ctx.beginPath();
        ctx.arc(imp.x, imp.y, imp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${imp.rgb}, ${imp.alpha.toFixed(3)})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Inner secondary ripple
        if (imp.radius > 8) {
          ctx.beginPath();
          ctx.arc(imp.x, imp.y, imp.radius * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${imp.rgb}, ${(imp.alpha * 0.6).toFixed(3)})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }

      for (let i = 0; i < arrows.length; i++) {
        const a = arrows[i];
        const rgb = goldRgb;
        a.age += 1;

        if (!a.impacted) {
          a.angle += a.turnDrift;
          a.x += Math.cos(a.angle) * a.speed;
          a.y += Math.sin(a.angle) * a.speed;

          a.trail.push({ x: a.x, y: a.y });
          if (a.trail.length > a.maxTrail) {
            a.trail.shift();
          }

          // Trigger impact inside visible area as if reaching a recipient
          const inViewport = a.x > 60 && a.x < width - 60 && a.y > 60 && a.y < height - 60;
          if (a.willImpact && a.age >= a.impactDelay && inViewport) {
            a.impacted = true;
            impacts.push({
              x: a.x,
              y: a.y,
              radius: 2,
              maxRadius: 30 + Math.random() * 20,
              speed: 0.65 + Math.random() * 0.35,
              alpha: a.opacity * 1.15,
              rgb
            });
          }
        } else {
          // Retract trail smoothly into the impact point
          if (a.trail.length > 0) {
            a.trail.shift();
            if (a.trail.length > 0) a.trail.shift();
          }
        }

        // Draw smooth curved fading trail
        if (a.trail.length > 2) {
          for (let j = 1; j < a.trail.length; j++) {
            const p0 = a.trail[j - 1];
            const p1 = a.trail[j];
            const progress = j / a.trail.length;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = `rgba(${rgb}, ${(progress * progress * a.opacity * 0.75).toFixed(3)})`;
            ctx.lineWidth = Math.max(0.8, progress * 2.4);
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }

        // Draw sleek send arrow head (only before impact)
        if (!a.impacted) {
          ctx.save();
          ctx.translate(a.x, a.y);
          ctx.rotate(a.angle);
          ctx.fillStyle = `rgba(${rgb}, ${Math.min(0.85, a.opacity * 1.25).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.size, 0);
          ctx.lineTo(-a.size * 0.65, -a.size * 0.55);
          ctx.lineTo(-a.size * 0.3, 0);
          ctx.lineTo(-a.size * 0.65, a.size * 0.55);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Respawn when out of bounds or after impact trail finishes retracting
        const pad = 160;
        const outOfBounds = a.x < -pad || a.x > width + pad || a.y < -pad || a.y > height + pad;
        if (outOfBounds || (a.impacted && a.trail.length === 0)) {
          arrows[i] = createArrow(false);
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="login-dispatch-canvas" aria-hidden="true" />;
}

export default function LoginScreen({ onLogin, theme, onToggleTheme }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await authenticateUser(identifier, password);
      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Usuário ou senha inválidos.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Subtle Radial-Masked Dot Grid */}
      <div className="login-dot-grid" aria-hidden="true" />

      {/* Subtle Ambient Gold Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-18%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '620px',
          height: '360px',
          background: 'radial-gradient(ellipse at center, rgba(247, 186, 18, 0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Curved Random Dispatch Arrows Background */}
      <DispatchArrowsCanvas theme={theme} />

      {/* Theme Toggle Button (Top Right) */}
      <button
        type="button"
        onClick={onToggleTheme}
        className="btn-secondary"
        style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 10,
          padding: '0.45rem 0.75rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem'
        }}
        title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
      >
        {theme === 'dark' ? <Sun size={15} color="#F7BA12" /> : <Moon size={15} color="#0F172A" />}
        <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </span>
      </button>

      {/* Login Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '410px',
          backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 19, 29, 0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '2.25rem 2rem',
          boxShadow: theme === 'light'
            ? 'var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
            : 'var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.07)'
        }}
      >
        {/* Logo & Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem', textAlign: 'center' }}>
          <img
            src={theme === 'light' ? logoBlackImg : logoImg}
            alt="BraboFlow"
            style={{
              height: '58px',
              maxWidth: '210px',
              objectFit: 'contain',
              marginBottom: '0.75rem'
            }}
          />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Entrar
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.35rem', marginBottom: 0 }}>
            Acesse a central de Fluxo de disparos.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-identifier">
              <User size={13} />
              <span>E-mail</span>
            </label>
            <input
              id="login-identifier"
              type="email"
              className="form-control"
              placeholder="Digite seu e-mail..."
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              required
              style={{ padding: '0.58rem 0.8rem', fontSize: '0.88rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              <Lock size={13} />
              <span>Senha</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Digite sua senha..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                required
                style={{ padding: '0.58rem 2.4rem 0.58rem 0.8rem', fontSize: '0.88rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.2rem'
                }}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#ef4444',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                textAlign: 'center'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.68rem 1rem',
              fontSize: '0.9rem',
              marginTop: '0.25rem',
              opacity: isSubmitting ? 0.75 : 1
            }}
          >
            <LogIn size={16} strokeWidth={2.4} />
            <span>{isSubmitting ? 'Verificando...' : 'Acessar Painel'}</span>
          </button>
        </form>

        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}
        >
          Brabo Concursos
        </div>
      </div>
    </div>
  );
}
