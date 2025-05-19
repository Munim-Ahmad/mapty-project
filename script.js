mapboxgl.accessToken =
  'pk.eyJ1IjoibXVuaW0tYWhtYWQiLCJhIjoiY21hdGowMzhyMHI5MzJqc2htaGVxZGZiNyJ9.mKmWXmqImzU2EUCVRv1hBA';
('use strict');

import { auth, db } from './firebase.js';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { Buffer } from 'buffer';
window.Buffer = Buffer;

import process from 'process';
window.process = process;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(
      1,
    )} on ${new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(this.date)}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const containerAuth = document.querySelector('.auth'); // Assuming a container for auth elements
const btnLogin = document.getElementById('btn-login'); // Use ID
const btnSignup = document.getElementById('btn-signup'); // Use ID
const btnLogout = document.getElementById('btn-logout'); // Use ID
const emailInput = document.getElementById('email'); // Use ID
const passwordInput = document.getElementById('password'); // Use ID
const userInfo = document.getElementById('user-info'); // Use ID
const btnGoogleSignIn = document.getElementById('signin-btn');
const btnGoogleSignOut = document.getElementById('signout-btn');

// const userInfo = document.getElementById('user-info');
class App {
  #map;
  #mapEvent;
  #markers = [];
  #workouts = [];
  #mapZoomLevel = 13;
  #currentUser = null;

  constructor() {
    this._getPosition();
    this._initAuthUI();
    this._setupAuthListener();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _initAuthUI() {
    // Add event listeners to auth buttons
    if (btnGoogleSignIn) {
      btnGoogleSignIn.addEventListener('click', async (e) => {
        e.preventDefault();
        const provider = new GoogleAuthProvider();
        try {
          await signInWithPopup(auth, provider);
        } catch (err) {
          alert('Google Sign-In failed: ' + err.message);
        }
      });
    }

    if (btnGoogleSignOut) {
      // Check if element exists
      btnGoogleSignOut.addEventListener('click', async () => {
        // The markers are removed when the auth state changes in _setupAuthListener
        await signOut(auth);
      });
    }

    // Initial state of buttons/inputs (hidden by default in HTML/CSS preferably)
    // Handled by _setupAuthListener based on initial auth state.
  }

  _setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
      // Ensure all relevant elements are selected
      const btnLogin = document.getElementById('btn-login');
      const btnSignup = document.getElementById('btn-signup');
      const btnGoogleSignOut = document.getElementById('signout-btn');
      const btnGoogleSignIn = document.getElementById('signin-btn');
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const userInfo = document.getElementById('user-info');

      if (user) {
        // User is logged in
        this.#currentUser = user;
        if (userInfo) userInfo.textContent = `Logged in as: ${user.email}`;

        // Hide login/signup, show logout
        if (btnGoogleSignOut) btnGoogleSignOut.classList.remove('hidden');
        if (btnGoogleSignIn) btnGoogleSignIn.classList.add('hidden');
        this._loadWorkoutsFromFirestore();
      } else {
        // User is logged out
        this.#currentUser = null;
        if (userInfo) userInfo.textContent = 'Not logged in';

        // Show login/signup, hide logout
        if (btnGoogleSignIn) btnGoogleSignIn.classList.remove('hidden');
        if (btnGoogleSignOut) btnGoogleSignOut.classList.add('hidden');
        // Clear workouts and markers when logged out
        this.#workouts = [];
        this._clearWorkoutsUI();

        // Remove all markers from the map
        this.#markers.forEach((marker) => marker.remove());
        this.#markers = []; // Clear the internal markers array
      }
    });
  }

  async _loadWorkoutsFromFirestore() {
    if (!this.#currentUser) return;
    this.#workouts = [];
    this._clearWorkoutsUI();

    const q = query(
      collection(db, 'workouts'),
      where('uid', '==', this.#currentUser.uid),
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let workout;
      if (data.type === 'running') {
        workout = new Running(
          data.coords,
          data.distance,
          data.duration,
          data.cadence,
        );
      } else if (data.type === 'cycling') {
        workout = new Cycling(
          data.coords,
          data.distance,
          data.duration,
          data.elevationGain,
        );
      }
      workout.id = data.id;
      workout.date = data.date.toDate
        ? data.date.toDate()
        : new Date(data.date);
      this.#workouts.push(workout);
      this._renderWorkout(workout);
      this._renderWorkoutMarker(workout);
    });
  }

  _clearWorkoutsUI() {
    document.querySelectorAll('.workout').forEach((el) => el.remove());
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        },
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [longitude, latitude];

    this.#map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: coords,
      zoom: 13,
    });

    const el = document.createElement('div');
    el.className = 'dot-marker';

    const marker = new mapboxgl.Marker(el);
    marker.setLngLat(coords).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.classList.add('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _renderWorkoutMarker(workout) {
    const marker = new mapboxgl.Marker({
      color: workout.type === 'running' ? 'green' : 'orange',
      anchor: 'bottom',
      offset: [0, -20],
    });
    marker
      .setLngLat(workout.coords)
      .setPopup(
        new mapboxgl.Popup({
          maxWidth: '250px',
          closeOnClick: false,
          closeButton: false,
          className: `${workout.type}-popup`,
        }).setHTML(`
            <p>${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
          workout.type
        } on ${workout.date.toDateString().slice(4)}</p>
            <p>Distance: ${workout.distance} km</p>
            <p>Duration: ${workout.duration} min</p>
          `),
      )
      .addTo(this.#map)
      .togglePopup();
    this.#markers.push(marker);
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id,
    );

    this.#map.flyTo({
      center: workout.coords,
      zoom: this.#mapZoomLevel,
      speed: 1.2,
      curve: 1.42,
      essential: true,
    });
  }

  async _newWorkout(e) {
    e.preventDefault();
    if (!this.#currentUser) return alert('Please log in to add workouts.');

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lng, lat } = this.#mapEvent.lngLat;

    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    let workout;
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs must be positive numbers!');

      workout = new Running([lng, lat], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(
          'Inputs must be positive numbers! Elevation can be negative.',
        );

      workout = new Cycling([lng, lat], distance, duration, elevation);
    }

    this.#workouts.push(workout);
    this._renderWorkout(workout);
    this._renderWorkoutMarker(workout);
    this._hideForm();

    try {
      await setDoc(doc(db, 'workouts', workout.id), {
        uid: this.#currentUser.uid,
        id: workout.id,
        type: workout.type,
        coords: workout.coords,
        distance: workout.distance,
        duration: workout.duration,
        ...(workout.type === 'running'
          ? { cadence: workout.cadence }
          : { elevationGain: workout.elevationGain }),
        date: workout.date,
      });
    } catch (err) {
      alert('Error saving workout: ' + err.message);
    }
  }
}

const app = new App();
