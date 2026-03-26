# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Sincronizzazione da Zenith Finances

Questo progetto include un sistema di sincronizzazione automatica con Zenith Finances per importare transazioni, categorie, promemoria e metodi di pagamento.

### Configurazione

1. **Variabili d'ambiente**: Aggiungi le seguenti variabili al tuo progetto Supabase:
   ```
   ZENITH_SUPABASE_URL=https://igptngecujtkofhbzjmj.supabase.co
   ZENITH_SUPABASE_SERVICE_ROLE_KEY=<inserisci la chiave service role>
   ```

2. **Accesso Dashboard**: Gli amministratori possono accedere alla dashboard di sincronizzazione all'indirizzo `/admin/zenith-sync`

3. **Sincronizzazione automatica**: Una volta configurato, il sistema esegue automaticamente la sincronizzazione secondo l'intervallo impostato (default: ogni ora)

### Dati Sincronizzati

Il sistema sincronizza i seguenti dati da Zenith Finances:

- **Transazioni**: Tutte le transazioni (entrate/uscite) con importi, categorie, date e informazioni ricorrenti
- **Categorie**: Categorie personalizzate con icone e colori
- **Promemoria/Scadenze**: Promemoria con date di scadenza e descrizioni
- **Metodi di pagamento**: Metodi di pagamento personalizzati

### Funzionalità

- **Sincronizzazione manuale**: Trigger manuale per sincronizzazione immediata
- **Sincronizzazione automatica**: Esecuzione programmata in base all'intervallo configurato
- **Deduplicazione**: Usa il campo `zenith_id` per evitare duplicati
- **Risoluzione conflitti**: Last-write-wins basato su timestamp `updated_at`
- **Log dettagliati**: Tracciamento completo di ogni operazione di sincronizzazione
- **Statistiche**: Dashboard con metriche di sincronizzazione e tasso di successo

### Sicurezza

- Solo gli amministratori possono accedere alla dashboard di sincronizzazione
- Le credenziali Zenith sono memorizzate in modo sicuro come variabili d'ambiente
- Row Level Security (RLS) attivo su tutte le tabelle di sincronizzazione
