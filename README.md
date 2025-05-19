# Mapty Project

## Overview

This project was originally developed as part of my learning journey in JavaScript, inspired by [Jonas Schmedtmann]’s *The Complete JavaScript Course*. While the initial version used Leaflet and localStorage, I have significantly enhanced the app by integrating **Mapbox GL JS** for mapping and **Firebase (Firestore + Google Authentication)** for persistent, multi-user data storage.

The app allows users to track and visualize their workouts (running or cycling) on an interactive map with persistent login and synced data across devices.

---

## Features

- 🗺️ **Interactive Mapping with Mapbox GL JS**  
  Users can log workouts by clicking on the map, with real-time map rendering and smooth interactivity.

- 📍 **Geolocation Support**  
  Automatically detects and centers the map on the user's current location.

- 🏃 **Workout Logging**  
  Log running or cycling workouts with key stats like distance, duration, pace/speed, and location.

- ☁️ **Firebase Integration**  
  - **Google Authentication**: Users can sign in securely with their Google accounts.  
  - **Firestore Database**: Stores each user's workouts in a cloud database, allowing seamless sync across sessions and devices.

- 🔐 **Multi-user Support**  
  Each user sees only their own workouts after logging in, thanks to Firebase's authentication and Firestore rules.

---

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- **Backend / Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Authentication**: [Firebase Auth with Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin)

---

## API Credits

- **Mapbox API** — For rendering the interactive map and geolocation support.  
  📚 [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)

- **Firebase API** — For cloud database and user authentication.  
  📚 [Firebase Documentation](https://firebase.google.com/docs)

---

## Acknowledgments

Huge thanks to [Jonas Schmedtmann] for his outstanding JavaScript course, which laid the foundation for this project and inspired the original version of Mapty.

🎓 [*The Complete JavaScript Course* on Udemy](https://www.udemy.com/course/the-complete-javascript-course/)

---

## License

This project is a personal implementation and extension of the Mapty project idea, with significant original modifications. External libraries like Mapbox and Firebase are used under their respective licenses.
