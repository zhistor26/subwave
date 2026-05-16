'use client';

// Skills editor — /admin/skills. The autonomous DJ segments (weather, news,
// traffic, random facts) the station can fire between tracks.
//
// Each skill is toggled on/off station-wide here. A skill only fires
// autonomously when it is enabled here AND assigned to the persona on air
// (see /admin/personas). "Run now" is an operator override — it fires the
// segment immediately, bypassing the enable toggle, the persona assignment,
// the frequency gate, and the cooldown.
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdminAuth } from '../../lib/adminAuth';
import { Card, Btn, Pill, Eyebrow, Toggle } from './ui';
import { V3Alert } from '../ui/alert';

function cooldownLabel(ms) {
  if (!ms) return 'no cooldown';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min cooldown`;
  const h = Math.round(min / 6) / 10;
  return `${h} h cooldown`;
}

export default function SkillsPanel() {
  const { adminFetch, needsAuth, hydrated } = useAdminAuth();
  const [skills, setSkills] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(null);   // skill name currently mutating, or null

  const load = async () => {
    try {
      const r = await adminFetch('/dj/skills');
      if (!r.ok) throw new Error(`failed (${r.status})`);
      const j = await r.json();
      setSkills(Array.isArray(j.skills) ? j.skills : []);
      setErr(null);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => {
    if (!hydrated || needsAuth) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, needsAuth]);

  const toggle = async (name, on) => {
    setBusy(name);
    try {
      const r = await adminFetch('/dj/skill-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, on }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `failed (${r.status})`);
      if (Array.isArray(j.skills)) setSkills(j.skills);
    } catch (e) {
      toast.error(`Toggle failed: ${e.message}`);
    } finally { setBusy(null); }
  };

  const runNow = async (name) => {
    setBusy(name);
    try {
      const r = await adminFetch('/dj/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `failed (${r.status})`);
      toast.success(j.spoken ? `On air: “${j.spoken}”` : `${name} fired`);
    } catch (e) {
      toast.error(`Run failed: ${e.message}`);
    } finally { setBusy(null); }
  };

  if (err) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <Card title="Skills">
          <div style={{ color: 'var(--danger)', fontSize: 13 }}>controller error: {err}</div>
        </Card>
      </div>
    );
  }
  if (!skills) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <Card title="Skills">
          <div style={{ color: 'var(--muted)', fontSize: 13, fontStyle: 'italic' }}>loading…</div>
        </Card>
      </div>
    );
  }

  const enabledCount = skills.filter(s => s.enabled).length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="card">
        <div style={{ padding: 16, borderBottom: '1px solid var(--ink)' }}>
          <Eyebrow color="var(--accent)">skills</Eyebrow>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>
            What the DJ does between tracks.
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
            Each skill is an autonomous segment. A skill fires only when it is enabled here
            <strong> and</strong> assigned to the persona on air — set per-persona assignments
            on the Personas page. “Run now” is an operator override and ignores both.
          </div>
        </div>
        <div style={{ padding: 14, display: 'flex', gap: 16, alignItems: 'center', background: 'var(--ink-softer)' }}>
          <span className="caption">{skills.length} skill{skills.length === 1 ? '' : 's'}</span>
          <span className="caption" style={{ color: 'var(--accent)' }}>{enabledCount} enabled</span>
        </div>
      </section>

      {/* ── SKILL LIST ───────────────────────────────────────────────────── */}
      {skills.map(s => (
        <Card
          key={s.name}
          title={s.label || s.name}
          sub={s.kind}
          right={
            <>
              <Pill tone={s.enabled ? 'accent' : ''} dot={s.enabled}>
                {s.enabled ? 'enabled' : 'disabled'}
              </Pill>
              <Toggle
                on={s.enabled}
                disabled={busy === s.name}
                onClick={() => toggle(s.name, !s.enabled)}
              />
            </>
          }
        >
          {s.ready === false && (
            <div style={{ marginBottom: 12 }}>
              <V3Alert tone="error" title="API key not set">
                This skill needs the <code>{s.requiresKey || 'required API key'}</code> environment
                variable set in <code>controller/.env</code>. Until then it stays inert and never
                fires autonomously — even when enabled.
              </V3Alert>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                {s.description || 'No description.'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill style={{ fontSize: 8 }}>{cooldownLabel(s.cooldownMs)}</Pill>
                <Pill style={{ fontSize: 8 }}>kind · {s.kind}</Pill>
              </div>
            </div>
            <Btn
              tone="accent"
              onClick={() => runNow(s.name)}
              disabled={busy === s.name}
            >
              {busy === s.name ? 'Working…' : 'Run now'}
            </Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}
