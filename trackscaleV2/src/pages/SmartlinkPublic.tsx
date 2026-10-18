import { useParams, useSearchParams } from "react-router-dom";
import { uid, useStore } from "../lib/store";

/** Página pública do smartlink: registra o clique (com a campanha de origem) e abre a plataforma. */
export function SmartlinkPublic() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const campaignId = params.get("tsc") ?? undefined;
  const { smartlinks, dispatch } = useStore();
  const link = smartlinks.find((s) => s.slug === slug && s.deletedAt === null);

  if (!link) return <main className="page public"><h1>Link não encontrado</h1></main>;

  const go = (platform: string, url: string) => {
    dispatch({
      type: "addClick",
      click: { id: uid(), smartlinkId: link.id, platform, at: new Date().toISOString(), campaignId },
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="page public">
      <div className="public__cover glow-border" aria-hidden="true">
        <span className="eq eq--on eq--big"><span /><span /><span /><span /><span /></span>
      </div>
      <h1 className="glow-text">{link.title}</h1>
      <p className="muted">{link.artistName}</p>
      {link.links.map((l) => (
        <button key={l.platform} className="btn btn--block btn--shine" onClick={() => go(l.platform, l.url)}>
          Ouvir no {l.platform}
        </button>
      ))}
    </main>
  );
}
