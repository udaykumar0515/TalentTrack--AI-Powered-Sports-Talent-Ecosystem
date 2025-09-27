# 🎨 Frontend UI/UX Design System Documentation

## 📋 Table of Contents
1. [Design System Overview](#design-system-overview)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Layout & Spacing](#layout--spacing)
5. [Component Library](#component-library)
6. [Athlete Dashboard](#athlete-dashboard)
7. [Coach Dashboard](#coach-dashboard)
8. [Interactive Elements](#interactive-elements)
9. [Responsive Design](#responsive-design)
10. [User Flows](#user-flows)
11. [Accessibility](#accessibility)
12. [Performance Considerations](#performance-considerations)

---

## 🎨 Design System Overview

### Core Design Principles
- **Clean & Modern**: Minimalist design with focus on functionality
- **Athlete-Centric**: Blue theme for athletes, green for coaches
- **Data-Driven**: Clear visualization of performance metrics
- **Mobile-First**: Responsive design for all devices
- **Accessibility**: WCAG 2.1 AA compliant

### Technology Stack
- **Framework**: React 18.3.1 with TypeScript
- **Styling**: Custom CSS with CSS Variables + Tailwind CSS
- **Icons**: Lucide React icons
- **Routing**: React Router DOM 7.9.0

---

## 🎨 Color Palette

### Primary Colors
```css
:root {
  --athlete-blue: #a3c4f3;        /* Primary athlete color */
  --coach-green: #90ee90;         /* Primary coach color */
  --good-score: #8bc34a;          /* Success/Good performance */
  --caution-score: #ffeb3b;       /* Warning/Medium performance */
  --risk-score: #f44336;          /* Danger/High risk */
  --primary-text: #333;           /* Main text color */
  --secondary-text: #666;         /* Secondary text color */
  --background-color: #f4f7f6;    /* Page background */
  --card-shadow: 0 4px 8px rgba(0,0,0,0.1); /* Card shadows */
}
```

### Color Usage Guidelines
- **Athlete Blue (#a3c4f3)**: Primary buttons, athlete-specific elements, progress indicators
- **Coach Green (#90ee90)**: Coach-specific elements, success states, positive actions
- **Good Score (#8bc34a)**: High performance, completed goals, positive metrics
- **Caution Score (#ffeb3b)**: Medium performance, warnings, pending states
- **Risk Score (#f44336)**: Low performance, errors, high-risk indicators

### Glass Effect Colors
```css
/* Glass morphism effects */
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.2);
```

---

## 📝 Typography

### Font Family
```css
font-family: Arial, sans-serif;
```

### Font Sizes & Hierarchy
- **H1 (Page Titles)**: 2.5rem (40px) - Dashboard headers
- **H2 (Section Titles)**: 2rem (32px) - Section headers
- **H3 (Subsection Titles)**: 1.5rem (24px) - Card titles
- **H4 (Component Titles)**: 1.25rem (20px) - Component headers
- **Body Text**: 1rem (16px) - Default text
- **Small Text**: 0.875rem (14px) - Labels, metadata
- **Caption**: 0.75rem (12px) - Timestamps, small details

### Font Weights
- **Light**: 300 - Decorative text
- **Regular**: 400 - Body text
- **Medium**: 500 - Labels, secondary headings
- **Semi-bold**: 600 - Primary headings, important text
- **Bold**: 700 - Call-to-action text

---

## 📐 Layout & Spacing

### Container System
```css
.dashboard-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}
```

### Spacing Scale
- **xs**: 4px - Tight spacing
- **sm**: 8px - Small spacing
- **md**: 16px - Medium spacing
- **lg**: 24px - Large spacing
- **xl**: 32px - Extra large spacing
- **2xl**: 48px - Section spacing

### Grid System
- **Desktop**: 12-column grid
- **Tablet**: 8-column grid
- **Mobile**: 4-column grid
- **Gap**: 16px between grid items

---

## 🧩 Component Library

### Buttons

#### Primary Button
```css
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.2);
}
```

#### Small Button
```css
.btn-sm {
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 6px;
}
```

#### Button Variants
- **Record Button**: `#a3c4f3` (athlete blue)
- **Upload Button**: `#90ee90` (coach green)
- **Analyze Button**: `#f44336` (risk red)
- **Delete Button**: `#dc2626` (danger red)

### Cards

#### Standard Card
```css
.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}
```

#### Session Card
```css
.session-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid var(--good-score);
}

.session-card.medium {
  border-left-color: var(--caution-score);
}

.session-card.high {
  border-left-color: var(--risk-score);
}
```

### Form Elements

#### Input Fields
```css
input[type="email"], 
input[type="password"], 
input[type="text"], 
select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  background: white;
}

input:focus, select:focus {
  outline: none;
  border-color: var(--athlete-blue);
  box-shadow: 0 0 0 3px rgba(163, 196, 243, 0.1);
}
```

#### Form Groups
```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 16px;
}

.form-group label {
  font-weight: 500;
  color: var(--primary-text);
  font-size: 14px;
}
```

---

## 🏃‍♂️ Athlete Dashboard

### Header Section
```css
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  margin-bottom: 32px;
  padding: 0 20px;
}

.header-left h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-text);
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
```

### Navigation Buttons
```css
.section-nav-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
}

.section-nav-btn {
  padding: 12px 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-nav-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}
```

### Session Start Section
```css
.session-start-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 32px;
}

.start-session-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 auto;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}
```

### Training Plan Section
```css
.training-plan-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 32px;
}

.plan-type-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.plan-type-btn {
  padding: 12px 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
}

.plan-type-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}
```

### Gamification Section
```css
.gamification-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 32px;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
}
```

### Goals Section
```css
.goal-setting-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 32px;
}

.goal-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.goal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}
```

---

## 👨‍🏫 Coach Dashboard

### Athletes Grid
```css
.athletes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.athlete-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  border-left: 4px solid var(--coach-green);
}

.athlete-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}
```

### Performance Indicators
```css
.athlete-performance-indicators {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.progress-circle {
  position: relative;
  width: 80px;
  height: 80px;
}

.progress-ring {
  transform: rotate(-90deg);
  transition: all 0.3s ease;
}

.progress-ring-circle {
  fill: none;
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s ease;
}

.progress-ring-circle.Low {
  stroke: var(--good-score);
}

.progress-ring-circle.Medium {
  stroke: var(--caution-score);
}

.progress-ring-circle.High {
  stroke: var(--risk-score);
}
```

### Performance Boxes
```css
.performance-boxes {
  display: flex;
  gap: 12px;
}

.performance-box {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
}

.duration-box {
  border-left-color: #3b82f6;
}

.sessions-box {
  border-left-color: var(--coach-green);
}
```

### Athlete Detail Dashboard
```css
.athlete-sessions-board {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 32px;
}

.sessions-board-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.athlete-header-actions {
  display: flex;
  gap: 12px;
}

.coach-plan-btn {
  background: var(--coach-green);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-athlete-btn {
  background: var(--athlete-blue);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}
```

---

## 🎮 Interactive Elements

### Video Recorder
```css
.video-recorder {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
}

.video-container {
  position: relative;
  width: 100%;
  max-width: 640px;
  margin: 0 auto 24px;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
}

.live-video {
  width: 100%;
  height: auto;
  display: block;
}

.recording-controls {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.record-btn {
  background: var(--athlete-blue);
  color: white;
  border: none;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-btn.recording {
  background: var(--risk-score);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

### Video Uploader
```css
.video-uploader {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
}

.upload-area {
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 48px 24px;
  margin-bottom: 24px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-area:hover {
  border-color: var(--coach-green);
  background: rgba(144, 238, 144, 0.1);
}

.upload-btn {
  background: var(--coach-green);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
}
```

### Chat Sidebar
```css
.chat-sidebar-overlay {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease;
}

.chat-sidebar-overlay.open {
  transform: translateX(0);
}

.chat-sidebar {
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
}

.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
}

.message.sent {
  align-self: flex-end;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message.received {
  align-self: flex-start;
  background: #f3f4f6;
  color: var(--primary-text);
}
```

### Modals
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 0 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
```

---

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .section-nav-buttons {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .athletes-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-overview {
    grid-template-columns: 1fr;
  }
  
  .performance-boxes {
    flex-direction: column;
  }
  
  .chat-sidebar-overlay {
    width: 100%;
  }
}
```

### Mobile Optimizations
- **Touch Targets**: Minimum 44px for all interactive elements
- **Swipe Gestures**: Support for swipe navigation
- **Viewport**: Optimized for mobile viewports
- **Performance**: Reduced animations on mobile devices

---

## 🔄 User Flows

### Athlete User Flow
1. **Login/Registration** → Landing Page → Athlete Dashboard
2. **Session Recording** → Exercise Selection → Video Recording/Upload → Analysis → Results
3. **Training Plans** → View AI Plan → Switch to Coach Plan → View Details
4. **Goals Management** → Create Goal → Track Progress → View Analytics
5. **Gamification** → View Stats → Check Achievements → Leaderboard
6. **Coach Communication** → Open Chat → Send Message → View Responses

### Coach User Flow
1. **Login** → Coach Dashboard → View Athletes
2. **Athlete Selection** → View Sessions → Provide Feedback
3. **Training Plan Creation** → Create Plan → Send to Athlete
4. **Injury Monitoring** → View Alerts → Acknowledge/Resolve
5. **Performance Analysis** → Review Metrics → Provide Recommendations

---

## ♿ Accessibility

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 ratio for normal text
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Indicators**: Clear focus states for all interactive elements
- **Alternative Text**: Alt text for all images and icons

### Accessibility Features
```css
/* Focus indicators */
button:focus,
input:focus,
select:focus {
  outline: 2px solid var(--athlete-blue);
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --primary-text: #000;
    --secondary-text: #333;
    --background-color: #fff;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## ⚡ Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Images and components loaded on demand
- **Code Splitting**: Route-based code splitting
- **Bundle Optimization**: Tree shaking and minification
- **Caching**: Proper cache headers for static assets
- **Image Optimization**: WebP format with fallbacks

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

---

## 🎯 Design Recommendations for Improvement

### Visual Hierarchy
1. **Improve Typography Scale**: Implement a more refined type scale
2. **Enhanced Color System**: Add semantic color tokens
3. **Better Spacing**: Use consistent spacing scale throughout
4. **Improved Shadows**: More sophisticated shadow system

### User Experience
1. **Loading States**: Add skeleton screens and loading animations
2. **Error Handling**: Better error messages and recovery options
3. **Onboarding**: Add guided tours for new users
4. **Micro-interactions**: Add subtle animations for better feedback

### Accessibility
1. **Color Blindness**: Ensure all information is accessible without color
2. **Voice Navigation**: Add voice command support
3. **High Contrast**: Implement high contrast mode
4. **Text Scaling**: Support up to 200% text scaling

### Mobile Experience
1. **Gesture Support**: Add swipe gestures for navigation
2. **Touch Feedback**: Haptic feedback for interactions
3. **Offline Support**: Better offline functionality
4. **PWA Features**: Add progressive web app capabilities

---

## 📊 Component Specifications

### Button Specifications
| Component | Height | Padding | Border Radius | Font Size | Font Weight |
|-----------|--------|---------|---------------|-----------|-------------|
| Primary Button | 48px | 12px 24px | 8px | 16px | 600 |
| Secondary Button | 48px | 12px 24px | 8px | 16px | 600 |
| Small Button | 36px | 8px 16px | 6px | 14px | 500 |
| Icon Button | 40px | 8px | 50% | 16px | 500 |

### Card Specifications
| Component | Padding | Border Radius | Shadow | Border |
|-----------|---------|---------------|--------|--------|
| Standard Card | 24px | 12px | 0 4px 8px rgba(0,0,0,0.1) | 1px solid rgba(255,255,255,0.2) |
| Session Card | 16px | 12px | 0 4px 8px rgba(0,0,0,0.1) | 4px solid (color varies) |
| Stat Card | 16px | 8px | none | 1px solid rgba(255,255,255,0.2) |

### Form Specifications
| Component | Height | Padding | Border Radius | Border |
|-----------|--------|---------|---------------|--------|
| Input Field | 48px | 12px 16px | 8px | 2px solid #e5e7eb |
| Select Field | 48px | 12px 16px | 8px | 2px solid #e5e7eb |
| Textarea | auto | 12px 16px | 8px | 2px solid #e5e7eb |

---

This comprehensive documentation provides a complete overview of the frontend design system, components, and user flows. Use this as a reference for maintaining consistency and improving the user experience across the application.
