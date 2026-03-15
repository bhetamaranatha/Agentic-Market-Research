# 🚀 Agentic Market Research: Location Intelligence Dashboard

A professional-grade market research tool that leverages the **Google Places API (New)** and **Supabase** to provide high-fidelity location intelligence, competitive analysis, and strategic entry advisory.

![Dashboard Preview](https://raw.githubusercontent.com/username/repo/main/preview.png) *(Replace with actual screenshot link after upload)*

## 🌟 Key Features

### 🔍 Intent-Based Search Intelligence
Unlike standard maps, this engine prioritizes your specific search intent. Searching for "coffeshop" will highlight and prioritize actual coffee shops at the top of your list, while still scanning the broader regional context for metrics.

### 📊 Proximity-Based "Activity Index"
A proprietary density metric that goes beyond "business count." It calculates the **geometric proximity** of businesses to your search core, offering a truer representation of local market concentration and activity hubs.

### 📈 Competitive Saturation & Yield
- **Saturation Score**: A weighted index combining lead quality (consumer ratings) and density to measure entry barriers.
- **Yield Potential**: Calculates the "market juice" of a sector based on cumulative consumer activity.
- **Strategic Advice**: Generates dynamic tactical advice (e.g., "Niche Specialization Required" vs. "High Expansion Potential") based on real-time spatial data.

### 🔖 Integrated Lead Management
- **Bookmark System**: Save high-potential opportunities directly to your personalized cluster.
- **Cloud Sync**: All bookmarks are instantly synchronized with **Supabase** for persistence and cross-device access.
- **Dual-Map View**: Toggle between a dashboard overview and a focused high-resolution full-screen map.

## 🛠️ Tech Stack
- **Frontend**: Vanilla JavaScript, Vite
- **Styling**: Modern CSS (Glassmorphism & High-Fidelity UI)
- **Database**: Supabase (PostgreSQL)
- **Maps Engine**: Google Maps JavaScript API (New)
- **Icons**: Lucide

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Google Maps API Key (with Places API New enabled)
- Supabase Project (URL and Anon Key)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/agentic-market-research.git
   cd agentic-market-research
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Initialize Supabase Table**
   Run the following SQL in your Supabase SQL Editor:
   ```sql
   CREATE TABLE bookmarks (
     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
     google_place_id TEXT UNIQUE NOT NULL,
     name TEXT,
     address TEXT,
     rating DECIMAL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
   );
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---
**Build by [Your Name/Handle]** — *Transforming spatial data into strategic action.*
