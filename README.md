# Lately 📸

**AI-powered photo dumps, made effortless.**

Lately uses on-device machine learning to automatically curate your best photos into Instagram-ready dumps. No backend, no API costs, works completely offline.

---

## ✨ Highlights

### 🧠 On-Device AI Photo Scoring
- **Apple Vision Framework** (iOS 18) for aesthetic scoring
- Analyzes composition, lighting, and visual quality
- Face detection for people shots
- Utility detection to filter screenshots automatically
- **100% on-device** - photos never leave your phone

### ⚡ Lightning Fast with Smart Caching
- Scores are cached locally after first analysis
- **First run:** ~60 seconds for 500 photos
- **Subsequent runs:** ~0 seconds (instant from cache)
- Only new photos are scored - existing ones load from cache

### 🎯 Smart Photo Selection
- Automatic screenshot filtering (bye bye receipts!)
- Quality threshold enforcement (>0.25 score)
- Favorite photos always prioritized (❤️ = guaranteed shortlist)
- Face bonus for people shots
- Top 10 curated from shortlist of 100

### 📱 Premium UX
- **Drag-to-reorder** with Instagram-quality smoothness
- **Triple-tap to delete** (no accidental removals)
- Beautiful carousel preview with dot scrubbing
- Glassmorphic UI with premium animations
- Export directly to camera roll

### ✈️ Works Completely Offline
- No internet required for photo analysis
- No API calls or cloud processing
- Create dumps on airplane mode
- Complete privacy - nothing uploaded

### 💰 Zero Backend Costs
- No API fees (Apple Vision is free forever)
- No server hosting needed
- No rate limits or quotas
- Scales infinitely at zero cost

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo |
| Routing | Expo Router (file-based) |
| UI | Custom components + Skia |
| AI/ML | Apple Vision Framework (iOS 18) |
| Storage | AsyncStorage (score cache) |
| Database | SQLite (dumps) |
| Auth | Supabase (optional) |

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- iOS 18+ device (for Vision AI features)
- Xcode 15+ (for iOS builds)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS (requires Xcode)
npx expo run:ios
```

---

## 📁 Project Structure

```
Lately1/
├── app/                    # Screens (file-based routing)
│   ├── (tabs)/            # Tab navigation
│   ├── create/            # Dump creation flow
│   └── debug/             # Developer tools
├── components/ui/          # Reusable UI components
├── services/              # Business logic
│   ├── scoring.ts         # Vision AI scoring
│   ├── scoreCache.ts      # Score caching
│   ├── photos.ts          # Photo access
│   └── database.ts        # Local storage
├── modules/               # Native modules
│   └── expo-vision-aesthetics/  # iOS Vision API bridge
└── constants/             # Theme & config
```

---

## 🔮 Roadmap

- [ ] Android support (fallback scoring)
- [ ] iCloud sync for dumps
- [ ] Share directly to Instagram
- [ ] Caption generation with AI
- [ ] Multiple dump templates
- [ ] Widgets for quick access

---

## 📄 License

MIT © Lately

---

**Made with ❤️ and zero API costs**
