# 🐾 PawHub — The Ultimate Pet Care & Community Platform

PawHub is a high-performance, professional-grade platform that connects pet owners, veterinary professionals, animal shelters, and specialized pet shops. Built with the premium **"WowDash" Design System**, it provides real-time oversight of pet lifecycles, service bookings, e-commerce, and community engagement.

---

## 🚀 Core Functionalities & User Ecosystem

PawHub is built around three distinct user roles, each with a tailored dashboard and feature set.

### 👤 1. For Pet Owners (Regular Users)
- **Advanced Discovery & Filtering**: Search and find pets for adoption or purchase across categories like Dogs, Cats, Birds, and more.
- **Unified Adoption Workflow**:
  - **Inquiry System**: Send detailed adoption requests, including home environment descriptions and experience levels.
  - **Status Tracking**: Monitor applications in real-time as they move from *Pending* to *Accepted* or *Rejected*.
- **Advanced Healthcare Bookings**:
  - **Multi-Slot Doctor Appointments**: Select multiple preferred time slots for a single visit to ensure flexibility.
  - **Pet Medical History**: Access digital prescriptions and health records issued after consultations.
- **Integrated Payments**: Securely pay for products, adoption fees, or shelter services via **bKash & SSLCommerz**.
- **Live Interaction**: Real-time P2P chat with shelters and sellers, and a live notification center for all account updates.

### 🏠 2. For Shelter Professionals
- **Multi-Location Management**: Oversee multiple shelter sites and assign staff members to specific branches.
- **Dr. Appointments Dashboard**: Direct integration for staff to book and manage veterinary visits for shelter animals.
- **Service Orchestration**: Offer specialized services with customizable time slots for boarding and training.
- **Dynamic Bootcamps**:
  - **Lifecycle Management**: Create free or paid events with specific start/end dates and participant limits.
  - **Real-time Capacity Tracking**: Every enrollment instantly updates the bootcamp's remaining seats across the platform.

### 🛒 3. For Verified Sellers (Shop Owners)
- **Verified Onboarding**: **Brand New** multi-step business verification system. Sellers must provide and validate one of: **Trade License (TL), TIN, NID, or BRN**.
- **Shop Management**: List products, manage inventory, and organize categories with real-time stock tracking.
- **Seller Reputation**: Aggregated star ratings and review systems that build buyer trust based on historical performance.

### 🏥 4. For Veterinary Professionals (Doctors)
- **Clinical Command Center**: A sleek dashboard for managing patient capacity, working hours, and daily overrides.
- **Smart Prescription Engine**:
  - **Auto-Fill Connectivity**: Marking an appointment as "Done" instantly prepares a prescription with the patient’s ID, pet name, and diagnosis pre-loaded.
  - **Digital PDF Generation**: Issue professional, branded PDF prescriptions instantly for users to download.
- **Patient Management System**: A deep-data module that tracks every unique patient across emergencies, appointments, and prescriptions.

---

## 📅 Veterinary Scheduling & Healthcare
PawHub features a high-precision medical scheduling engine:
- **Flexible Capacity**: Doctors can set base weekly hours or override specific dates with a **Daily Patient Capacity**.
- **Slot Management**: Automated slot generation (15, 30, 45, or 60 min intervals) based on doctor availability.
- **Emergency Lifeline**: Integrated real-time emergency request system with proximity-based doctor matching.

---

## 🛡️ Admin Command Center (WowDash Portal)

The "Brain" of the platform is a modernized Django Admin dashboard redesigned with high-contrast, premium aesthetics:

### 📢 Smart Portal Message Reader
- **The "Eye" Icon**: Admins can instantly preview incoming messages via a high-performance modal without leaving the list view.
- **Status Sync**: Clicking the "Eye" automatically marks the message as **Read** in the database.
- **Visual Feedback**: Real-time status synchronization (Red Cross → Green Check) occurs instantly in the table view through a custom AJAX bridge.

### ⚖️ Intelligent Complaint Resolution
- **User-to-Admin Reporting**: Users can report shelters, sellers, or technical issues through a dedicated complaint portal.
- **One-Click Resolution**: Admins have a specialized reply interface.
- **Automated Workflow**: Upon sending an admin response, the complaint status is automatically updated to **"Done"**. The user is instantly notified through the real-time notification engine.

### 🚧 Business Approval Pipeline
- Review and verify the business documents (TL, TIN, etc.) of new shelters and sellers before they can trade, ensuring a safe and verified marketplace.

---

## ⚡ Real-Time Messaging & Communications

PawHub is powered by a high-concurrency real-time engine to ensure instant communication across all roles:

- **P2P Chat System**: Live, instant messaging between customers, shelters, and sellers. Every conversation is historical, searchable, and always accessible via a modern chat UI.
- **Global Broadcast Engine**: Admins can send platform-wide announcements to every registered user instantly via a centralized broadcast hub.
- **Live Notifications**: 
  - **WebSockets (Django Channels)**: Persistent tunnels that push updates (new messages, adoption approvals, stock changes) without page refreshes.
  - **Counter Sync**: Live notification and message counters in the top navigation update instantly as new interactions occur.

---

## 🛠️ Security & Technical Highlights

- **Standardized Phone Formatting**: Every user's phone is now enforced with a fixed **+880** country code and exactly 10 numeric digits, ensuring global data integrity.
- **Modern State Management**: Uses **Zustand** in the React frontend for extremely fast, non-blocking UI updates.
- **Premium Aesthetics**: The **WowDash Design System** ensures high contrast, glassmorphism effects, and smooth micro-animations across all dashboards.

---

## 🏁 Manual Setup Guide (Step-by-Step)

Follow these steps in order to run the full PawHub ecosystem manually. You will need 3 separate terminal windows.

### 📋 Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **MySQL** (Running locally for the Auth Service)

---

### Step 1: Backend (Django)
*Terminal 1*
```bash
# 1. Navigate to backend and setup environment
cd backend
python -m venv .venv

# 2. Activate environment
# For Windows:
.venv\Scripts\activate

# For Mac/Linux:
source .venv/bin/activate

# 3. Install requirements (from root)
pip install -r ../requirements.txt

# 4. Initialize Database & Start
python manage.py migrate
python seed_data.py # Optional: Populates sample data
python manage.py runserver
```

### Step 2: Auth Service (Node.js)
*Terminal 2*
```bash
# 1. Navigate to auth service
cd auth_service_node

# 2. Install dependencies
npm install

# 3. Configure .env (Ensure MySQL is running)
# Create a .env file with DB_USER, DB_PASS, DB_NAME

# 4. Start service
npm run dev
```

### Step 3: Frontend (React)
*Terminal 3*
```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

---

*PawHub ~ Bringing the best care and community to your furry friends.* 🐾
