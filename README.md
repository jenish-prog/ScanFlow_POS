# 📦 ScanFlow POS — Smart Retail Barcode POS & Inventory Management

[![Direct APK Download](https://img.shields.io/badge/Download_APK-ScanFlow--POS.apk-10B981?style=for-the-badge&logo=android&logoColor=white)](https://github.com/jenish-prog/ScanFlow_POS/releases/latest/download/ScanFlow-POS.apk)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web%20PWA-blue.svg?style=for-the-badge)](https://github.com/jenish-prog/ScanFlow_POS/releases)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

A fast, modern Point-of-Sale (POS) and inventory management solution built with **React 18 (Vite)**, **Tailwind CSS**, **Lucide Icons**, **`html5-qrcode`**, **Web Audio API**, and **Capacitor Android**.

---

## 📲 Direct App Download for Android

Visitors can download the Android app directly from GitHub:

### 👉 [⬇️ **Download ScanFlow-POS.apk (Direct APK Download)**](https://github.com/jenish-prog/ScanFlow_POS/releases/latest/download/ScanFlow-POS.apk)

> **All Versions:** You can also browse and download past versions from the [GitHub Releases](https://github.com/jenish-prog/ScanFlow_POS/releases) tab.

### 📱 How to Install on Android:
1. Tap the **Download ScanFlow-POS.apk** link above on your Android phone.
2. Once downloaded, tap the file in your notification center or file manager.
3. If prompted with *"For security, your phone is not allowed to install unknown apps from this source"*, tap **Settings** and toggle **Allow from this source**.
4. Tap **Install** and open **ScanFlow POS**.

---

## ✨ Key Capabilities

### 1. ⚡ High-Speed POS Checkout Terminal
- **Live Optical Barcode Scanner:** Camera-based scanner supporting EAN-13, UPC-A, Code-128, and QR codes with an animated laser viewfinder.
- **Quick Test Barcode Deck:** Instant test-scan buttons for rapid testing (`Maggi 70g`, `Colgate 100g`, `Amul Butter`, `Tata Tea Gold`, `Good Day`, and `Unknown Barcode`).
- **Web Audio Sound Effects:** Real supermarket laser beeps on scan, double warning chime for uncatalogued items, and celebration chords on checkout.
- **Cart & Tax Management:** Live quantity adjustment, automatic CGST + SGST tax breakdown, and customizable store discounts (`5% / 10% / 15%`).
- **Payment Modes:** 
  - 💵 **Cash Tender:** Auto-calculates change returned.
  - 📱 **Dynamic UPI QR Code:** Generates instant UPI payment codes with the exact cart total.
  - 🖨️ **Thermal Receipt:** Clean printable receipt preview.

### 2. 🔍 Instant "Unknown Barcode" Onboarding
- Scanning or typing any unregistered barcode immediately launches the **"New Barcode Detected"** modal.
- Auto-fills the scanned GTIN/EAN-13 string with live 1D barcode preview.
- One-click **"Save to Catalog & Add to Cart"** with instant demo presets.

### 3. 📋 Inventory & Stock Manager
- Searchable catalog filterable by category, price, and stock levels.
- Real-time stock alerts:
  - 🟡 **Low Stock (`< 10 units`)** amber pill
  - 🔴 **Out of Stock (`0 units`)** red pill
- **1D Barcode Sticker Generator:** Generates printable barcode labels for retail shelves and packaging.

### 4. 📊 Sales Analytics & Financial KPIs
- Live KPI cards: **Today's Revenue (₹)**, **Total Orders**, **Items Sold**, and **Low Stock Alerts**.
- Full transaction history log with itemized receipt inspection and refunds.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS
- **Mobile Engine:** Capacitor 8 (Android Native)
- **Barcode Engine:** `html5-qrcode` + custom SVG barcode generator
- **Audio:** Web Audio API (zero external audio file latency)
- **Icons:** Lucide React

---

## 💻 Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20 recommended)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Build Web Production Bundle
```bash
npm run build
```

---

## 🤖 Building the Android APK

### Option A: Automatic via GitHub Actions
This repository includes a GitHub Actions workflow (`.github/workflows/build-apk.yml`) that automatically builds the Android APK whenever code is pushed or a new release tag (e.g. `v1.0.0`) is published.

### Option B: Local Android Build
Prerequisites: Android SDK and Java JDK 17 installed.

```bash
# Build web assets and assemble debug APK
npm run build:apk
```

The compiled APK will be output at `./ScanFlow-POS.apk`.

---

## 📁 Project Structure

```
├── .github/
│   └── workflows/
│       └── build-apk.yml        # CI/CD automated APK build & release
├── android/                     # Capacitor Android native project
├── public/                      # Web assets, icons, manifest
├── src/
│   ├── components/              # UI components (POS, Nav, Modals, Stickers)
│   ├── screens/                 # Main screens (POS, Catalog, Analytics)
│   ├── services/                # Local storage & data services
│   ├── utils/                   # Sound effects & barcode generators
│   ├── App.jsx                  # Root application router & state
│   └── main.jsx                 # Application entry point
├── ScanFlow-POS.apk             # Ready-to-install Android APK
├── capacitor.config.json        # Capacitor configuration
├── package.json                 # Project dependencies & build scripts
└── vite.config.js               # Vite configuration
```

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
