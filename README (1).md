# 🃏 Durak Online

Multiplayer karetní hra Durak. React + Supabase + Tailwind CSS.

## Spuštění lokálně

```bash
# 1. Nainstaluj závislosti
npm install

# 2. Vytvoř .env soubor
cp .env.example .env
# Vyplň své Supabase klíče v .env

# 3. Spusť Supabase SQL schema
# Zkopíruj obsah supabase-schema.sql do Supabase SQL Editoru

# 4. Spusť vývojový server
npm run dev
```

Otevři http://localhost:3000

## Nasazení na Render.com

1. Pushni kód na GitHub
2. Na Render.com vytvoř **Static Site**
3. Připoj GitHub repozitář
4. Nastav:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
5. V **Environment Variables** přidej:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Nastavení Supabase

1. Vlož `supabase-schema.sql` do SQL Editoru
2. Authentication → Email → vypni **Confirm email**
3. Realtime je zapnutý automaticky (schema to řeší)

## Herní režimy

| Nastavení | Možnosti |
|-----------|----------|
| Balíček | 24 / 36 / 52 karet |
| Hráčů | 2 – 6 |
| Režim | Podhazovací / Přesouvací |
| Útok | Všichni / Jen sousedé |
| Jednou a dost | Zapnout / Vypnout |
| Fair play | Zapnout / Vypnout |
