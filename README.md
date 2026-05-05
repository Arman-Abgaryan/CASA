💰 CASA — Your Personal Finance App

**CASA** is your digital home for all things money. It’s a sleek, smart personal finance app that helps you **track, manage, and understand your expenses** — all in one place.

Whether you’re splitting rent, saving for your next trip, or just trying to make sense of where your paycheck disappears, CASA gives you the tools and insights to take control.

---

## ✨ Key Features

- 🧾 **Expense Tracking** — Log your daily transactions with just a few clicks.  
- 📊 **Visual Insights** — Interactive charts and analytics that reveal your spending habits.  
- 💬 **Smart Service Chat** — Get quick answers, tips, and help through an integrated in-app chat.  
- 🤖 **AI Finance Advisor** — Receive personalized financial advice, summaries, and savings suggestions powered by AI.  
- 🔍 **Smart Filters** — Search and filter expenses by category, date, or payment status.  
- 💼 **Multi-Category Management** — Track expenses across groceries, rent, leisure, transport, and more.  
- 📅 **Transaction History** — Keep an organized record of every expense and income source.

---

## 🚀 Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/casa.git
   cd casa
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the app:**

   ```bash
   npm run dev
   ```

---

## 🤖 Gemini-powered CSV Import

CSV imports go through Google Gemini, which automatically detects the issuing bank (Chase, Citibank, Bank of America, etc.) and categorizes each row.

To enable CSV import you need a free Gemini API key:

1. Go to [aistudio.google.com](https://aistudio.google.com/apikey) and sign in with a Google account.
2. Click **Create API key** — no credit card required.
3. Add it to your backend `.env`:

   ```bash
   GEMINI_API_KEY=your_key_here
   # Optional — defaults to gemini-2.5-flash
   GEMINI_MODEL=gemini-2.5-flash
   ```

The free tier (`gemini-2.5-flash`) gives you 10 requests/minute and 250 requests/day, which is plenty for personal use. Each CSV import is a single request regardless of how many rows it contains.

---

## 📄 Claude-powered PDF Statement Upload

In addition to CSV imports, CASA can ingest PDF bank statements directly. The "Upload Statement" button on the Transactions page sends the PDF to Anthropic's Claude API, which extracts every transaction in a structured JSON format that the app then previews before persisting.

This shares the same `ANTHROPIC_API_KEY` that powers Benjamin (the AI advisor), so if Benjamin already works for you, statement upload will too. PDF imports are tagged with `bankName = "Statement Upload"` so they show up clearly in the transactions table and dedupe correctly across re-imports of the same file.

---

## 🏦 Bank labels on transactions

Every transaction carries a `bankName`:

- **Plaid-linked transactions** are labeled with the institution name returned by Plaid (e.g. "Chase").
- **CSV-imported transactions** are labeled with the bank Gemini detected from the file format.
- **PDF statement uploads** are labeled `"Statement Upload"`.
- **Manually-added transactions** are labeled `"Manual"`.

If you're upgrading an existing database, the `bank_name` column will be added automatically by Hibernate (`ddl-auto=update`) but old rows will be `NULL`. The frontend renders `NULL` as `"Manual"`, but for cleanliness you can run:

```sql
UPDATE transactions SET bank_name = 'Manual' WHERE bank_name IS NULL;
```


