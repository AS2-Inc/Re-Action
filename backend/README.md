# Re:Action Backend

API backend per Re:Action, una piattaforma di gamification per quartieri. Il progetto fornisce un'API RESTful costruita con Node.js e Express, collegata a un database MongoDB.

## Indice

- [Architettura](#architettura)
- [Struttura del Progetto](#struttura-del-progetto)
- [Primi Passi](#primi-passi)
- [Configurazione](#configurazione)
- [Sviluppo](#sviluppo)
- [Testing](#testing)
- [Documentazione API](#documentazione-api)

## Architettura

Il progetto segue un pattern di **Architettura a Livelli** per garantire la separazione delle responsabilità:

1. **Routers** (`app/routers/`): Gestiscono le richieste HTTP, validano l'input e instradano verso il servizio appropriato. Definiscono gli endpoint API.
2. **Controllers** (`app/controllers/`): Gestiscono la logica di request/response, delegando la business logic ai servizi.
3. **Services** (`app/services/`): Contengono la logica di business principale. Interagiscono con i modelli dati e altri servizi.
4. **Models** (`app/models/`): Definiscono gli schemi dati MongoDB tramite Mongoose.
5. **Middleware** (`app/middleware/`): Gestiscono aspetti trasversali come autenticazione (`token_checker`), autorizzazione (`role_checker`), validazione (`validation`) e upload file (`upload`).

### Tecnologie Principali

- **Runtime**: Node.js (>= 25.0.0)
- **Framework**: Express.js 5
- **Database**: MongoDB con Mongoose ODM
- **Autenticazione**: JWT + Google OAuth 2.0
- **Email**: Nodemailer (SMTP)
- **Scheduling**: node-cron
- **Upload File**: Multer
- **Testing**: Jest + Supertest + mongodb-memory-server
- **Qualità del Codice**: Biome (linting e formatting)

## Struttura del Progetto

```
backend/
├── app/
│   ├── config/         # File di configurazione (connessione DB, ecc.)
│   ├── controllers/    # Controller per request/response
│   ├── middleware/      # Middleware Express personalizzati
│   ├── models/          # Schemi e modelli Mongoose
│   ├── routers/         # Definizione delle route API
│   ├── services/        # Livello di business logic
│   └── utils/           # Funzioni di utilità
├── test/
│   ├── integration/     # Test di integrazione (API con DB in memoria)
│   ├── unit/            # Test unitari (con mock)
│   └── db_helper.js     # Helper per la gestione del DB nei test
├── index.js             # Entry point dell'applicazione
├── oas3.yml             # Specifica OpenAPI 3.0
└── package.json         # Dipendenze e script
```

### Router Disponibili

| Router | Prefisso | Descrizione |
| :--- | :--- | :--- |
| Users | `/api/v1/users` | Autenticazione, registrazione, profilo utente, dashboard, badge |
| Tasks | `/api/v1/tasks` | Creazione, assegnazione, submission e verifica task |
| Neighborhoods | `/api/v1/neighborhood` | Informazioni quartieri e classifica |
| Operators | `/api/v1/operators` | Registrazione e autenticazione operatori, dashboard operatore |
| Rewards | `/api/v1/rewards` | Catalogo premi e riscatto |
| Notifications | `/api/v1/notifications` | Notifiche utente e preferenze |

## Primi Passi

### Prerequisiti

- Node.js (v25+)
- npm
- Istanza MongoDB (locale o Atlas)

### Installazione

1. **Installare le dipendenze:**
   ```bash
   npm install
   ```

2. **Configurazione ambiente:**
   Creare un file `.env` nella root del backend con le variabili di configurazione (vedi [Configurazione](#configurazione)).

3. **Avviare il server di sviluppo:**
   ```bash
   npm run dev
   ```
   Il server si avvierà sulla porta 5000 (default) con hot-reloading abilitato.

## Configurazione

L'applicazione è configurata tramite variabili d'ambiente.

| Variabile | Descrizione | Obbligatoria | Default |
| :--- | :--- | :--- | :--- |
| `PORT` | Porta del server API | No | `5000` |
| `DB_URL` | Stringa di connessione MongoDB | Sì | - |
| `NODE_ENV` | Ambiente (`development`/`production`) | No | `development` |
| `SUPER_SECRET` | Chiave segreta per la firma dei JWT | Sì | - |
| `ADMIN_EMAIL` | Email per l'account admin iniziale | Sì | - |
| `ADMIN_PASSWORD` | Password per l'account admin iniziale | Sì | - |
| `SMTP_HOST` | Host del server SMTP | Sì | - |
| `SMTP_PORT` | Porta del server SMTP | Sì | - |
| `SMTP_SECURE` | Usa SSL/TLS per SMTP | Sì | - |
| `SMTP_USER` | Username SMTP | Sì | - |
| `SMTP_PASS` | Password SMTP | Sì | - |
| `SMTP_FROM` | Indirizzo email per le mail in uscita | Sì | - |
| `GOOGLE_CLIENT_ID` | Client ID per Google OAuth 2.0 | Sì | - |

## Sviluppo

### Qualità del Codice

Il progetto utilizza [Biome](https://biomejs.dev/) per linting e formatting.

- **Controlla formato**: `npm run format`
- **Lint**: `npm run lint`
- **Fix Lint**: `npm run lint:fix`

### Script Disponibili

| Script | Descrizione |
| :--- | :--- |
| `npm start` | Avvia il server in produzione |
| `npm run dev` | Avvia il server in sviluppo con hot-reload |
| `npm test` | Esegue tutti i test |
| `npm run test:unit` | Esegue solo i test unitari |
| `npm run test:integration` | Esegue solo i test di integrazione |
| `npm run lint` | Controlla il codice con Biome |
| `npm run lint:fix` | Corregge automaticamente i problemi di lint |
| `npm run format` | Formatta il codice con Biome |
| `npm run build:frontend` | Build del frontend |

## Testing

Il progetto utilizza **Jest** come test runner, **Supertest** per i test di integrazione API e **mongodb-memory-server** per un database MongoDB in memoria durante i test.

- **Tutti i test**: `npm test`
- **Solo unit**: `npm run test:unit`
- **Solo integrazione**: `npm run test:integration`
- **Con coverage**: `npm test -- --coverage`

I test si trovano nella directory `test/`, suddivisi in:

- `test/unit/` — Test unitari con mock delle dipendenze
- `test/integration/` — Test di integrazione con DB in memoria e richieste HTTP reali

## Documentazione API

- **Swagger UI**: Disponibile su `/api-docs` quando il server è in esecuzione (es. `http://localhost:5000/api-docs`).
- **Specifica**: La specifica OpenAPI 3.0 si trova in `oas3.yml`.