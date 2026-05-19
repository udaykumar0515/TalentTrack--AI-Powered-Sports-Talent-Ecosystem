# 🏃‍♂️ TalentTrack - AI-Powered Sports Talent Ecosystem

[![Hackathon](https://img.shields.io/badge/Hackathon-HackWithHyderabad-blue)](https://hackwithhyderabad.com)
[![AI](https://img.shields.io/badge/AI-Powered-green)](https://github.com/udaykumar0515/TalentTrack---AI-Powered-Sports-Talent-Ecosystem-)
[![Sports](https://img.shields.io/badge/Sports-Tech-orange)](https://github.com/udaykumar0515/TalentTrack---AI-Powered-Sports-Talent-Ecosystem-)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Revolutionizing Sports Training with AI-Powered Video Analysis**

TalentTrack transforms how athletes train and coaches guide by using cutting-edge AI to analyze exercise form, track performance, and provide personalized insights through smartphone video recording. Built for the modern sports ecosystem, it bridges the gap between amateur training and professional coaching.

## ✨ Features

### For Athletes
- 📱 **Video Recording**: Record exercises with smartphone camera
- 🤖 **AI Analysis**: Instant form scoring and rep counting using computer vision
- 📊 **Progress Tracking**: Visual dashboards with performance trends and activity heatmaps
- 🎯 **Goal Setting**: Set and track personal fitness goals
- 💬 **Coach Communication**: Direct messaging with assigned coaches
- 📈 **Analytics**: Performance insights and injury risk assessment
- 🏆 **Leaderboard**: Compare performance with other athletes

### For Coaches
- 👥 **Team Management**: Oversee multiple athletes from one dashboard
- 📊 **Analytics**: Comprehensive performance insights and team statistics
- 💬 **Messaging**: Send feedback and communicate with athletes
- 📋 **Training Plans**: Create custom plans or use AI-generated plans
- 🎯 **Goal Management**: Set and track goals for athletes
- 🚨 **Injury Alerts**: Monitor injury risks across the team
- 📈 **Development Plans**: Create long-term athlete development programs

### AI/ML Capabilities
- **Form Analysis**: Automated form validation using MediaPipe pose detection
- **Rep Counting**: Accurate exercise rep counting with cheat detection
- **Injury Risk Assessment**: Biomechanical analysis to identify potential injury risks
- **Performance Prediction**: AI-powered performance trend analysis
- **Training Plan Generation**: AI-generated personalized workout plans using Google Gemini

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** with TypeScript and App Router
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Lucide React** icons

### Backend
- **FastAPI** (Python) for high-performance API
- **MediaPipe** for pose detection and analysis
- **OpenCV** for video processing
- **Google Gemini** for AI plan generation
- JSON file-based storage

### AI/ML
- **Computer Vision**: MediaPipe pose detection for form analysis
- **Biomechanical Analysis**: Movement pattern recognition
- **Predictive Analytics**: Performance trend prediction
- **Natural Language Processing**: AI training plan generation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/udaykumar0515/TalentTrack---AI-Powered-Sports-Talent-Ecosystem-.git
   cd sports_talent_ecosystem
   ```

2. **Setup Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python main.py
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Demo Accounts

**Athletes (Password: 123456)**
- uday@example.com
- bhanu@example.com
- teja@example.com
- madhan@example.com
- sai_ram@example.com
- arjun@example.com
- priya@example.com
- vikram@example.com
- kavya@example.com
- rakesh@example.com

**Coaches (Password: 000000)**
- coach_mike@example.com
- coach_sarah@example.com
- coach_david@example.com

## 📁 Project Structure

```
sports_talent_ecosystem/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities and API client
│   └── public/              # Static assets
├── backend/                 # FastAPI backend
│   ├── engines/             # AI/ML engines
│   ├── services/            # Business logic services
│   ├── data/                # JSON data storage
│   └── main.py              # Main FastAPI application
├── screenshots/            # Project screenshots
├── LICENSE                  # MIT License
├── CONTRIBUTING.md          # Contribution guidelines
└── README.md                # This file
```

## 🚀 How It Works

### 📱 For Athletes
1. **Record Your Workout** - Use your phone camera to capture exercises
2. **Get Instant AI Feedback** - Receive real-time form analysis and rep counting
3. **Track Progress** - Monitor performance trends and improvement over time
4. **Connect with Coaches** - Get personalized guidance from expert trainers
5. **Achieve Goals** - Follow custom training plans and reach your potential


### 👨‍🏫 For Coaches
1. **Build Your Team** - Manage multiple athletes from one dashboard
2. **Monitor Performance** - Track progress across your entire team
3. **Provide Expert Feedback** - Share insights and corrections through messaging
4. **Create Training Plans** - Design custom workouts or use AI-generated plans
5. **Prevent Injuries** - Monitor injury risks and optimize training loads


### 🤖 AI-Powered Analysis
- **Form Detection** - MediaPipe analyzes body positioning and movement
- **Performance Scoring** - Get quantitative feedback on exercise quality
- **Injury Risk Assessment** - Identify potential issues before they become problems
- **Predictive Analytics** - Forecast performance trends and improvement potential


## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for HackWithHyderabad 2025
- MediaPipe for pose detection
- Google Gemini for AI plan generation
- shadcn/ui for UI components

---

**Note**: This project uses JSON file-based storage for simplicity. For production use, consider migrating to a proper database like PostgreSQL or MongoDB.
