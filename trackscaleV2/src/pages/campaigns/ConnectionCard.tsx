import { useEffect, useState } from "react";
import { Equalizer } from "../../components/Modal";
import { useAds, type Connection } from "../../campaigns/adsStore";
import { meta } from "../../meta/provider";
import type { AdAccount, Business, FbPage, Pixel } from "../../meta/types";

export function ConnectionCard() {
  const { state, dispatch } = useAds();
  const c = state.connection;
  const [editing, setEditing] = useState(false);

  if (c.connected && !editing) {
    return (
      <div className="card card--conn">
        <div className="row row--between">
          <span>
            <span className="dot dot--on" /> Conectado a <strong>{c.business?.name}</strong>
            <div className="muted">
              Conta: {c.adAccountName} · Pixel: {c.pixelId} · Página: {c.pageName}
              {c.igUsername ? ` · IG @${c.igUsername}` : ""}
            </div>
          </span>
          <span className="row">
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>Alterar ativos padrão</button>
            <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "disconnect" })}>Desconectar</button>
          </span>
        </div>
      </div>
    );
  }

  return (
    <AssetPicker
      initial={c}
      onCancel={c.connected ? () => setEditing(false) : undefined}
      onSave={(connection) => {
        dispatch({ type: "connect", connection });
        setEditing(false);
      }}
    />
  );
}

function AssetPicker({ initial, onSave, onCancel }: { initial: Connection; onSave: (c: Connection) => void; onCancel?: () => void }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [pages, setPages] = useState<FbPage[]>([]);
  const [businessId, setBusinessId] = useState(initial.business?.id ?? "");
  const [accountId, setAccountId] = useState(initial.adAccountId ?? "");
  const [pixelId, setPixelId] = useState(initial.pixelId ?? "");
  const [pageId, setPageId] = useState(initial.pageId ?? "");
  const [ig, setIg] = useState<string | null>(initial.igUsername);
  const [resolvingIg, setResolvingIg] = useState(false);

  useEffect(() => {
    void meta.listBusinessManagers().then(setBusinesses);
    void meta.listPages().then(setPages);
  }, []);

  useEffect(() => {
    setAccounts([]);
    if (businessId) void meta.listAdAccounts(businessId).then(setAccounts);
  }, [businessId]);

  useEffect(() => {
    setPixels([]);
    if (accountId) void meta.listPixels(accountId).then(setPixels);
  }, [accountId]);

  useEffect(() => {
    if (!pageId) return;
    let stopped = false;
    setResolvingIg(true);
    void meta.resolvePageIg(pageId).then((u) => {
      if (!stopped) {
        setIg(u);
        setResolvingIg(false);
      }
    });
    return () => {
      stopped = true;
    };
  }, [pageId]);

  const business = businesses.find((b) => b.id === businessId) ?? null;
  const ready = business && accountId && pixelId && pageId && !resolvingIg;

  return (
    <div className="card glow-border">
      <div className="row row--between">
        <strong>Meta Business Manager</strong>
        <span className="badge">Conexão simulada</span>
      </div>
      <p className="muted">Selecione os ativos padrão usados ao criar campanhas.</p>
      <div className="grid2">
        <Select label="Business" value={businessId} onChange={(v) => { setBusinessId(v); setAccountId(""); setPixelId(""); }} options={businesses} placeholder="Escolha um business" />
        <Select label="Conta de anúncios" value={accountId} onChange={(v) => { setAccountId(v); setPixelId(""); }} options={accounts} placeholder={businessId ? "Escolha a conta" : "Escolha o business primeiro"} />
        <Select label="Pixel / Dataset" value={pixelId} onChange={setPixelId} options={pixels} placeholder={accountId ? "Escolha o pixel" : "Escolha a conta primeiro"} />
        <Select label="Página do Facebook" value={pageId} onChange={setPageId} options={pages} placeholder="Escolha a página" />
      </div>
      {pageId && (
        <p className="muted row">
          {resolvingIg ? (<><Equalizer /> Buscando conta do Instagram…</>) : ig ? `Instagram: @${ig}` : "Nenhuma conta do Instagram vinculada"}
        </p>
      )}
      <div className="row">
        {onCancel && <button className="btn btn--ghost" onClick={onCancel}>Cancelar</button>}
        <button
          className="btn"
          disabled={!ready}
          onClick={() =>
            onSave({
              connected: true,
              business,
              adAccountId: accountId,
              adAccountName: accounts.find((a) => a.id === accountId)?.name ?? accountId,
              pixelId,
              pageId,
              pageName: pages.find((p) => p.id === pageId)?.name ?? pageId,
              igUsername: ig,
            })
          }
        >
          {initial.connected ? "Salvar ativos" : "Conectar"}
        </button>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: { id: string; name: string }[]; placeholder: string;
}) {
  return (
    <div>
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={options.length === 0}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
