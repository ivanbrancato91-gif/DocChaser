# DocChaser v2.1.0

## Ricerca globale

- Ricerca autenticata di clienti, pratiche e documenti dalla barra superiore.
- Risultati live con debounce di 180 ms.
- Risultati limitati a 20 elementi per risposta.
- Collegamenti diretti a cliente o pratica.
- La ricerca documenti mostra pratica e stato del documento.
- Controllo organizzazione server-side: nessun risultato cross-tenant.
- Rate limiting: 60 richieste/minuto per IP.
- Sanitizzazione di `%` e `_` nei termini `ILIKE` per evitare wildcard indesiderate.
- UI responsive con dropdown desktop e pannello mobile.
