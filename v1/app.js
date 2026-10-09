// Import functions from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your saved Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyAA0Z3wxVTZfnycymlMnLg2DBfWiEV7LhM",
    authDomain: "eesa-association-dypsem.firebaseapp.com",
    projectId: "eesa-association-dypsem",
    storageBucket: "eesa-association-dypsem.appspot.com",
    messagingSenderId: "904621731688",
    appId: "1:904621731688:web:e72541588ac301002d30dd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Get references to UI elements ---
const authArea = document.getElementById('auth-area');
const authModal = document.getElementById('auth-modal');

// --- AUTHENTICATION STATE ENGINE ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ---- USER IS LOGGED IN ----
        // Update the header to show a welcome message and sign out button
        authArea.innerHTML = `
            <div class="flex items-center gap-3 text-xs">
                <span class="font-semibold text-white">Welcome, ${user.email.split('@')[0]}</span>
                <button id="logout-btn" class="px-3 py-2 rounded-xl bg-rose-600 text-white font-bold">Sign Out</button>
            </div>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    } else {
        // ---- USER IS LOGGED OUT ----
        // Show the default "Sign In" button
        authArea.innerHTML = `
            <button onclick="openAuthModal()" class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs">
                <div class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold"><i class="fa-solid fa-user"></i></div>
                <span class="font-semibold text-slate-200">Sign In</span>
            </button>
        `;
    }
});

// --- MODAL AND FORM HANDLING ---
window.openAuthModal = () => {
    authModal.innerHTML = `
        <div class="max-w-md w-full glass-panel p-8 rounded-2xl relative">
            <button onclick="closeAuthModal()" class="absolute top-4 right-4 text-slate-400">&times;</button>
            <h3 class="text-lg font-bold text-white mb-2">Member Portal</h3>
            <form id="auth-form" class="space-y-4 text-xs">
                <div><label class="block text-slate-400 text-[9px] mb-1">Email</label><input type="email" id="auth-email" required class="w-full p-2 rounded-lg bg-slate-900 border border-slate-700"></div>
                <div><label class="block text-slate-400 text-[9px] mb-1">Password</label><input type="password" id="auth-pass" required class="w-full p-2 rounded-lg bg-slate-900 border border-slate-700"></div>
                <button type="submit" class="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs uppercase">Sign In / Register</button>
            </form>
        </div>
    `;
    authModal.classList.remove('hidden');
    authModal.classList.add('flex');

    // Add event listener to the new form
    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
};

window.closeAuthModal = () => authModal.classList.replace('flex', 'hidden');

const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    email: email,
                    name: email.split('@')[0],
                    role: 'student'
                });
                alert("Account created successfully!");
            } catch (registerError) {
                alert("Registration failed: " + registerError.message);
            }
        } else {
            alert("Login failed: " + error.message);
        }
    }
    closeAuthModal();
};
