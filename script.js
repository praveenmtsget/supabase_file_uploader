// script.js

// 1. INITIALIZE SUPABASE CLIENT
// The variables SUPABASE_URL and SUPABASE_ANON_KEY are now expected
// to be defined in `env.js` (for local dev) or injected at build time (for prod).
if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    throw new Error("Supabase URL and Anon Key are not defined. Make sure you have an env.js file for local development or that variables are injected for production.");
}

// The 'supabase' on the right side refers to the global object from the CDN script.
// The 'const supabase' on the left side is your new local client instance.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// script.js (Secure Version)

// 2. DOM ELEMENTS
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');

const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const uploadButton = document.getElementById('upload-button');
const messageDiv = document.getElementById('message');

let currentSession = null;

// 3. AUTHENTICATION LOGIC
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    const { error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        showMessage(`Signup error: ${error.message}`, 'error');
    } else {
        showMessage('Signup successful! Please check your email to confirm.', 'success');
        signupForm.reset();
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        showMessage(`Login error: ${error.message}`, 'error');
    } else {
        showMessage('Logged in successfully!', 'success');
        loginForm.reset();
        // The onAuthStateChange handler will take care of updating the UI
    }
});

logoutButton.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    // The onAuthStateChange handler will take care of updating the UI
});

// 4. MAIN APP LOGIC (FILE HANDLING)
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = fileInput.files[0];

    // --- Add a file size check for extra validation ---
    if (!file) {
        showMessage('Please select a file to upload.', 'error');
        return;
    }
    if (file.size === 0) {
        showMessage('Cannot upload an empty file.', 'error');
        return;
    }
    // ----------------------------------------------------

    const user = currentSession.user;
    if (!user) {
        showMessage('Error: No active user session. Please log in again.', 'error');
        return;
    }
    
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    
    uploadButton.disabled = true;
    uploadButton.textContent = 'Uploading...';

    try {
        const { error } = await supabaseClient.storage
            .from('user-submitted-docs')
            .upload(filePath, file);

        if (error) {
            throw error; // Let the catch block handle it
        }

        showMessage('File uploaded successfully!', 'success');
        await listFiles(); // Refresh file list

        // --- RESET THE FORM HERE, ON SUCCESS ---
        uploadForm.reset(); 
        // --------------------------------------

    } catch (error) {
        showMessage(`Error uploading file: ${error.message}`, 'error');
        console.error('Upload error details:', error);
    } finally {
        // --- THIS BLOCK NOW ONLY HANDLES UI STATE ---
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload';
        // --------------------------------------------
    }
});
async function listFiles() {
    fileList.innerHTML = '<li>Loading files...</li>';
    const user = currentSession.user;

    const { data, error } = await supabaseClient.storage
        .from('user-submitted-docs')
        .list(user.id, { // List files in the user's folder
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' },
        });

    if (error) {
        fileList.innerHTML = '<li>Error loading files.</li>';
        console.error('Error listing files:', error);
        return;
    }

    if (data.length === 0) {
        fileList.innerHTML = '<li>No files uploaded yet.</li>';
        return;
    }
    
    fileList.innerHTML = '';
    for (const file of data) {
        const li = document.createElement('li');
        
        // Create a secure, expiring link to the file
        const { data: signedUrlData, error: urlError } = await supabaseClient.storage
            .from('user-submitted-docs')
            .createSignedUrl(`${user.id}/${file.name}`, 60); // URL expires in 60 seconds

        if (urlError) {
            console.error('Error creating signed URL for', file.name);
            continue; // Skip this file if URL can't be created
        }
        
        li.innerHTML = `
            <span>${file.name}</span>
            <a href="${signedUrlData.signedUrl}" target="_blank">View/Download</a>
        `;
        fileList.appendChild(li);
    }
}

// 5. UI AND STATE MANAGEMENT
function showMessage(message, type = 'success') {
    messageDiv.textContent = message;
    messageDiv.className = type;
    // Clear message after 5 seconds
    setTimeout(() => { messageDiv.className = ''; messageDiv.textContent = ''; }, 5000);
}

function updateUI(session) {
    currentSession = session;

    if (session) {
        // User is logged in
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userInfo.querySelector('span').textContent = `Welcome, ${session.user.email}`;
        listFiles();
    } else {
        // User is logged out
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        fileList.innerHTML = '';
    }
}

// 6. LISTEN TO AUTH STATE CHANGES
supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateUI(session);
});

// Initial check
// This handles the case where the user is already logged in when the page loads
async function initializeApp() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    updateUI(session);
}

initializeApp();