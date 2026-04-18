import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const ROLES = [
  {
    label: 'Admin',
    value: 'admin',
    route: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    label: 'User',
    value: 'user',
    route: '/book',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
  {
    label: 'Conductor',
    value: 'conductor',
    route: '/validate',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        <path d="M14 14h.01M14 17h.01M17 14h.01M17 17h.01M20 14h.01M20 17h.01M20 20h.01M17 20h.01M14 20h.01"/>
      </svg>
    ),
  },
  {
    label: 'Driver',
    value: 'driver',
    route: '/driver/active',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
      </svg>
    ),
  },
]

export default function Login() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleSelect(role) {
    setSelected(role.value)
    setLoading(true)
    setTimeout(() => {
      localStorage.setItem('transitos_role', role.value)
      navigate(role.route)
    }, 700)
  }

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* Animated grid background */}
      <div style={styles.gridBg} />
      <div style={styles.glowOrb1} />
      <div style={styles.glowOrb2} />

      <div style={styles.wrapper}>
        {/* Logo / brand */}
        <div style={styles.brand}>
          <div style={styles.logoRing}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              <path d="M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
            </svg>
          </div>
          <div>
            <div style={styles.logoText}>TransitOS</div>
            <div style={styles.logoSub}>Mumbai Mobility Kernel</div>
          </div>
        </div>

        {/* Card */}
        <div style={styles.card} className="login-card">
          <div style={styles.cardHeader}>
            <div style={styles.scanLine} className="scan-line" />
            <h2 style={styles.cardTitle}>Access Portal</h2>
            <p style={styles.cardSubtitle}>Select your role to authenticate</p>
          </div>

          <div style={styles.roleList}>
            {ROLES.map((role) => (
              <button
                key={role.value}
                onClick={() => handleSelect(role)}
                disabled={loading}
                className="role-btn"
                style={{
                  ...styles.roleBtn,
                  ...(selected === role.value ? styles.roleBtnActive : {}),
                  ...(loading && selected !== role.value ? styles.roleBtnDisabled : {}),
                }}
              >
                <div style={{
                  ...styles.roleIcon,
                  ...(selected === role.value ? styles.roleIconActive : {}),
                }}>
                  {role.icon}
                </div>
                <div style={styles.roleInfo}>
                  <div style={styles.roleLabel}>{role.label}</div>
                </div>
                <div style={styles.roleArrow} className={selected === role.value ? 'arrow-active' : ''}>
                  {selected === role.value && loading ? (
                    <div className="spinner" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div style={styles.cardFooter}>
            <span style={styles.footerDot} />
            <span style={styles.footerText}>Polygon Amoy · Secured</span>
            <span style={styles.footerDot} />
          </div>
        </div>
      </div>
    </div>
  )
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes gridMove {
    0% { transform: translateY(0); }
    100% { transform: translateY(40px); }
  }
  @keyframes scanMove {
    0% { top: 0; opacity: 0.6; }
    50% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes borderGlow {
    0%, 100% { border-color: rgba(14,165,233,0.3); box-shadow: 0 0 0 0 rgba(14,165,233,0); }
    50% { border-color: rgba(14,165,233,0.7); box-shadow: 0 0 20px rgba(14,165,233,0.15); }
  }

  .login-card {
    animation: fadeUp 0.6s ease both;
  }

  .scan-line {
    position: absolute;
    left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #0EA5E9, #22D3EE, transparent);
    animation: scanMove 3s ease-in-out infinite;
    pointer-events: none;
  }

  .role-btn {
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .role-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(14,165,233,0.06), rgba(34,211,238,0.03));
    opacity: 0;
    transition: opacity 0.2s;
  }
  .role-btn:hover::before { opacity: 1; }
  .role-btn:hover {
    border-color: rgba(14,165,233,0.5) !important;
    transform: translateX(4px);
  }
  .role-btn:active { transform: translateX(2px) scale(0.99); }

  .arrow-active {
    color: #0EA5E9 !important;
  }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(14,165,233,0.3);
    border-top-color: #0EA5E9;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
`

const styles = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Rajdhani', sans-serif",
  },
  gridBg: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(14,165,233,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(14,165,233,0.05) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    animation: 'gridMove 4s linear infinite',
  },
  glowOrb1: {
    position: 'absolute',
    top: '-20%',
    left: '-10%',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
    animation: 'pulse 6s ease-in-out infinite',
  },
  glowOrb2: {
    position: 'absolute',
    bottom: '-20%',
    right: '-10%',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
    animation: 'pulse 8s ease-in-out infinite 2s',
  },
  wrapper: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '420px',
    padding: '0 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    animation: 'fadeUp 0.4s ease both',
  },
  logoRing: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    border: '1px solid rgba(14,165,233,0.4)',
    backgroundColor: 'rgba(14,165,233,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '1.6rem',
    fontWeight: '700',
    letterSpacing: '0.12em',
    color: '#E2E8F0',
    textTransform: 'uppercase',
    lineHeight: 1,
  },
  logoSub: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '0.6rem',
    letterSpacing: '0.25em',
    color: '#475569',
    textTransform: 'uppercase',
    marginTop: '2px',
  },
  card: {
    width: '100%',
    backgroundColor: '#1E293B',
    border: '1px solid rgba(14,165,233,0.2)',
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
  },
  cardHeader: {
    padding: '1.75rem 1.75rem 1.25rem',
    borderBottom: '1px solid rgba(14,165,233,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardTitle: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '1.4rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: '#E2E8F0',
    textTransform: 'uppercase',
    marginBottom: '0.25rem',
  },
  cardSubtitle: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '0.65rem',
    letterSpacing: '0.2em',
    color: '#475569',
    textTransform: 'uppercase',
  },
  roleList: {
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  roleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.875rem 1rem',
    backgroundColor: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(14,165,233,0.15)',
    borderRadius: '10px',
    color: '#94A3B8',
    textAlign: 'left',
    width: '100%',
  },
  roleBtnActive: {
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderColor: 'rgba(14,165,233,0.6)',
    color: '#E2E8F0',
  },
  roleBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    transform: 'none',
  },
  roleIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    backgroundColor: 'rgba(14,165,233,0.08)',
    border: '1px solid rgba(14,165,233,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#64748B',
    transition: 'all 0.2s',
  },
  roleIconActive: {
    backgroundColor: 'rgba(14,165,233,0.15)',
    borderColor: 'rgba(14,165,233,0.5)',
    color: '#0EA5E9',
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '1rem',
    fontWeight: '600',
    letterSpacing: '0.06em',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    lineHeight: 1.2,
  },
  roleDesc: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '0.6rem',
    letterSpacing: '0.1em',
    color: '#475569',
    marginTop: '2px',
  },
  roleArrow: {
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s',
    flexShrink: 0,
  },
  cardFooter: {
    padding: '0.75rem 1.75rem',
    borderTop: '1px solid rgba(14,165,233,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  footerDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: 'rgba(14,165,233,0.4)',
    display: 'inline-block',
  },
  footerText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '0.6rem',
    letterSpacing: '0.2em',
    color: '#334155',
    textTransform: 'uppercase',
  },
  hint: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '0.6rem',
    letterSpacing: '0.15em',
    color: '#334155',
    textTransform: 'uppercase',
    animation: 'fadeUp 0.8s ease both',
  },
}