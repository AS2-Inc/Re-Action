# TODO Re-Action

## Requisiti Funzionali Utente

### RF1: Registrazione nuovo utente
- Provider esterni (Google, SPID) per autenticazione
---

### RF2: Login utente
- Provider esterni (Google, SPID)
---

### RF3: Visualizzazione dashboard utente
- Grafici interattivi (implementazione frontend)
- Storico completo azioni (endpoint API)
- Ultimi premi/badge guadagnati (lista dettagliata)
- Task attive visualizzate direttamente nella dashboard
---

### RF4: Sistema di rewarding dell'utente
- **Logica calcolo streak**: aggiornamento automatico streak giorni consecutivi
- **Moltiplicatore punti basato su streak**: punti extra per streak attiva
- Endpoint per riscatto premi (spendere punti)
- Sezione "Premi" con lista sconti/premi disponibili
- Ricompense collettive per quartiere (miglioramenti infrastrutturali)
---

### RF5: Sistema di Notifiche
- **Modello Notification** per salvare notifiche
- **Servizio notifiche** con categorizzazione (Feedback, Informative, Motivazionali)
- **Scheduler notifiche giornaliere**
- Push notifications
- Invio email notifiche
- Logica motivazionale per utenti inattivi
- Notifiche per nuovi eventi/challenge
- Notifiche per progressi/feedback positivo

---

### RF6: Interazione con le task quotidiane
- **Sostituzione immediata task scaduta** (attualmente solo marca come expired)
- Logica per task "semplici" come quiz (implementazione quiz)
- Sostituzione task completata all'inizio giorno seguente (logica user-specific)

---


### RF8: Registrazione admin
- Documentazione chiara del processo in README

---


### RF10: Interfaccia lato comun
- Dashboard dedicata operatori (frontend)
- Visualizzazione dati aggregati per quartiere
- Indicatori ambientali dashboard operatore
- Report statistici (PDF/CSV export)
- Data-driven decision making tools

---

### RF11: Creazione delle task
- Sistema template task predefiniti
- UI per selezione template e configurazione
- Validazione attributi task basata su template

---

### RF12: Verifica task
- **Implementazione completa verifica GPS** (calcolo distanza, geolocation)
- **Implementazione completa verifica QR** (validazione secret)
- Verifica PHOTO_UPLOAD (upload immagini)
- Verifica QUIZ (implementazione quiz)
- Misurazione precisione verifiche (tasso errore ≤ 5%)
- Ottimizzazione tempo verifica (≤ 10 secondi)

---

### RF13: Raccolta dati
- **Anonimizzazione dati** utente nel database
- **Integrazione API open-data comunali**
- Organizzazione dati ecologici per zone
- Dashboard dati raccolti
---

## Requisiti Comuni
### RF14: Pagina di presentazione
- Pagina landing informativa
- Statistiche pubbliche incentivanti
- Link accesso e registrazione
---

### RF17: Classifica territoriale
- **Calcolo automatico classifica** basato su punteggi
- **Aggiornamento in tempo reale** (± 10 secondi)
- **Endpoint GET `/api/v1/neighborhoods/ranking`** per ottenere classifica
- Visualizzazione grafica (tabelle, mappe, grafici)
- Integrazione indicatori ambientali da open data

---

## Priorità Implementazione

### ALTA PRIORITÀ
1. **RF4 - Sistema Streak completo**: Calcolo automatico streak e moltiplicatore punti
2. **RF5 - Sistema Notifiche**: Modello, servizio e scheduler notifiche
4. **RF12 - Verifica Task completa**: GPS, QR, Photo, Quiz verification
5. **RF17 - Classifica Territoriale**: Endpoint ranking e aggiornamento real-time

### MEDIA PRIORITÀ
6. **RF6 - Gestione Task**: Sostituzione automatica task scadute/completate
7. **RF4 - Riscatto Premi**: Endpoint redemption e gestione stock
8. **RF10 - Dashboard Operatore**: Visualizzazione dati aggregati

### BASSA PRIORITÀ
10. **RF13 - Open Data Integration**: API integrazione dati comunali
11. **RF13 - Anonimizzazione**: Privacy compliance
12. **RF2 - OAuth Providers**: Google, SPID authentication
13. **RF2 - Password Hashing**: Bcrypt implementation
14. **Frontend**: Implementazione completa tutte le view