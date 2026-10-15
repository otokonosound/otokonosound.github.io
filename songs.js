/* L'album mis en avant dans le jeu.
   releaseDate : date de sortie (compte à rebours) · release : la même date écrite en toutes lettres.
   instagram : pseudo sans @ · soundcloud : lien du profil ou de l'album. */
window.OTOKO_ALBUM = {
  artist: 'Otoko', title: "I'm Alive",
  releaseDate: '2026-12-04', release: 'le 4 décembre 2026',
  instagram: 'otokonosound',
  soundcloud: 'https://on.soundcloud.com/2hNASd9oK4ySygQZ19',
  trackCount: 12,
  // la tracklist dans l'ordre de l'album. id = celui du titre jouable (OTOKO_SONGS) ; date = jour où il devient jouable
  tracklist: [
    { title: 'Analog Shadows', id: 'analog-shadows' },
    { title: 'Concrete Jungle', date: '2026-11-13' },
    { title: 'Trace', date: '2026-11-20' },
    { title: 'Soul Searching', date: '2026-11-27' },
    { title: 'Hazy Summer', date: '2026-12-04' },
    { title: "I'm Alive", id: 'im-alive' },
    { title: 'Kill The Groove', date: '2026-12-04' },
    { title: 'Igniting Stars', date: '2026-12-04' },
    { title: 'New Dawn', date: '2026-12-04' },
    { title: 'Echoes & Ashes', date: '2026-12-04' },
    { title: 'Empires Fall', date: '2026-12-04' },
    { title: 'La vie promise', date: '2026-12-04' }
  ],
  challenge: '4 étoiles sur Analog Shadows en Difficile'
};

/* Titres jouables. unlock (facultatif) : date à partir de laquelle le titre se débloque (AAAA-MM-JJ).
   Ajouter un titre = une ligne ici + son mp3 dans audio/ + sa partition dans charts/. */
window.OTOKO_SONGS = [
  { id: 'analog-shadows', title: 'Analog Shadows', sub: "Otoko · I'm Alive", src: 'audio/analog-shadows.mp3', chart: 'charts/analog-shadows.json?v=7' },
  { id: 'im-alive', title: "I'm Alive", sub: "Otoko · I'm Alive", src: 'audio/im-alive.mp3', chart: 'charts/im-alive.json?v=7' }
];
