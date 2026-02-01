# TODO Re-Action

## Requisiti Funzionali Utente

### RF3: Visualizzazione dashboard utente
- Grafici interattivi (implementazione frontend)
- Storico completo azioni (endpoint API)
- Ultimi premi/badge guadagnati (lista dettagliata)
- Task attive visualizzate direttamente nella dashboard
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

### RF10: Interfaccia lato comune
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
- **Aggiornamento in tempo reale** (± 10 secondi)
- Visualizzazione grafica (tabelle, mappe, grafici)
- Integrazione indicatori ambientali da open data

---

## Priorità Implementazione

### ALTA PRIORITÀ
1. **RF5 - Sistema Notifiche**: Modello, servizio e scheduler notifiche
2. **RF12 - Verifica Task completa**: GPS, QR, Photo, Quiz verification

### MEDIA PRIORITÀ
3. **RF6 - Gestione Task**: Sostituzione automatica task scadute/completate
4. **RF4 - Riscatto Premi**: Endpoint redemption e gestione stock
5. **RF10 - Dashboard Operatore**: Visualizzazione dati aggregati

### BASSA PRIORITÀ
6. **RF13 - Open Data Integration**: API integrazione dati comunali
7. **RF13 - Anonimizzazione**: Privacy compliance
8. **RF2 - Password Hashing**: Bcrypt implementation
9. **Frontend**: Implementazione completa tutte le view