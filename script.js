import { auth, db } from './firebase.js';
import {
  getAuth,
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
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
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
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #currentUser = null;

  constructor() {
    this._getPosition();

    this.form = document.querySelector('.form');
    this.containerWorkouts = document.querySelector('.workouts');
    this.inputType = document.querySelector('.form__input--type');
    this.inputDistance = document.querySelector('.form__input--distance');
    this.inputDuration = document.querySelector('.form__input--duration');
    this.inputCadence = document.querySelector('.form__input--cadence');
    this.inputElevation = document.querySelector('.form__input--elevation');

    this._initAuthUI();
    this._setupAuthListener();

    this.form.addEventListener('submit', this._newWorkout.bind(this));
    this.inputType.addEventListener(
      'change',
      this._toggleElevationField.bind(this),
    );
  }

  _initAuthUI() {
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.btnLogin = document.getElementById('btn-login');
    this.btnSignup = document.getElementById('btn-signup');
    this.btnLogout = document.getElementById('btn-logout');
    this.userInfo = document.getElementById('user-info');

    this.btnLogin.addEventListener('click', async () => {
      try {
        await signInWithEmailAndPassword(
          auth,
          this.emailInput.value,
          this.passwordInput.value,
        );
      } catch (err) {
        alert('Login failed: ' + err.message);
      }
    });

    this.btnSignup.addEventListener('click', async () => {
      try {
        await createUserWithEmailAndPassword(
          auth,
          this.emailInput.value,
          this.passwordInput.value,
        );
      } catch (err) {
        alert('Signup failed: ' + err.message);
      }
    });

    this.btnLogout.addEventListener('click', async () => {
      await signOut(auth);
    });
  }

  _setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.#currentUser = user;
        this.userInfo.textContent = `Logged in as: ${user.email}`;
        this.btnLogout.style.display = 'inline-block';
        this.btnLogin.style.display = 'none';
        this.btnSignup.style.display = 'none';
        this.emailInput.style.display = 'none';
        this.passwordInput.style.display = 'none';
        this._loadWorkoutsFromFirestore();
      } else {
        this.#currentUser = null;
        this.userInfo.textContent = 'Not logged in';
        this.btnLogout.style.display = 'none';
        this.btnLogin.style.display = 'inline-block';
        this.btnSignup.style.display = 'inline-block';
        this.emailInput.style.display = 'inline-block';
        this.passwordInput.style.display = 'inline-block';
        this.#workouts = [];
        this._clearWorkoutsUI();
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
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    this.form.style.display = 'block';
    this.inputDistance.focus();
  }

  _hideForm() {
    this.inputDistance.value =
      this.inputDuration.value =
      this.inputCadence.value =
      this.inputElevation.value =
        '';
    this.form.style.display = 'none';
  }

  _toggleElevationField() {
    const isRunning = this.inputType.value === 'running';
    this.inputCadence.style.display = isRunning ? 'block' : 'none';
    this.inputElevation.style.display = isRunning ? 'none' : 'block';
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }),
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
          workout.type
        } on ${workout.date.toDateString().slice(4)}`,
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${
          workout.type[0].toUpperCase() + workout.type.slice(1)
        } on ${workout.date.toDateString().slice(4)}</h2>
        <div class="workout__details">
          <span>Distance: ${workout.distance} km</span>
          <span>Duration: ${workout.duration} min</span>
    `;

    if (workout.type === 'running') {
      html += `
          <span>Cadence: ${workout.cadence} spm</span>
          <span>Pace: ${workout.pace.toFixed(1)} min/km</span>
        </div>
      </li>`;
    } else {
      html += `
          <span>Elevation Gain: ${workout.elevationGain} m</span>
          <span>Speed: ${workout.speed.toFixed(1)} km/h</span>
        </div>
      </li>`;
    }

    this.containerWorkouts.insertAdjacentHTML('beforeend', html);
  }

  async _newWorkout(e) {
    e.preventDefault();
    if (!this.#currentUser) return alert('Please log in to add workouts.');

    const type = this.inputType.value;
    const distance = +this.inputDistance.value;
    const duration = +this.inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    let workout;
    if (type === 'running') {
      const cadence = +this.inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs must be positive numbers!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +this.inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(
          'Inputs must be positive numbers! Elevation can be negative.',
        );
      workout = new Cycling([lat, lng], distance, duration, elevation);
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
