import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAds } from "../../campaigns/adsStore";
import { money } from "../../campaigns/format";
import { adsetName, campaignName } from "../../campaigns/naming";
import type { WizardAdSet, WizardCreative } from "../../campaigns/plan";
import { Equalizer } from "../../components/Modal";
import { ReleaseSearchBox } from "../../components/ReleaseSearchBox";
import { uid, useStore } from "../../lib/store";
import { CURRENT_USER_ID } from "../../lib/types";
import { countryOption } from "../../meta/presets";
import { meta } from "../../meta/provider";
import { emptyTargeting, type Reel } from "../../meta/types";
import { AdSetEditor } from "./AdSetEditor";

const STEPS = ["Campanha", "Público", "Orçamento", "Anúncios", "Revisão"];
const DRAFT_KEY = "trackscale:wizard-draft";
const MAX_MB = 100;
const MIN_BUDGET = 5;

interface Draft {
  step: number;
  smartlinkId: string | null;
  name: string;
  nameTouched: boolean;
  startDate: string;
  endDate: string;
  adsets: WizardAdSet[];
  mode: "upload" | "reels";
  creatives: WizardCreative[];
  primaryText: string;
  activate: boolean;
}

const newAdSet = (): WizardAdSet => ({
  key: uid(),
  dailyBudget: 20,
  targeting: { ...emptyTargeting(), countries: [countryOption("BR")] },
});

const blank = (): Draft => ({
  step: 0, smartlinkId: null, name: "", nameTouched: false, startDate: "", endDate: "",
  adsets: [newAdSet()], mode: "upload", creatives: [], primaryText: "", activate: true,
});

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...blank(), ...(JSON.parse(raw) as Draft) };
  } catch {
    /* ignora */
  }
  return blank();
}

export function CampaignWizard() {
  const { state, dispatch } = useAds();
  const { repo, smartlinks } = useStore();
  const navigate = useNavigate();
  const [d, setD] = useState<Draft>(loadDraft);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [reels, setReels] = useState<Reel[] | null>(null);
  const conn = state.connection;

  const patch = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }));

  // rascunho salvo a cada mudança ("o progresso é salvo como rascunho")
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* ignora */
    }
  }, [d]);

  useEffect(() => {
    if (d.mode !== "reels" || reels || !conn.pageId) return;
    let stopped = false;
    void meta.listPageReels(conn.pageId).then((r) => !stopped && setReels(r));
    return () => {
      stopped = true;
    };
  }, [d.mode, reels, conn.pageId]);

  if (!conn.connected || !conn.adAccountId) {
    return (
      <>
        <h1>Nova campanha</h1>
        <div className="card">
          <p>Conecte sua conta da Meta e escolha os ativos padrão antes de criar campanhas.</p>
          <Link className="btn" to="/campaigns">Ir para Campanhas</Link>
        </div>
      </>
    );
  }

  const release = smartlinks.find((s) => s.id === d.smartlinkId) ?? null;
  const totalBudget = d.adsets.reduce((s, a) => s + a.dailyBudget, 0);
  const adCount = d.adsets.length * d.creatives.length;

  const canNext = [
    release !== null && d.name.trim() !== "" && (!d.startDate || !d.endDate || d.startDate <= d.endDate),
    d.adsets.every((a) => a.targeting.countries.length > 0 && a.targeting.ageMin <= a.targeting.ageMax),
    d.adsets.every((a) => a.dailyBudget >= MIN_BUDGET),
    d.creatives.length > 0,
    true,
  ][d.step];

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const errors: string[] = [];
    const ok: WizardCreative[] = [];
    for (const f of Array.from(files)) {
      if (!/\.(mp4|mov)$/i.test(f.name)) errors.push(`${f.name}: só MP4 ou MOV`);
      else if (f.size > MAX_MB * 1024 * 1024) errors.push(`${f.name}: maior que ${MAX_MB} MB`);
      else ok.push({ key: uid(), source: "upload", label: f.name, sizeMb: Math.round((f.size / 1048576) * 10) / 10 });
    }
    setUploadErrors(errors);
    patch({ creatives: [...d.creatives.filter((c) => c.source === "upload"), ...ok] });
  };

  const toggleReel = (r: Reel) => {
    const has = d.creatives.some((c) => c.key === r.id);
    patch({
      creatives: has
        ? d.creatives.filter((c) => c.key !== r.id)
        : [...d.creatives.filter((c) => c.source === "ig_reel"), { key: r.id, source: "ig_reel", label: r.name }],
    });
  };

  const launch = () => {
    if (!release) return;
    dispatch({
      type: "startJob",
      input: {
        campaignName: d.name.trim(),
        smartlinkId: release.id,
        adAccountId: conn.adAccountId!,
        objective: "OUTCOME_SALES",
        startDate: d.startDate || null,
        endDate: d.endDate || null,
        primaryText: d.primaryText,
        activate: d.activate,
        adsets: d.adsets,
        creatives: d.creatives,
      },
    });
    localStorage.removeItem(DRAFT_KEY);
    navigate("/campaigns");
  };

  return (
    <>
      <div className="row row--between">
        <h1>Nova campanha</h1>
        <button className="btn btn--ghost btn--sm" onClick={() => { setD(blank()); setReels(null); setUploadErrors([]); }} title="Descartar rascunho e recomeçar">
          Descartar rascunho
        </button>
      </div>

      <ol className="stepper">
        {STEPS.map((s, i) => (
          <li key={s} className={i === d.step ? "stepper__on" : i < d.step ? "stepper__done" : ""}>
            <button type="button" disabled={i > d.step} onClick={() => patch({ step: i })}>
              <span className="stepper__n">{i < d.step ? "✓" : i + 1}</span> {s}
            </button>
          </li>
        ))}
      </ol>
      <p className="muted">· o progresso é salvo como rascunho</p>

      {d.step === 0 && (
        <section className="card">
          <label>Smartlink</label>
          {release ? (
            <div className="row row--between picked">
              <span><strong>{release.artistName} — {release.title}</strong><br /><span className="muted">/s/{release.slug}</span></span>
              <button className="btn btn--ghost btn--sm" onClick={() => patch({ smartlinkId: null })}>Trocar</button>
            </div>
          ) : (
            <ReleaseSearchBox
              repo={repo}
              userId={CURRENT_USER_ID}
              onPick={(r) => patch({ smartlinkId: r.id, name: d.nameTouched ? d.name : campaignName(r.artistName, r.title) })}
            />
          )}
          <label>Nome da campanha <span className="muted">(preenchido a partir do smartlink)</span></label>
          <input value={d.name} onChange={(e) => patch({ name: e.target.value, nameTouched: true })} />
          <div className="grid2">
            <div><label>Início (opcional)</label><input type="date" value={d.startDate} onChange={(e) => patch({ startDate: e.target.value })} /></div>
            <div><label>Fim (opcional)</label><input type="date" value={d.endDate} onChange={(e) => patch({ endDate: e.target.value })} /></div>
          </div>
          {d.startDate && d.endDate && d.startDate > d.endDate && <p className="error">A data de fim é anterior ao início.</p>}
          <p className="muted">Campanha · Vendas · Leilão · Pixel {conn.pixelId} · Conta {conn.adAccountName}</p>
        </section>
      )}

      {d.step === 1 && (
        <section>
          {d.adsets.map((a, i) => (
            <AdSetEditor
              key={a.key}
              index={i}
              value={a.targeting}
              adAccountId={conn.adAccountId!}
              onChange={(targeting) => patch({ adsets: d.adsets.map((x) => (x.key === a.key ? { ...x, targeting } : x)) })}
              onRemove={d.adsets.length > 1 ? () => patch({ adsets: d.adsets.filter((x) => x.key !== a.key) }) : undefined}
            />
          ))}
          <button
            className="btn btn--ghost"
            onClick={() => {
              const last = d.adsets[d.adsets.length - 1];
              patch({ adsets: [...d.adsets, { key: uid(), dailyBudget: last.dailyBudget, targeting: { ...last.targeting, interests: [] } }] });
            }}
          >
            + Adicionar conjunto (duplica o último com novos interesses)
          </button>
        </section>
      )}

      {d.step === 2 && (
        <section className="card">
          {d.adsets.map((a, i) => (
            <div key={a.key} className="row row--between budget">
              <span><strong>Conjunto {i + 1}</strong> <span className="muted mono">{adsetName(a.targeting)}</span></span>
              <span className="row">
                <span className="muted">R$</span>
                <input
                  type="number"
                  min={MIN_BUDGET}
                  value={a.dailyBudget}
                  onChange={(e) => patch({ adsets: d.adsets.map((x) => (x.key === a.key ? { ...x, dailyBudget: Number(e.target.value) } : x)) })}
                  aria-label={`Orçamento diário do conjunto ${i + 1}`}
                  className="w-small"
                />
                <span className="muted">/dia</span>
              </span>
            </div>
          ))}
          {d.adsets.some((a) => a.dailyBudget < MIN_BUDGET) && <p className="error">Orçamento mínimo: {money(MIN_BUDGET)}/dia por conjunto.</p>}
          <p>Total diário: <strong>{money(totalBudget)}</strong> · estimado em 30 dias: {money(totalBudget * 30)}</p>
        </section>
      )}

      {d.step === 3 && (
        <section className="card">
          <label>Como você quer criar os anúncios?</label>
          <div className="chips">
            <button aria-pressed={d.mode === "upload"} className={`chip ${d.mode === "upload" ? "chip--on" : ""}`} onClick={() => patch({ mode: "upload", creatives: d.creatives.filter((c) => c.source === "upload") })}>Enviar vídeos</button>
            <button aria-pressed={d.mode === "reels"} className={`chip ${d.mode === "reels" ? "chip--on" : ""}`} onClick={() => patch({ mode: "reels", creatives: d.creatives.filter((c) => c.source === "ig_reel") })}>Reels do Instagram</button>
          </div>

          {d.mode === "upload" ? (
            <>
              <label className="dropzone">
                <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" multiple onChange={(e) => onFiles(e.target.files)} />
                <strong>Escolher vídeos</strong>
                <span className="muted">MP4 ou MOV, até {MAX_MB} MB cada. Vários arquivos permitidos. Posicionamentos: Stories + Reels (9:16).</span>
              </label>
              {uploadErrors.map((e) => <p key={e} className="error">{e}</p>)}
            </>
          ) : reels === null ? (
            <p className="muted row"><Equalizer /> Carregando reels…</p>
          ) : (
            <div className="reels">
              {reels.map((r) => {
                const on = d.creatives.some((c) => c.key === r.id);
                return (
                  <button key={r.id} type="button" className={`reel ${on ? "reel--on" : ""}`} aria-pressed={on} onClick={() => toggleReel(r)}>
                    <span className="reel__thumb" aria-hidden="true" />
                    <span>{r.name}</span>
                    <small className="muted">{r.date}</small>
                  </button>
                );
              })}
            </div>
          )}

          {d.creatives.length > 0 && (
            <ul className="list">
              {d.creatives.map((c, i) => (
                <li key={c.key} className="row row--between creative">
                  <span>{i + 1}. {c.label} {c.sizeMb !== undefined && <span className="muted">({c.sizeMb} MB)</span>}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => patch({ creatives: d.creatives.filter((x) => x.key !== c.key) })}>Remover</button>
                </li>
              ))}
            </ul>
          )}

          <label>Texto principal (opcional) <span className="muted">— exibido acima do criativo</span></label>
          <textarea value={d.primaryText} onChange={(e) => patch({ primaryText: e.target.value })} rows={3} />
          <label className="check">
            <input type="checkbox" checked={d.activate} onChange={(e) => patch({ activate: e.target.checked })} /> Ativar a campanha ao criar
          </label>
        </section>
      )}

      {d.step === 4 && release && (
        <section className="card review">
          <h2>{d.name}</h2>
          <p className="muted">{release.artistName} — {release.title} · Vendas · {d.activate ? "será ativada" : "será criada pausada"}</p>
          {(d.startDate || d.endDate) && <p className="muted">Período: {d.startDate || "agora"} → {d.endDate || "sem fim"}</p>}
          <ul className="list">
            {d.adsets.map((a, i) => (
              <li key={a.key} className="row row--between">
                <span>Conjunto {i + 1}: <span className="mono">{adsetName(a.targeting)}</span></span>
                <span>{money(a.dailyBudget)}/dia</span>
              </li>
            ))}
          </ul>
          <div className="summary">
            <span><strong>1</strong> campanha</span>
            <span><strong>{d.adsets.length}</strong> conjunto(s)</span>
            <span><strong>{d.creatives.length}</strong> criativo(s)</span>
            <span><strong>{adCount}</strong> anúncio(s)</span>
            <span><strong>{money(totalBudget)}</strong>/dia</span>
          </div>
        </section>
      )}

      <div className="row wizard-nav">
        {d.step > 0 && <button className="btn btn--ghost" onClick={() => patch({ step: d.step - 1 })}>Voltar</button>}
        {d.step < STEPS.length - 1 ? (
          <button className="btn" disabled={!canNext} onClick={() => patch({ step: d.step + 1 })}>Continuar</button>
        ) : (
          <button className="btn btn--launch" onClick={launch}>Criar campanha</button>
        )}
      </div>
    </>
  );
}
