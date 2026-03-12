# TNVS Financial System

A modern, front-end financial management system built with Vite + React + TailwindCSS for Transport Network Vehicle Services (TNVS).

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation & Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   The application will automatically open at: **http://localhost:5173**

## 📁 Project Structure

```
tnvs-financial-system/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Header.jsx      # Top header with notifications
│   │   └── Sidebar.jsx     # Fixed sidebar navigation
│   ├── layout/             # Layout components
│   │   └── Layout.jsx      # Main layout wrapper
│   ├── pages/              # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Disbursement.jsx
│   │   ├── GeneralLedger.jsx
│   │   ├── APAR.jsx
│   │   ├── BudgetManagement.jsx
│   │   └── Collections.jsx
│   ├── App.jsx             # Main app component with routes
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles with Tailwind
├── index.html               # HTML template
├── package.json             # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── postcss.config.js       # PostCSS configuration
```

## 🎨 Features

### Modules

1. **Dashboard** - Overview with stats and recent activities
2. **Disbursement** - Manage disbursement vouchers with 2-level approval
3. **General Ledger** - Central accounting ledger with auto-posting
4. **AP / AR** - Accounts Payable and Accounts Receivable management
5. **Budget Management** - Track budgets and control spending
6. **Collections** - Manage collections from drivers and partners

### System-Wide Features

- Fixed sidebar navigation
- Real-time notifications UI
- Document attachment placeholders
- PDF/Excel export buttons (UI only)
- Audit trail placeholders
- Responsive design

## 🛠️ Tech Stack

- **Vite** - Fast build tool and dev server
- **React 18** - UI library
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Icon library

## 📝 Available Scripts

- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎯 Design Theme

The application uses a modern **white and green** color scheme:
- Primary green shades for active states and accents
- Clean white backgrounds
- Gray accents for borders and subtle elements

## ⚠️ Notes

- This is a **front-end only** application with static UI
- All data shown is mock/placeholder data
- Export and attachment features are UI placeholders only
- No backend integration required

## 📄 License

Private project for TNVS Financial Management System
