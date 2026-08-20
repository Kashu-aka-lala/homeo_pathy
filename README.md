# Yashfeen Homeopathy Workspace

This repository is organized into two main parts:

1. **`landing-page/`**: A modern, high-converting, single-page static website for the clinic business. Built with pure HTML/CSS/JS with zero build steps required, making it easy to deploy on Cloudflare Pages, Vercel, or Netlify.
2. **`generator/`**: The Next.js electronic medical records (EMR) application for patient registry, consultation workflows, prescriptions, and invoice generation.

---

## Directory Structure

```
├── generator/          # Next.js EMR & Invoice Generator
│   ├── src/            # App code, pages, and components
│   ├── public/         # Static assets for the app
│   ├── package.json    # Next.js dependencies and scripts
│   └── ...
├── landing-page/       # Clinic Business Static Website
│   ├── index.html      # Landing page HTML
│   ├── styles.css      # Vanilla CSS (custom design system)
│   ├── script.js       # Core interactivity (WhatsApp, animations)
│   └── assets/         # SVG icons and visual assets
└── README.md           # Workspace documentation (this file)
```

---

## Getting Started

### Running the Static Landing Page
Simply open `landing-page/index.html` in any browser, or serve it using a local static server:
* With Live Server (VS Code extension)
* With python: `python -m http.server 8000` (from the `landing-page` directory)

### Running the Next.js EMR App
Navigate into the `generator/` folder and start the development server:
```bash
cd generator
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the EMR interface.
