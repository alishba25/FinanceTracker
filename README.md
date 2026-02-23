# FinTrack: Personal Wealth Space

A sleek, responsive, real-time personal finance dashboard built to help you track your income, expenses, and investments effortlessly.
---

## ✨ Features

- **Secure Authentication**  
  Create a personal account or explore the app instantly using the **Continue as Guest** feature.

- **Real-Time Cloud Sync**  
  Powered by Firebase Firestore. Add a transaction on your phone and watch it appear instantly on your laptop.

- **Interactive Dashboard**  
  Get a clear overview of your financial health, including your current balance, monthly cash flow, and custom expense breakdowns.

- **Separated Data Views**  
  Dedicated tabs for tracking **Income**, **Expenses**, and **Investments**.

- **Portfolio Tracking**  
  Track your asset allocation across Mutual Funds, Stocks, Crypto, and Real Estate.

- **Dark & Light Mode**  
  A high-contrast custom color palette that adapts to your preferred viewing mode.

- **Fully Responsive**  
  Optimized for desktop, tablet, and mobile devices.

---

## 🛠️ Tech Stack

- **Frontend:** React (Hooks, Memoization)
- **Styling:** Tailwind CSS
- **Backend / Database:** Google Firebase (Authentication & Cloud Firestore)
- **Icons:** Lucide React
- **Build Tool:** Vite

---

## 🚀 Getting Started (Local Development)
Follow these steps to run the project locally on your machine.

### 1️. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/finance-tracker.git
cd finance-tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Firebase

To save your own data, you need to link your own Firebase project:
- Go to the Firebase Console and create a new project.
- Enable Authentication (Email/Password & Anonymous).
- Enable Firestore Database (Start in Test Mode).
- Register a Web App to get your configuration keys.
- Open src/App.jsx and replace the placeholder firebaseConfig object (around line 28) with your actual keys:
```bash
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Run the App

Start the Vite development server:
```bash
npm run dev
```
Open your browser and navigate to http://localhost:5173.

## Color Palette
The app utilizes a custom, high-contrast palette designed for financial clarity:
Deep Space Blue (#003049)
Flag Red (#D62828)
Princeton Orange (#F77F00)
Sunflower Gold (#FCBF49)
Vanilla Custard (#EAE2B7)

## Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## License
This project is open-source and available under the MIT License.
