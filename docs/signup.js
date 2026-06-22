document.getElementById('signupform').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent form submission
    
    console.log("Signup form submitted");

    const fullname = document.getElementById('fullname').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const studentid = document.getElementById('studentid').value;

    try {
        const API_PORT = 5000;
        const SERVER_OVERRIDE = localStorage.getItem('serverHost');
        const API_BASE = SERVER_OVERRIDE
            ? (SERVER_OVERRIDE.match(/^https?:\/\//) ? SERVER_OVERRIDE : `http://${SERVER_OVERRIDE}`)
            : (window.location.protocol === 'file:' ? `http://localhost:${API_PORT}` : `${window.location.protocol}//${window.location.hostname}:${API_PORT}`);

        console.log('Using API base:', API_BASE);

        const response = await fetch(`${API_BASE.replace(/\/$/, '')}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullname: fullname,
                email: email,
                password: password,
                studentid: studentid
            })
        });
        let data;
        try {
            data = await response.json();
        } catch (e) {
            const text = await response.text().catch(() => '(no body)');
            throw new Error(`Server responded with status ${response.status}: ${text}`);
        }

        if (response.ok && data && data.success) {
            alert("Account created successfully!");
            window.location.href = 'index.html'; // Redirect to login page
            return;
        }

        // If not ok, show server-provided message when available
        const msg = (data && data.message) ? data.message : `Server error: ${response.status}`;
        alert(msg);

    }
    catch (error) {
        console.error('Signup error:', error);
        alert(`Cannot connect to server: ${error.message}`);
    }
});