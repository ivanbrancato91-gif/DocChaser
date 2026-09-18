# DocChaser v1.3.0

## Document upload in pratica
- Upload diretto per lo staff autenticato dalla pagina dettaglio pratica.
- Validazione server-side esistente: 20 MB, PDF/JPEG/PNG e magic bytes.
- Stato della pratica e del documento aggiornati dopo upload.
- Errori di upload mostrati senza perdere il contesto della pratica.
- `/upload` ora evita una schermata non funzionale e riporta alle pratiche.
- Il consenso privacy resta obbligatorio per gli upload dal portale pubblico, non per lo staff autenticato.
- Creazione cliente: il campo note viene ora salvato.
