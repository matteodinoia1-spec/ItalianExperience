# Notion audit: convenzioni “memoria di progetto”

Lo spazio Notion **“Italian Experience – Audit progetto”** è la **memoria ad alto livello** del progetto: struttura, schema Supabase, Edge Functions, flussi. Non è un changelog. Le pagine esistenti sono lo snapshot di riferimento; non riscrivere, eliminare o riorganizzare le pagine Notion.

## Principio

- **Fonte in repo**: `docs/AUDIT-COMPLETO-PROGETTO-NOTION.md` è la fonte di verità per il contenuto dell’audit.
- **Notion**: deve restare allineato a quel file quando si fa una sync (stesso contenuto, organizzato in pagine/block).
- **Sync solo quando** si verifica un trigger materiale o l’utente lo richiede esplicitamente.

## Quando aggiornare (trigger)

Aggiorna **AUDIT-COMPLETO-PROGETTO-NOTION.md** e poi **Notion** **solo** in uno di questi casi:

| Trigger | Esempi |
|--------|--------|
| **Cambio di architettura materiale** | Nuova area/modulo significativo; cambi sostanziali alla struttura documentata (nuove cartelle o file che cambiano ruoli). |
| **Cambio di schema DB materiale** | Nuove tabelle/colonne; migrazioni che modificano lo schema documentato. |
| **RLS / Storage / Edge Functions** | Policy RLS o storage modificate in modo sostanziale; nuovo comportamento o input/output di prepare/submit/promote o shared. |
| **Nuovo modulo o area di sistema maggiore** | Aggiunta di un sottosistema documentabile (es. nuovo flusso backend o area portal). |
| **Flusso di business core** | Cambi al flusso candidatura pubblica, revisione submission, auth portal, job postings, path/base path — solo se il flusso documentato non è più corretto. |
| **Richiesta esplicita** | L’utente chiede esplicitamente di sincronizzare l’audit su Notion. |

## Quando NON aggiornare

**Non** aggiornare l’audit (markdown o Notion) per:

- modifiche minori al codice;
- modifiche a UI o stili (CSS, markup cosmetrico);
- correzioni di battitura (typo);
- modifiche solo a commenti;
- piccole modifiche di wording al README o ad altri doc;
- refactor piccoli che non cambiano l’architettura documentata.

## Workflow di aggiornamento (quando un trigger si applica)

1. **Aggiorna il markdown**  
   Modifica `docs/AUDIT-COMPLETO-PROGETTO-NOTION.md`: albero (sez. 2), audit file (sez. 3), Supabase (sez. 4–5), logica (sez. 6), riepilogo (sez. 7) a seconda di cosa è cambiato.

2. **Sincronizza su Notion**  
   Usa il Notion MCP (quando disponibile) per aggiornare le pagine corrispondenti nello spazio “Italian Experience – Audit progetto”.  
   Pagine da tenere allineate (solo quelle toccate dalle modifiche): *Albero del progetto*, *Audit file – …*, *Supabase – Database, RLS, Storage*, *Supabase – Edge Functions*, *Schema tabelle Supabase*, *Policy RLS e Storage – dettaglio*, *Logica di business*, *Env e secrets*, *Codici risposta Edge Functions*, *Diagrammi di flusso*, *Riferimenti documentazione*, *Inventario file completo*.

3. **Commit**  
   Includi nel commit le modifiche al repo e l’aggiornamento di `AUDIT-COMPLETO-PROGETTO-NOTION.md`; l’aggiornamento Notion va fatto nella stessa sessione (o subito dopo).

## Riferimenti

- `docs/AUDIT-COMPLETO-PROGETTO-NOTION.md` – contenuto completo audit.
- `docs/README.md` – indice doc, nota su Notion audit.
- `docs/ai/README.md` – regola per AI: quando aggiornare l’audit Notion.
- `.cursor/rules/notion-audit-sync.mdc` – regola Cursor per sync audit/Notion.
