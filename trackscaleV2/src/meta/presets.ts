import type { TargetingOption } from "./types";

export const COUNTRIES: [string, string][] = [
  ["US", "Estados Unidos"], ["GB", "Reino Unido"], ["CA", "Canadá"], ["AU", "Austrália"],
  ["NZ", "Nova Zelândia"], ["IE", "Irlanda"], ["DE", "Alemanha"], ["AT", "Áustria"],
  ["CH", "Suíça"], ["FR", "França"], ["BE", "Bélgica"], ["NL", "Holanda"], ["SE", "Suécia"],
  ["NO", "Noruega"], ["DK", "Dinamarca"], ["FI", "Finlândia"], ["ES", "Espanha"],
  ["IT", "Itália"], ["PT", "Portugal"], ["PL", "Polônia"], ["CZ", "Tchéquia"], ["JP", "Japão"],
  ["KR", "Coreia do Sul"], ["BR", "Brasil"], ["MX", "México"], ["AR", "Argentina"],
  ["CO", "Colômbia"], ["CL", "Chile"], ["PE", "Peru"], ["UY", "Uruguai"], ["EC", "Equador"],
  ["IN", "Índia"], ["ID", "Indonésia"], ["PH", "Filipinas"], ["TR", "Turquia"],
  ["ZA", "África do Sul"], ["AO", "Angola"], ["MZ", "Moçambique"],
];

export const countryOption = (code: string): TargetingOption => ({
  id: code,
  name: COUNTRIES.find(([c]) => c === code)?.[1] ?? code,
  type: "country",
});

export const COUNTRY_PRESETS: { label: string; codes: string[] }[] = [
  { label: "Tier 1", codes: ["US", "GB", "CA", "AU", "NZ", "IE", "DE", "AT", "CH", "FR", "BE", "NL", "SE", "NO", "DK", "FI"] },
  { label: "Tier 2", codes: ["ES", "IT", "PT", "PL", "CZ", "JP", "KR"] },
  { label: "Tier 3", codes: ["BR", "MX", "AR", "CO", "CL", "PE", "IN", "ID", "PH", "TR", "ZA"] },
  { label: "Equilibrado", codes: ["US", "GB", "DE", "FR", "BR", "MX", "ES", "IT"] },
  { label: "GSA (DACH)", codes: ["DE", "AT", "CH"] },
  { label: "França", codes: ["FR"] },
  { label: "Língua espanhola", codes: ["ES", "MX", "AR", "CO", "CL", "PE", "UY", "EC"] },
  { label: "Língua portuguesa", codes: ["BR", "PT", "AO", "MZ"] },
];

export const LANGUAGES: TargetingOption[] = [
  "Português (Brasil)", "Português (Portugal)", "Inglês (EUA)", "Inglês (Reino Unido)",
  "Espanhol", "Francês", "Alemão", "Italiano", "Japonês",
].map((name, i) => ({ id: `loc_${i + 1}`, name, type: "locale" }));

export const GENRES = [
  "Pop", "Rap/R&B", "Eletrônica", "Rock/Alt", "Indie", "Latina", "Afro", "Reggae", "Jazz",
  "Clássica", "Country/Blues", "Sertanejo", "Funk", "MPB",
];

export const INTERESTS: TargetingOption[] = [
  "Electronic music", "House music", "Techno", "Drum and bass", "Hip hop music", "Trap music",
  "Rhythm and blues", "Pop music", "K-pop", "Indie rock", "Indie pop", "Alternative rock",
  "Heavy metal", "Punk rock", "Funk", "Brazilian funk", "Sertanejo", "Samba", "Pagode", "MPB",
  "Bossa nova", "Forró", "Reggaeton", "Latin music", "Afrobeats", "Amapiano", "Reggae",
  "Jazz", "Blues", "Classical music", "Lo-fi music", "Music festivals", "Concerts",
  "Live music", "Disc jockey", "Spotify", "Apple Music", "SoundCloud", "Shazam",
  "Recording studio", "Music production", "Guitar", "Vinyl records", "TikTok",
].map((name, i) => ({ id: String(6003100000 + i * 7919), name, type: "interest" }));

export const AUDIENCES: TargetingOption[] = [
  "Visitantes do smartlink (30 dias)", "Cliques em plataformas (60 dias)",
  "Engajamento no Instagram (365 dias)", "Assistiram 50% dos vídeos (30 dias)",
  "Lookalike 1% – Cliques em plataformas (BR)", "Lista de e-mail de fãs",
].map((name, i) => ({ id: `aud_${i + 1}`, name, type: "audience" }));
