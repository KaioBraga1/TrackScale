import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { uid, useMySmartlinks, useStore } from "../lib/store";
import { CURRENT_USER_ID } from "../lib/types";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const PLATFORMS = ["Spotify", "Apple Music", "YouTube Music", "Deezer"];

export function Smartlinks() {
  const links = useMySmartlinks();
  const { smartlinks, dispatch } = useStore();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const slug = slugify(`${artist}-${title}`);
    if (!title.trim() || !artist.trim()) return setError("Informe artista e título.");
    if (smartlinks.some((s) => s.slug === slug && s.deletedAt === null))
      return setError("Já existe um smartlink com esse slug.");
    const platformLinks = PLATFORMS.filter((p) => urls[p]?.trim()).map((p) => ({
      platform: p,
      url: urls[p].trim(),
    }));
    if (platformLinks.some((l) => !/^https?:\/\//i.test(l.url)))
      return setError("As URLs precisam começar com http:// ou https://");
    if (platformLinks.length === 0) return setError("Adicione ao menos um link de plataforma.");

    dispatch({
      type: "addSmartlink",
      smartlink: {
        id: uid(),
        userId: CURRENT_USER_ID,
        type: "smartlink",
        title: title.trim(),
        artistName: artist.trim(),
        slug,
        createdAt: new Date().toISOString(),
        deletedAt: null,
        links: platformLinks,
      },
    });
    setTitle("");
    setArtist("");
    setUrls({});
    setError("");
  };

  return (
    <>
      <h1>Smartlinks</h1>
      <form className="card" onSubmit={submit}>
        <div className="row">
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artista" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da faixa" />
        </div>
        {PLATFORMS.map((p) => (
          <input
            key={p}
            value={urls[p] ?? ""}
            onChange={(e) => setUrls({ ...urls, [p]: e.target.value })}
            placeholder={`URL ${p} (opcional)`}
          />
        ))}
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">Criar smartlink</button>
      </form>

      <ul className="list">
        {links.map((l) => (
          <li key={l.id} className="card row row--between">
            <span>
              <strong>{l.artistName} — {l.title}</strong>
              <br />
              <Link to={`/s/${l.slug}`}>/s/{l.slug}</Link>
            </span>
            <button
              className="btn btn--ghost"
              onClick={() => dispatch({ type: "deleteSmartlink", id: l.id })}
            >
              Excluir
            </button>
          </li>
        ))}
        {links.length === 0 && <li className="muted">Nenhum smartlink ainda.</li>}
      </ul>
    </>
  );
}
