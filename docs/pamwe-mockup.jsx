import { useState, useEffect } from 'react';

// =========================================================================
// LOGO COMPONENTS — Pamwe leans on pure typography. The name is the brand.
// =========================================================================

function PamweWordmark({ size = 32, color = '#6B2421', italic = true, capital = false }) {
  const fd = "'Fraunces', serif";
  const text = capital ? 'Pamwe' : 'pamwe';
  return (
    <span
      style={{
        fontFamily: fd,
        fontStyle: italic ? 'italic' : 'normal',
        fontWeight: 400,
        fontSize: `${size}px`,
        color,
        lineHeight: 1,
        letterSpacing: '0.005em',
        display: 'inline-block',
      }}
    >
      {text}
    </span>
  );
}

// A subtle ligature treatment — small connecting hairline under the 'mw'
// that suggests "woven together" without being literal
function PamweWordmarkWoven({ size = 32, color = '#6B2421' }) {
  const fd = "'Fraunces', serif";
  return (
    <span
      style={{
        fontFamily: fd,
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: `${size}px`,
        color,
        lineHeight: 1,
        letterSpacing: '0.005em',
        display: 'inline-block',
        position: 'relative',
        paddingBottom: `${size * 0.12}px`,
      }}
    >
      pamwe
      <svg
        style={{
          position: 'absolute',
          left: `${size * 0.42}px`,
          bottom: `${size * 0.04}px`,
          width: `${size * 0.55}px`,
          height: `${size * 0.12}px`,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
      >
        <path
          d="M 5 10 Q 25 0, 50 10 T 95 10"
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 5 10 Q 25 20, 50 10 T 95 10"
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    </span>
  );
}

// App icon variant — italic lowercase 'p' as monogram
function PamweMonogram({ size = 64, color = '#6B2421' }) {
  return (
    <span
      style={{
        fontFamily: "'Fraunces', serif",
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: `${size}px`,
        color,
        lineHeight: 0.85,
        display: 'inline-block',
        transform: 'translateY(0.08em)',
      }}
    >
      p
    </span>
  );
}

function TwineDivider({ c, width = 80 }) {
  return (
    <svg width={width} height="10" viewBox="0 0 80 10" style={{ display: 'block', margin: '0 auto' }}>
      <path d="M0,5 Q10,1 20,5 T40,5 T60,5 T80,5" stroke={c.accent} strokeWidth="0.8" fill="none" opacity="0.7" />
      <path d="M0,5 Q10,9 20,5 T40,5 T60,5 T80,5" stroke={c.accentSoft} strokeWidth="0.8" fill="none" opacity="0.6" />
    </svg>
  );
}

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export default function PamweMockup() {
  const [tab, setTab] = useState('today');
  const [screen, setScreen] = useState('home');
  const [prayerView, setPrayerView] = useState('active');
  const [addingPrayer, setAddingPrayer] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entryMode, setEntryMode] = useState('text');
  const [journalText, setJournalText] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Instrument+Sans:wght@400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    setTimeout(() => setMounted(true), 80);
  }, []);

  useEffect(() => {
    if (recording) {
      const t = setInterval(() => setRecordTime((s) => s + 1), 1000);
      return () => clearInterval(t);
    }
  }, [recording]);

  const c = {
    bg: '#EFE6D6',
    surface: '#F7F0E1',
    surfaceDark: '#E5DAC4',
    text: '#2B1F14',
    textMuted: '#7A6A55',
    textLight: '#A89678',
    accent: '#6B2421',
    accentSoft: '#9B5651',
    stroke: '#D9CCB0',
    workspace: '#1A1612',
    workspaceCard: '#241E18',
  };

  const fd = "'Fraunces', serif";
  const fb = "'Instrument Sans', sans-serif";

  const navigate = (target) => {
    setMounted(false);
    setTimeout(() => {
      if (target.tab) setTab(target.tab);
      if (target.screen) setScreen(target.screen);
      if (target.prayerView) setPrayerView(target.prayerView);
      if (typeof target.addingPrayer === 'boolean') setAddingPrayer(target.addingPrayer);
      setMounted(true);
    }, 200);
  };

  const showBottomNav =
    (tab === 'today' && screen === 'home') ||
    (tab === 'prayers' && !addingPrayer);

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center p-8"
      style={{ background: c.workspace, fontFamily: fb }}
    >
      <div className="relative">
        <div
          className="relative overflow-hidden"
          style={{
            width: '393px',
            height: '852px',
            borderRadius: '54px',
            background: c.bg,
            boxShadow: '0 0 0 11px #0a0805, 0 0 0 12px #3a3328, 0 40px 100px rgba(0,0,0,0.6)',
          }}
        >
          <div
            className="absolute left-1/2 z-50"
            style={{ top: '12px', transform: 'translateX(-50%)', width: '124px', height: '36px', background: '#000', borderRadius: '20px' }}
          />

          <div
            className="absolute top-0 left-0 right-0 z-40 flex justify-between items-center"
            style={{ padding: '20px 32px 0', fontSize: '15px', fontWeight: 600, color: c.text, fontFamily: fb }}
          >
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <svg width="18" height="11" viewBox="0 0 18 11">
                <rect x="0" y="7" width="3" height="4" rx="0.5" fill={c.text} />
                <rect x="5" y="4" width="3" height="7" rx="0.5" fill={c.text} />
                <rect x="10" y="2" width="3" height="9" rx="0.5" fill={c.text} />
                <rect x="15" y="0" width="3" height="11" rx="0.5" fill={c.text} />
              </svg>
              <div className="relative ml-1 flex items-center">
                <div style={{ width: '24px', height: '11px', border: `1px solid ${c.text}`, borderRadius: '3px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '1.5px', left: '1.5px', width: '17px', height: '6px', background: c.text, borderRadius: '1.5px' }} />
                </div>
                <div style={{ width: '2px', height: '4px', background: c.text, marginLeft: '1px', borderRadius: '0 1px 1px 0', opacity: 0.5 }} />
              </div>
            </div>
          </div>

          {tab === 'today' && screen === 'home' && <HomeScreen c={c} fd={fd} fb={fb} mounted={mounted} onBegin={() => navigate({ screen: 'reading' })} />}
          {tab === 'today' && screen === 'reading' && <ReadingScreen c={c} fd={fd} fb={fb} mounted={mounted} onBack={() => navigate({ screen: 'home' })} onContinue={() => navigate({ screen: 'journal' })} />}
          {tab === 'today' && screen === 'journal' && (
            <JournalScreen
              c={c} fd={fd} fb={fb} mounted={mounted}
              onBack={() => navigate({ screen: 'reading' })}
              onSubmit={() => { setRecording(false); navigate({ screen: 'waiting' }); }}
              entryMode={entryMode} setEntryMode={setEntryMode}
              journalText={journalText} setJournalText={setJournalText}
              recording={recording} setRecording={setRecording}
              recordTime={recordTime} setRecordTime={setRecordTime}
            />
          )}
          {tab === 'today' && screen === 'waiting' && <WaitingScreen c={c} fd={fd} fb={fb} mounted={mounted} onHome={() => navigate({ screen: 'home' })} />}
          {tab === 'prayers' && !addingPrayer && <PrayersScreen c={c} fd={fd} fb={fb} mounted={mounted} view={prayerView} setView={(v) => navigate({ prayerView: v })} onAdd={() => navigate({ addingPrayer: true })} />}
          {tab === 'prayers' && addingPrayer && <AddPrayerSheet c={c} fd={fd} fb={fb} mounted={mounted} onClose={() => navigate({ addingPrayer: false })} />}

          {showBottomNav && (
            <BottomTabNav
              c={c} fd={fd} fb={fb}
              tab={tab}
              onTabChange={(t) => navigate({ tab: t, screen: t === 'today' ? 'home' : screen, addingPrayer: false })}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-8 max-w-xl" style={{ fontFamily: fb }}>
        {[
          { label: 'today · home', t: 'today', s: 'home' },
          { label: 'today · read', t: 'today', s: 'reading' },
          { label: 'today · journal', t: 'today', s: 'journal' },
          { label: 'today · waiting', t: 'today', s: 'waiting' },
          { label: 'prayers · active', t: 'prayers', pv: 'active' },
          { label: 'prayers · answered', t: 'prayers', pv: 'answered' },
          { label: 'prayers · add', t: 'prayers', ap: true },
        ].map((opt) => {
          const isActive =
            tab === opt.t &&
            (opt.s ? screen === opt.s : true) &&
            (opt.pv ? prayerView === opt.pv && !addingPrayer : true) &&
            (opt.ap ? addingPrayer : !opt.ap || addingPrayer === !!opt.ap);
          return (
            <button
              key={opt.label}
              onClick={() => navigate({ tab: opt.t, screen: opt.s, prayerView: opt.pv, addingPrayer: !!opt.ap })}
              style={{
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 500,
                borderRadius: '999px',
                padding: '8px 14px',
                background: isActive ? c.bg : 'transparent',
                color: isActive ? c.accent : '#8a7a60',
                border: `1px solid ${isActive ? c.bg : '#3a3328'}`,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div style={{ color: '#5a4d3b', fontFamily: fd, fontStyle: 'italic', fontSize: '13px', marginTop: '16px', letterSpacing: '0.02em', textAlign: 'center' }}>
        Pamwe — Shona for &ldquo;together&rdquo;
      </div>

      <LogoStudies c={c} fd={fd} fb={fb} />
    </div>
  );
}

// =========================================================================
// SCREEN: HOME
// =========================================================================

function HomeScreen({ c, fd, fb, mounted, onBegin }) {
  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        paddingTop: '68px', paddingBottom: '88px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 400ms ease, transform 400ms ease',
      }}
    >
      <div className="flex items-center justify-between" style={{ padding: '14px 32px 0' }}>
        <PamweWordmark size={22} color={c.accent} />
        <div
          style={{
            width: '32px', height: '32px', borderRadius: '999px',
            background: c.surface, border: `1px solid ${c.stroke}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: fd, fontSize: '13px', color: c.textMuted,
          }}
        >
          C
        </div>
      </div>

      <div style={{ padding: '32px 32px 0' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.textLight, textTransform: 'uppercase', fontWeight: 500 }}>
          Monday · May 25
        </div>
        <div style={{ fontFamily: fd, fontSize: '32px', fontWeight: 300, color: c.text, marginTop: '6px', lineHeight: 1.1 }}>
          Day Twelve
        </div>
        <div style={{ fontFamily: fd, fontStyle: 'italic', fontSize: '15px', color: c.textMuted, marginTop: '4px' }}>
          Cord — a journey through Ecclesiastes
        </div>
      </div>

      <div style={{ padding: '24px 24px 0' }}>
        <div
          style={{
            background: c.surface, borderRadius: '20px',
            padding: '32px 28px 24px',
            border: `1px solid ${c.stroke}`, position: 'relative',
          }}
        >
          <div style={{ fontFamily: fd, fontSize: '52px', color: c.accent, opacity: 0.25, position: 'absolute', top: '12px', left: '20px', lineHeight: 1, fontWeight: 400 }}>
            &ldquo;
          </div>
          <p style={{ fontFamily: fd, fontSize: '18px', fontWeight: 400, color: c.text, lineHeight: 1.45, textAlign: 'center', margin: '0', padding: '8px 4px 0' }}>
            Two are better than one, because they have a good reward for their toil.
          </p>
          <div style={{ marginTop: '18px' }}>
            <TwineDivider c={c} width={60} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '10px', letterSpacing: '0.22em', color: c.textMuted, textTransform: 'uppercase', fontWeight: 500 }}>
            Ecclesiastes 4 : 9
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        <button
          onClick={onBegin}
          className="w-full transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: c.accent, color: c.bg, fontFamily: fb,
            fontSize: '14px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '16px 24px', borderRadius: '14px', border: 'none', cursor: 'pointer',
          }}
        >
          Begin together
        </button>
      </div>

      <div style={{ padding: '24px 32px 0', flex: 1 }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.textLight, textTransform: 'uppercase', fontWeight: 500, marginBottom: '14px' }}>
          Today&rsquo;s path
        </div>
        <div className="flex items-center justify-between" style={{ position: 'relative' }}>
          <PartnerAvatar c={c} fd={fd} fb={fb} initial="C" name="You" status="Not yet" />
          <div style={{ flex: 1, padding: '0 12px', marginTop: '-24px' }}>
            <svg width="100%" height="40" viewBox="0 0 160 40" preserveAspectRatio="none">
              <path d="M0,20 Q40,4 80,20 T160,20" stroke={c.stroke} strokeWidth="1.2" fill="none" strokeDasharray="3 3" />
              <path d="M0,20 Q40,36 80,20 T160,20" stroke={c.stroke} strokeWidth="1.2" fill="none" strokeDasharray="3 3" />
            </svg>
          </div>
          <PartnerAvatar c={c} fd={fd} fb={fb} initial="A" name="Ammy" status="Not yet" />
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        <div
          style={{
            background: c.surface, borderRadius: '16px',
            padding: '14px 20px', border: `1px solid ${c.stroke}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.18em', color: c.textLight, textTransform: 'uppercase', fontWeight: 500 }}>
              Together
            </div>
            <div style={{ fontFamily: fd, fontSize: '22px', color: c.text, marginTop: '2px', fontWeight: 400 }}>
              <span style={{ color: c.accent }}>11</span> days woven
            </div>
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[1, 1, 1, 1, 1, 1, 1, 0, 0].map((on, i) => (
              <div
                key={i}
                style={{ width: '6px', height: '20px', borderRadius: '3px', background: on ? c.accent : c.stroke, opacity: on ? 1 : 0.6 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerAvatar({ c, fd, fb, initial, name, status }) {
  return (
    <div className="flex flex-col items-center" style={{ width: '80px' }}>
      <div
        style={{
          width: '52px', height: '52px', borderRadius: '999px',
          background: 'transparent', border: `1.5px dashed ${c.accentSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fd, fontSize: '20px', color: c.accent, fontWeight: 400,
        }}
      >
        {initial}
      </div>
      <div style={{ fontFamily: fb, fontSize: '12px', color: c.text, marginTop: '8px', fontWeight: 500 }}>{name}</div>
      <div style={{ fontFamily: fb, fontSize: '10px', color: c.textLight, marginTop: '2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{status}</div>
    </div>
  );
}

// =========================================================================
// SCREEN: READING
// =========================================================================

function ReadingScreen({ c, fd, fb, mounted, onBack, onContinue }) {
  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        paddingTop: '68px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 400ms ease, transform 400ms ease',
      }}
    >
      <div className="flex items-center justify-between" style={{ padding: '14px 24px 0' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: c.textMuted, fontFamily: fb, fontSize: '14px', cursor: 'pointer', padding: '4px 0' }}>
          &larr; Today
        </button>
        <span style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.textLight, textTransform: 'uppercase', fontWeight: 500 }}>
          Day 12 &middot; Read
        </span>
        <div style={{ width: '50px' }} />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 32px 0' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.accent, textTransform: 'uppercase', fontWeight: 500 }}>
          Ecclesiastes 4 : 9&mdash;12
        </div>
        <div style={{ fontFamily: fd, fontSize: '26px', fontWeight: 300, color: c.text, marginTop: '8px', lineHeight: 1.15, fontStyle: 'italic' }}>
          A cord of three strands
        </div>

        <div style={{ marginTop: '20px' }}>
          <TwineDivider c={c} width={50} />
        </div>

        <div style={{ marginTop: '24px', fontFamily: fd, fontSize: '16px', lineHeight: 1.65, color: c.text, fontWeight: 400 }}>
          <p style={{ margin: 0 }}>
            <span style={{ color: c.textLight, fontSize: '11px', fontFamily: fb, fontWeight: 500, marginRight: '6px', verticalAlign: 'top' }}>9</span>
            Two are better than one, because they have a good reward for their toil.
          </p>
          <p style={{ marginTop: '14px', marginBottom: 0 }}>
            <span style={{ color: c.textLight, fontSize: '11px', fontFamily: fb, fontWeight: 500, marginRight: '6px', verticalAlign: 'top' }}>10</span>
            For if they fall, one will lift up his fellow. But woe to him who is alone when he falls and has not another to lift him up.
          </p>
          <p style={{ marginTop: '14px', marginBottom: 0 }}>
            <span style={{ color: c.textLight, fontSize: '11px', fontFamily: fb, fontWeight: 500, marginRight: '6px', verticalAlign: 'top' }}>11</span>
            Again, if two lie together, they keep warm, but how can one keep warm alone?
          </p>
          <p style={{ marginTop: '14px', marginBottom: 0 }}>
            <span style={{ color: c.textLight, fontSize: '11px', fontFamily: fb, fontWeight: 500, marginRight: '6px', verticalAlign: 'top' }}>12</span>
            And though a man might prevail against one who is alone, two will withstand him&mdash;{' '}
            <span style={{ background: '#E8D9B8', padding: '0 4px', borderRadius: '3px' }}>a threefold cord is not quickly broken.</span>
          </p>
        </div>

        <div style={{ marginTop: '28px', padding: '20px 22px', background: c.surface, borderRadius: '14px', border: `1px solid ${c.stroke}` }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.accent, textTransform: 'uppercase', fontWeight: 500 }}>
            Sit with this
          </div>
          <p style={{ fontFamily: fd, fontSize: '16px', color: c.text, marginTop: '8px', lineHeight: 1.5, fontStyle: 'italic', margin: '8px 0 0' }}>
            Where in this season has your partner lifted you when you have fallen? Where have you needed lifting and not asked?
          </p>
        </div>

        <div style={{ height: '32px' }} />
      </div>

      <div style={{ padding: '16px 24px 32px', background: c.bg, borderTop: `1px solid ${c.stroke}` }}>
        <button
          onClick={onContinue}
          className="w-full transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: c.accent, color: c.bg, fontFamily: fb,
            fontSize: '14px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '18px 24px', borderRadius: '14px', border: 'none', cursor: 'pointer',
          }}
        >
          Write your reflection
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN: JOURNAL
// =========================================================================

function JournalScreen({
  c, fd, fb, mounted, onBack, onSubmit,
  entryMode, setEntryMode,
  journalText, setJournalText,
  recording, setRecording,
  recordTime, setRecordTime,
}) {
  const canSubmit = entryMode === 'text' ? journalText.trim().length > 8 : recordTime > 2;

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        paddingTop: '68px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 400ms ease, transform 400ms ease',
      }}
    >
      <div className="flex items-center justify-between" style={{ padding: '14px 24px 0' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: c.textMuted, fontFamily: fb, fontSize: '14px', cursor: 'pointer', padding: '4px 0' }}>
          &larr; Back
        </button>
        <span style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.textLight, textTransform: 'uppercase', fontWeight: 500 }}>
          Day 12 &middot; Reflect
        </span>
        <div style={{ width: '50px' }} />
      </div>

      <div style={{ padding: '20px 32px 0' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.accent, textTransform: 'uppercase', fontWeight: 500 }}>
          Pray for Ammy
        </div>
        <p style={{ fontFamily: fd, fontSize: '20px', color: c.text, marginTop: '8px', lineHeight: 1.35, fontWeight: 400, fontStyle: 'italic', margin: '8px 0 0' }}>
          What is one way you can lift her up this week?
        </p>
      </div>

      <div style={{ padding: '18px 32px 0' }}>
        <div style={{ background: c.surfaceDark, borderRadius: '999px', padding: '4px', display: 'flex', position: 'relative' }}>
          <button
            onClick={() => setEntryMode('text')}
            style={{
              flex: 1, padding: '10px 0',
              background: entryMode === 'text' ? c.bg : 'transparent',
              border: 'none', borderRadius: '999px',
              fontFamily: fb, fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: entryMode === 'text' ? c.accent : c.textMuted,
              cursor: 'pointer', transition: 'all 200ms ease',
            }}
          >
            Write
          </button>
          <button
            onClick={() => setEntryMode('voice')}
            style={{
              flex: 1, padding: '10px 0',
              background: entryMode === 'voice' ? c.bg : 'transparent',
              border: 'none', borderRadius: '999px',
              fontFamily: fb, fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: entryMode === 'voice' ? c.accent : c.textMuted,
              cursor: 'pointer', transition: 'all 200ms ease',
            }}
          >
            Voice
          </button>
        </div>
      </div>

      <div className="flex-1" style={{ padding: '18px 24px 0', minHeight: 0 }}>
        {entryMode === 'text' ? (
          <div style={{ background: c.surface, borderRadius: '18px', padding: '20px', border: `1px solid ${c.stroke}`, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="Begin writing&hellip;"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                fontFamily: fd, fontSize: '17px', lineHeight: 1.6, color: c.text, width: '100%',
              }}
            />
            <div style={{ fontFamily: fb, fontSize: '10px', color: c.textLight, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'right' }}>
              {journalText.length} chars &middot; only Ammy will see this
            </div>
          </div>
        ) : (
          <div style={{ background: c.surface, borderRadius: '18px', padding: '24px', border: `1px solid ${c.stroke}`, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <div style={{ fontFamily: fd, fontSize: '48px', fontWeight: 300, color: recording ? c.accent : c.textMuted, letterSpacing: '0.02em' }}>
              {String(Math.floor(recordTime / 60)).padStart(1, '0')}:{String(recordTime % 60).padStart(2, '0')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '36px' }}>
              {Array.from({ length: 28 }).map((_, i) => {
                const baseH = 6 + Math.sin(i * 0.7) * 5 + Math.cos(i * 1.3) * 4;
                const active = recording && i < (recordTime * 4) % 28;
                return (
                  <div
                    key={i}
                    style={{
                      width: '3px',
                      height: `${Math.max(4, baseH + (recording ? Math.sin(Date.now() / 200 + i) * 8 : 0))}px`,
                      background: active ? c.accent : c.stroke,
                      borderRadius: '3px', transition: 'height 100ms ease',
                    }}
                  />
                );
              })}
            </div>
            <button
              onClick={() => {
                if (recording) setRecording(false);
                else { setRecordTime(0); setRecording(true); }
              }}
              style={{
                width: '72px', height: '72px', borderRadius: '999px',
                background: recording ? c.surfaceDark : c.accent,
                border: recording ? `2px solid ${c.accent}` : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 200ms ease',
              }}
            >
              {recording ? (
                <div style={{ width: '20px', height: '20px', background: c.accent, borderRadius: '4px' }} />
              ) : (
                <div style={{ width: '20px', height: '20px', background: c.bg, borderRadius: '999px' }} />
              )}
            </button>
            <div style={{ fontFamily: fb, fontSize: '11px', color: c.textLight, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }}>
              {recording ? 'Tap to stop' : recordTime > 0 ? 'Tap to re-record' : 'Tap to begin · 5 min max'}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 24px 32px' }}>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full transition-all active:scale-[0.98]"
          style={{
            background: canSubmit ? c.accent : c.surfaceDark,
            color: canSubmit ? c.bg : c.textLight,
            fontFamily: fb, fontSize: '14px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '18px 24px', borderRadius: '14px', border: 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.6,
          }}
        >
          Send to Ammy
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN: WAITING
// =========================================================================

function WaitingScreen({ c, fd, fb, mounted, onHome }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center"
      style={{
        paddingTop: '68px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 400ms ease, transform 400ms ease',
      }}
    >
      <div className="flex items-center justify-between w-full" style={{ padding: '14px 24px 0' }}>
        <button onClick={onHome} style={{ background: 'transparent', border: 'none', color: c.textMuted, fontFamily: fb, fontSize: '14px', cursor: 'pointer', padding: '4px 0' }}>
          &larr; Home
        </button>
        <span style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.textLight, textTransform: 'uppercase', fontWeight: 500 }}>
          Day 12 &middot; Sent
        </span>
        <div style={{ width: '50px' }} />
      </div>

      <div style={{ padding: '40px 32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
        <div style={{ position: 'relative', width: '160px', height: '160px', marginBottom: '24px' }}>
          <svg viewBox="0 0 180 180" width="160" height="160">
            <defs>
              <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c.accent} />
                <stop offset="100%" stopColor={c.accentSoft} />
              </linearGradient>
            </defs>
            <path d="M40,30 Q90,60 40,90 Q90,120 40,150" stroke="url(#g1)" strokeWidth="2" fill="none" />
            <path d="M140,30 Q90,60 140,90 Q90,120 140,150" stroke={c.stroke} strokeWidth="2" fill="none" strokeDasharray="4 4" />
            <circle cx="40" cy="30" r="6" fill={c.accent} />
            <circle cx="140" cy="30" r="6" fill={c.bg} stroke={c.stroke} strokeWidth="2" />
          </svg>
        </div>

        <div style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.accent, textTransform: 'uppercase', fontWeight: 500 }}>
          Your reflection is sealed
        </div>

        <h2 style={{ fontFamily: fd, fontSize: '26px', fontWeight: 300, color: c.text, marginTop: '14px', lineHeight: 1.2, fontStyle: 'italic' }}>
          Waiting on Ammy
        </h2>

        <p style={{ fontFamily: fb, fontSize: '14px', color: c.textMuted, marginTop: '16px', lineHeight: 1.55, maxWidth: '280px' }}>
          When she finishes her reading, both of your reflections will open together. Neither of you can read the other&rsquo;s until you have both written.
        </p>

        <div style={{ marginTop: '28px' }}>
          <TwineDivider c={c} width={60} />
        </div>

        <button
          onClick={onHome}
          style={{
            marginTop: '24px', background: 'transparent', color: c.accent,
            fontFamily: fb, fontSize: '13px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '12px 24px', border: `1px solid ${c.accentSoft}`, borderRadius: '999px', cursor: 'pointer',
          }}
        >
          Nudge Ammy gently
        </button>
      </div>

      <div style={{ padding: '0 24px 32px', width: '100%' }}>
        <div
          style={{
            background: c.surface, borderRadius: '14px',
            padding: '14px 18px', border: `1px solid ${c.stroke}`,
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '999px', background: c.accent, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fb, fontSize: '12px', fontWeight: 500, color: c.text }}>You will be notified</div>
            <div style={{ fontFamily: fb, fontSize: '11px', color: c.textMuted, marginTop: '2px' }}>
              The moment Ammy completes today&rsquo;s reading
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN: PRAYERS
// =========================================================================

function PrayersScreen({ c, fd, fb, mounted, view, setView, onAdd }) {
  const activePrayers = [
    { id: 1, text: "Mama's hip surgery on Friday", who: 'Ammy', whoInitial: 'A', when: '2 days ago', prayedCount: 4, iPrayed: false },
    { id: 2, text: 'Patience with each other this week as we move', who: 'You', whoInitial: 'C', when: 'today', prayedCount: 1, iPrayed: true },
    { id: 3, text: 'PhD application replies from Penn and Duke', who: 'Ammy', whoInitial: 'A', when: '4 days ago', prayedCount: 7, iPrayed: true },
    { id: 4, text: 'Wisdom on the Hawaii trip budget', who: 'You', whoInitial: 'C', when: '1 week ago', prayedCount: 3, iPrayed: false },
  ];
  const answeredPrayers = [
    { id: 5, text: "Mama's job offer", who: 'Ammy', whoInitial: 'A', answeredOn: 'Apr 12', note: 'She got the role at the clinic' },
    { id: 6, text: 'Safe travels to Montreal', who: 'You', whoInitial: 'C', answeredOn: 'Apr 28', note: null },
    { id: 7, text: "Christian's bioinformatics capstone", who: 'Ammy', whoInitial: 'A', answeredOn: 'May 3', note: 'A on the project, paper draft underway' },
  ];

  const prayers = view === 'active' ? activePrayers : answeredPrayers;

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        paddingTop: '68px', paddingBottom: '88px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 400ms ease, transform 400ms ease',
      }}
    >
      <div style={{ padding: '14px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.textLight, textTransform: 'uppercase', fontWeight: 500 }}>
            Monday · May 25
          </div>
          <h1 style={{ fontFamily: fd, fontSize: '30px', fontWeight: 300, color: c.text, lineHeight: 1.1, marginTop: '4px', fontStyle: 'italic' }}>
            Prayers
          </h1>
        </div>
        <button
          onClick={onAdd}
          style={{
            width: '40px', height: '40px', borderRadius: '999px',
            background: c.accent, border: 'none', color: c.bg,
            fontSize: '24px', fontWeight: 300, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: fd, lineHeight: 1, paddingBottom: '4px',
          }}
        >
          +
        </button>
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ background: c.surfaceDark, borderRadius: '999px', padding: '4px', display: 'flex' }}>
          {[
            { id: 'active', label: 'Active', count: activePrayers.length },
            { id: 'answered', label: 'Answered', count: answeredPrayers.length },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setView(opt.id)}
              style={{
                flex: 1, padding: '10px 0',
                background: view === opt.id ? c.bg : 'transparent',
                border: 'none', borderRadius: '999px',
                fontFamily: fb, fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: view === opt.id ? c.accent : c.textMuted,
                cursor: 'pointer', transition: 'all 200ms ease',
              }}
            >
              {opt.label} <span style={{ opacity: 0.5 }}>{opt.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '16px 24px 0' }}>
        {view === 'active' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {prayers.map((p) => (
              <div key={p.id} style={{ background: c.surface, borderRadius: '16px', padding: '14px 18px', border: `1px solid ${c.stroke}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '22px', height: '22px', borderRadius: '999px',
                        background: c.accentSoft, color: c.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: fd, fontSize: '11px', fontWeight: 500,
                      }}
                    >
                      {p.whoInitial}
                    </div>
                    <div style={{ fontFamily: fb, fontSize: '11px', color: c.text, fontWeight: 500 }}>{p.who}</div>
                    <div style={{ fontFamily: fb, fontSize: '10px', color: c.textLight, letterSpacing: '0.06em' }}>· {p.when}</div>
                  </div>
                </div>
                <p style={{ fontFamily: fd, fontSize: '16px', color: c.text, lineHeight: 1.45, margin: '6px 0 12px', fontWeight: 400 }}>
                  {p.text}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${c.stroke}`, paddingTop: '10px' }}>
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontFamily: fb, fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: p.iPrayed ? c.accent : c.textMuted, padding: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14">
                      {p.iPrayed ? (
                        <circle cx="7" cy="7" r="5" fill={c.accent} />
                      ) : (
                        <circle cx="7" cy="7" r="5" stroke={c.textMuted} strokeWidth="1.2" fill="none" />
                      )}
                      {p.iPrayed && <path d="M 4.5 7 L 6.3 8.5 L 9.5 5.5" stroke={c.bg} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                    </svg>
                    {p.iPrayed ? 'Prayed today' : 'I prayed for this'}
                  </button>
                  <div style={{ fontFamily: fb, fontSize: '10px', color: c.textLight, letterSpacing: '0.06em' }}>
                    {p.prayedCount} {p.prayedCount === 1 ? 'prayer' : 'prayers'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {prayers.map((p) => (
              <div key={p.id} style={{ background: c.surface, borderRadius: '16px', padding: '14px 18px', border: `1px solid ${c.stroke}`, opacity: 0.92 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '22px', height: '22px', borderRadius: '999px',
                        background: c.stroke, color: c.textMuted,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: fd, fontSize: '11px', fontWeight: 500,
                      }}
                    >
                      {p.whoInitial}
                    </div>
                    <div style={{ fontFamily: fb, fontSize: '11px', color: c.textMuted, fontWeight: 500 }}>{p.who}</div>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: c.accent, color: c.bg,
                      padding: '2px 8px', borderRadius: '999px',
                      fontFamily: fb, fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}
                  >
                    Answered · {p.answeredOn}
                  </div>
                </div>
                <p style={{ fontFamily: fd, fontSize: '15px', color: c.text, lineHeight: 1.45, margin: '4px 0 0', fontWeight: 400 }}>
                  {p.text}
                </p>
                {p.note && (
                  <p style={{ fontFamily: fd, fontStyle: 'italic', fontSize: '13px', color: c.textMuted, lineHeight: 1.5, margin: '8px 0 0', borderLeft: `2px solid ${c.accentSoft}`, paddingLeft: '10px' }}>
                    {p.note}
                  </p>
                )}
              </div>
            ))}
            <div style={{ textAlign: 'center', padding: '20px 0 0' }}>
              <TwineDivider c={c} width={40} />
              <div style={{ fontFamily: fd, fontStyle: 'italic', fontSize: '13px', color: c.textMuted, marginTop: '10px' }}>
                A record of God&rsquo;s faithfulness
              </div>
            </div>
          </div>
        )}
        <div style={{ height: '20px' }} />
      </div>
    </div>
  );
}

// =========================================================================
// SHEET: ADD PRAYER
// =========================================================================

function AddPrayerSheet({ c, fd, fb, mounted, onClose }) {
  const [text, setText] = useState('');

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        paddingTop: '68px',
        background: c.bg,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 300ms ease, transform 300ms ease',
      }}
    >
      <div className="flex items-center justify-between" style={{ padding: '14px 24px 0' }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: c.textMuted, fontFamily: fb, fontSize: '14px', cursor: 'pointer' }}>
          Cancel
        </button>
        <span style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.textLight, textTransform: 'uppercase', fontWeight: 500 }}>
          New prayer
        </span>
        <div style={{ width: '54px' }} />
      </div>

      <div style={{ padding: '28px 32px 0' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', color: c.accent, textTransform: 'uppercase', fontWeight: 500 }}>
          What are you carrying?
        </div>
        <p style={{ fontFamily: fd, fontSize: '20px', color: c.text, marginTop: '8px', lineHeight: 1.35, fontStyle: 'italic', margin: '8px 0 0' }}>
          Write what you would like Ammy to pray for with you.
        </p>
      </div>

      <div className="flex-1" style={{ padding: '20px 24px 0' }}>
        <div style={{ background: c.surface, borderRadius: '18px', padding: '20px', border: `1px solid ${c.stroke}`, height: '240px', display: 'flex', flexDirection: 'column' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Mama&rsquo;s hip surgery on Friday"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              fontFamily: fd, fontSize: '17px', lineHeight: 1.55, color: c.text, width: '100%',
            }}
          />
          <div style={{ fontFamily: fb, fontSize: '10px', color: c.textLight, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'right' }}>
            {text.length} chars
          </div>
        </div>

        <div style={{ marginTop: '16px', padding: '14px 18px', background: c.surface, borderRadius: '14px', border: `1px solid ${c.stroke}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '999px', background: c.accentSoft, color: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fd, fontSize: '12px', fontWeight: 500 }}>
            A
          </div>
          <div style={{ flex: 1, fontFamily: fb, fontSize: '12px', color: c.textMuted }}>
            Ammy will be notified
          </div>
          <div style={{ width: '32px', height: '20px', background: c.accent, borderRadius: '999px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', background: c.bg, borderRadius: '999px' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 24px 32px' }}>
        <button
          disabled={text.trim().length < 4}
          className="w-full transition-all active:scale-[0.98]"
          style={{
            background: text.trim().length >= 4 ? c.accent : c.surfaceDark,
            color: text.trim().length >= 4 ? c.bg : c.textLight,
            fontFamily: fb, fontSize: '14px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '18px 24px', borderRadius: '14px', border: 'none',
            cursor: text.trim().length >= 4 ? 'pointer' : 'not-allowed', opacity: text.trim().length >= 4 ? 1 : 0.6,
          }}
        >
          Add to our prayers
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// BOTTOM TAB NAV
// =========================================================================

function BottomTabNav({ c, fd, fb, tab, onTabChange }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30"
      style={{
        background: 'rgba(239, 230, 214, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${c.stroke}`,
        padding: '10px 24px 24px',
        display: 'flex',
        justifyContent: 'space-around',
      }}
    >
      <TabButton
        active={tab === 'today'}
        onClick={() => onTabChange('today')}
        label="Today"
        c={c} fb={fb}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" fill={tab === 'today' ? c.accent : 'none'} stroke={tab === 'today' ? c.accent : c.textMuted} strokeWidth="1.5" />
            <path d="M12 3 V 5 M 12 19 V 21 M 3 12 H 5 M 19 12 H 21 M 5.6 5.6 L 7 7 M 17 17 L 18.4 18.4 M 5.6 18.4 L 7 17 M 17 7 L 18.4 5.6" stroke={tab === 'today' ? c.accent : c.textMuted} strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        }
      />
      <TabButton
        active={tab === 'prayers'}
        onClick={() => onTabChange('prayers')}
        label="Prayers"
        c={c} fb={fb}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M 12 3 C 10 7, 7 10, 8 14 C 8.5 17, 10 19, 12 19 C 14 19, 15.5 17, 16 14 C 17 10, 14 7, 12 3 Z"
              stroke={tab === 'prayers' ? c.accent : c.textMuted}
              strokeWidth="1.5"
              fill={tab === 'prayers' ? c.accent : 'none'}
              strokeLinejoin="round"
            />
            {tab === 'prayers' && (
              <path
                d="M 11 11 C 10.5 13, 11 14.5, 12 15"
                stroke={c.bg}
                strokeWidth="1"
                fill="none"
                strokeLinecap="round"
              />
            )}
          </svg>
        }
      />
    </div>
  );
}

function TabButton({ active, onClick, label, icon, c, fb }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        padding: '4px 16px',
      }}
    >
      {icon}
      <div
        style={{
          fontFamily: fb, fontSize: '10px', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: active ? c.accent : c.textMuted,
        }}
      >
        {label}
      </div>
    </button>
  );
}

// =========================================================================
// LOGO STUDIES PANEL
// =========================================================================

function LogoStudies({ c, fd, fb }) {
  return (
    <div className="mt-12 w-full max-w-3xl" style={{ fontFamily: fb }}>
      <div
        style={{
          background: c.workspaceCard,
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #3a3328',
        }}
      >
        <div style={{ fontFamily: fb, fontSize: '10px', letterSpacing: '0.22em', color: '#8a7a60', textTransform: 'uppercase', fontWeight: 500 }}>
          Logo studies — Pamwe
        </div>
        <h2 style={{ fontFamily: fd, fontSize: '22px', color: c.bg, marginTop: '6px', marginBottom: '8px', fontStyle: 'italic', fontWeight: 300 }}>
          Three takes on the wordmark
        </h2>
        <p style={{ fontFamily: fd, fontStyle: 'italic', fontSize: '14px', color: '#c8b896', marginBottom: '24px', lineHeight: 1.5 }}>
          Pamwe means &ldquo;together&rdquo; in Shona. The visual identity stays quiet so the word can carry the meaning.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ConceptTile
            label="01 · Pure"
            sub="Italic lowercase, no flourish"
            bg={c.bg}
            fg={c.accent}
            c={c} fd={fd} fb={fb}
          >
            <PamweWordmark size={44} color={c.accent} italic={true} capital={false} />
          </ConceptTile>

          <ConceptTile
            label="02 · Woven"
            sub="Twine under the &lsquo;mw&rsquo;"
            bg={c.bg}
            fg={c.accent}
            c={c} fd={fd} fb={fb}
          >
            <PamweWordmarkWoven size={44} color={c.accent} />
          </ConceptTile>

          <ConceptTile
            label="03 · Inverted"
            sub="On the dark, for splash"
            bg="#2B1F14"
            fg={c.bg}
            c={c} fd={fd} fb={fb}
          >
            <PamweWordmark size={44} color={c.bg} italic={true} capital={false} />
          </ConceptTile>
        </div>

        <div style={{ marginTop: '32px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', color: '#8a7a60', textTransform: 'uppercase', fontWeight: 500, marginBottom: '14px' }}>
            Wordmark at every size
          </div>
          <div
            style={{
              background: c.bg, borderRadius: '16px',
              padding: '28px 24px',
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap',
            }}
          >
            <PamweWordmark size={64} color={c.accent} />
            <PamweWordmark size={36} color={c.accent} />
            <PamweWordmark size={22} color={c.accent} />
            <PamweWordmark size={14} color={c.accent} />
          </div>
        </div>

        <div style={{ marginTop: '32px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', color: '#8a7a60', textTransform: 'uppercase', fontWeight: 500, marginBottom: '14px' }}>
            App icon — three takes
          </div>
          <div className="grid grid-cols-3 gap-4">
            <IconTile label="A · Monogram" sub="Italic &lsquo;p&rsquo; on cream" c={c} fd={fd} fb={fb}>
              <div style={{ width: '120px', height: '120px', borderRadius: '28px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <PamweMonogram size={86} color={c.accent} />
              </div>
            </IconTile>
            <IconTile label="B · Inverted" sub="Italic &lsquo;p&rsquo; on oxblood" c={c} fd={fd} fb={fb}>
              <div style={{ width: '120px', height: '120px', borderRadius: '28px', background: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <PamweMonogram size={86} color={c.bg} />
              </div>
            </IconTile>
            <IconTile label="C · Full wordmark" sub="Less iconic, more legible" c={c} fd={fd} fb={fb}>
              <div style={{ width: '120px', height: '120px', borderRadius: '28px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <PamweWordmark size={28} color={c.accent} />
              </div>
            </IconTile>
          </div>
        </div>

        <div style={{ marginTop: '28px', padding: '18px 22px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontFamily: fd, fontStyle: 'italic', fontSize: '14px', color: '#c8b896', lineHeight: 1.5 }}>
            The Cana jugs are gone — they were tied to the wedding feast, and Pamwe carries a different meaning. The strongest move now is restraint. The name does the work. The italic lowercase wordmark and the monogram &lsquo;p&rsquo; are quiet, confident, and unmistakably one family.
          </div>
        </div>
      </div>
    </div>
  );
}

function ConceptTile({ label, sub, bg, fg, c, fd, fb, children }) {
  return (
    <div style={{ background: bg, borderRadius: '16px', padding: '32px 20px', textAlign: 'center', border: `1px solid ${bg === c.bg ? c.stroke : '#3a3328'}` }}>
      <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        {children}
      </div>
      <div style={{ fontFamily: fb, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, color: bg === c.bg ? c.textMuted : '#c8b896' }}>
        {label}
      </div>
      <div style={{ fontFamily: fd, fontStyle: 'italic', fontSize: '12px', color: bg === c.bg ? c.textLight : '#8a7a60', marginTop: '4px' }}>
        {sub}
      </div>
    </div>
  );
}

function IconTile({ label, sub, c, fd, fb, children }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>{children}</div>
      <div style={{ fontFamily: fb, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, color: '#c8b896' }}>
        {label}
      </div>
      <div style={{ fontFamily: fd, fontStyle: 'italic', fontSize: '12px', color: '#8a7a60', marginTop: '2px' }}>
        {sub}
      </div>
    </div>
  );
}
