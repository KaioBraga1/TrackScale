import { useCallback } from "react";
import { adsetName } from "../../campaigns/naming";
import { MultiSearchSelect } from "../../components/MultiSearchSelect";
import { COUNTRY_PRESETS, countryOption } from "../../meta/presets";
import { meta } from "../../meta/provider";
import type { Gender, Targeting, TargetingOption } from "../../meta/types";

const searchCountries = (q: string) => meta.searchTargeting("country", q);
const searchLanguages = (q: string) => meta.searchTargeting("locale", q);
const searchInterests = (q: string) => meta.searchTargeting("interest", q);

interface Props {
  index: number;
  value: Targeting;
  onChange: (t: Targeting) => void;
  onRemove?: () => void;
  adAccountId: string;
}

export function AdSetEditor({ index, value, onChange, onRemove, adAccountId }: Props) {
  const set = (patch: Partial<Targeting>) => onChange({ ...value, ...patch });

  const searchAudiences = useCallback(
    async (q: string): Promise<TargetingOption[]> => {
      const all = await meta.listCustomAudiences(adAccountId);
      const t = q.trim().toLowerCase();
      return all.filter((a) => a.name.toLowerCase().includes(t));
    },
    [adAccountId],
  );

  const addPreset = (codes: string[]) => {
    const have = new Set(value.countries.map((c) => c.id));
    set({ countries: [...value.countries, ...codes.filter((c) => !have.has(c)).map(countryOption)] });
  };

  return (
    <div className="card adset">
      <div className="row row--between">
        <strong>Conjunto {index + 1}</strong>
        <span className="row">
          <span className="muted mono">{adsetName(value)}</span>
          {onRemove && <button className="btn btn--ghost btn--sm" onClick={onRemove}>Remover conjunto</button>}
        </span>
      </div>

      <label>Países</label>
      <div className="chips">
        {COUNTRY_PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip" onClick={() => addPreset(p.codes)} title={p.codes.join(", ")}>
            + {p.label}
          </button>
        ))}
        {value.countries.length > 0 && (
          <button type="button" className="chip" onClick={() => set({ countries: [] })}>Limpar</button>
        )}
      </div>
      <MultiSearchSelect selected={value.countries} onChange={(countries) => set({ countries })} search={searchCountries} placeholder="Buscar países…" />

      <label>Idiomas <span className="muted">(vazio = todos, recomendado)</span></label>
      <MultiSearchSelect selected={value.languages} onChange={(languages) => set({ languages })} search={searchLanguages} placeholder="Restringir a idiomas…" />

      <label>Interesses <span className="muted">(opcional — vazio = público amplo)</span></label>
      <MultiSearchSelect selected={value.interests} onChange={(interests) => set({ interests })} search={searchInterests} placeholder="Buscar interesses, ex.: house music" minLength={2} />

      <div className="grid2">
        <div>
          <label>Idade</label>
          <div className="row">
            <input className="w-small" type="number" min={13} max={65} value={value.ageMin} onChange={(e) => set({ ageMin: Number(e.target.value) })} aria-label="Idade mínima" />
            <span className="muted">até</span>
            <input className="w-small" type="number" min={13} max={65} value={value.ageMax} onChange={(e) => set({ ageMax: Number(e.target.value) })} aria-label="Idade máxima" />
          </div>
          {value.ageMin > value.ageMax && <p className="error">A idade mínima é maior que a máxima.</p>}
        </div>
        <div>
          <label>Gênero</label>
          <div className="chips">
            {([["all", "Todos"], ["men", "Homens"], ["women", "Mulheres"]] as [Gender, string][]).map(([g, l]) => (
              <button key={g} type="button" aria-pressed={value.gender === g} className={`chip ${value.gender === g ? "chip--on" : ""}`} onClick={() => set({ gender: g })}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <details className="more">
        <summary>Públicos personalizados (opcional)</summary>
        <label>Incluir</label>
        <MultiSearchSelect selected={value.includeAudiences} onChange={(includeAudiences) => set({ includeAudiences })} search={searchAudiences} placeholder="Buscar públicos para incluir…" />
        <label>Excluir</label>
        <MultiSearchSelect selected={value.excludeAudiences} onChange={(excludeAudiences) => set({ excludeAudiences })} search={searchAudiences} placeholder="Buscar públicos para excluir…" />
      </details>
    </div>
  );
}
