# HealthHub - Healthcare Management Platform

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://healthub-six.vercel.app/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](#)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](#)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white)](#)

A full-stack healthcare web application connecting patients and doctors through real-time appointment scheduling, secure communication, and collaborative community support. Built with the MERN stack for seamless, responsive healthcare management.

**🔗 Live Demo:** https://healthub-six.vercel.app/

---

## 🎯 What Makes This Different?

- **Real-Time Communication** - WebSocket-based chat between doctors and patients
- **Role-Based Dashboards** - Distinct interfaces for doctors and patients with tailored functionality
- **Appointment Management** - Full calendar integration with accept/reject workflows
- **Community Support** - Public discussion area for general health questions
- **AI Integration** - Chatbot for instant health query responses
- **Mobile Responsive** - Fully functional on both desktop and mobile devices

---

## ✨ Key Features

### 👨‍⚕️ Doctor Dashboard

- **Patient Management** - View patient list with symptoms and medical history
- **Appointment Control** - Accept/reject incoming requests, cancel confirmed appointments
- **Calendar View** - Full scheduling interface with availability management
- **Real-Time Chat** - Direct messaging with patients (mobile + desktop responsive)
- **Community Moderation** - Participate in and monitor health discussions

### 🧑‍💼 Patient Dashboard

- **Doctor Discovery** - Browse available doctors and specializations
- **Appointment Booking** - Schedule consultations with preferred doctors
- **Appointment Tracking** - View upcoming and past appointments
- **Direct Messaging** - Real-time chat with assigned doctor
- **Community Access** - Ask questions and engage with health community

### 🔐 Authentication & Security

- **JWT-Based Auth** - Secure token-based authentication system
- **Role-Based Access** - Protected routes for doctors vs. patients
- **Password Encryption** - Bcrypt hashing for secure credential storage
- **Auto-Navigation** - Redirects users to role-specific dashboards

### 💬 Communication Features

- **WebSocket Chat** - Real-time messaging using Socket.io
- **Notification System** - Toast notifications for all user actions
- **Community Forum** - Public discussion area for health queries
- **AI Chatbot** - Instant responses to common health questions

---

## 📸 Screenshots

### Home Page
![Home Page](./screenshots/home.png)

### Authentication
![Signup Page](./screenshots/signup.png)

### Doctor Dashboard
![Doctor's Interface](./screenshots/doctor.png)

### Patient Dashboard
![Patient's Interface](./screenshots/patient.png)

### Appointment Booking
![Book Appointment](./screenshots/appointment.png)

### Community Support
![Community Panel](./screenshots/community.png)

### AI Chatbot
![AI Assistant](./screenshots/ai.png)

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React, Tailwind CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |
| **Authentication** | JWT, bcrypt |
| **Real-Time** | Socket.io (WebSockets) |
| **UI Components** | react-calendar, react-toastify |
| **Deployment** | Vercel (Frontend), Render (Backend) |

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Video consultation integration
- Payment gateway integration

---

<div align="center">

**⭐ Star this repo if you find it useful!**

[Report Bug](../../issues) · [Request Feature](../../issues)

</div>
