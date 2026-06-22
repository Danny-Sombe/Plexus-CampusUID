document.getElementById("forgot-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("forgot-email").value.trim();

    if (!email) {
        alert("Please enter your email address.");
        return;
    }

    try {
        const API_PORT = 5000;
        const SERVER_OVERRIDE = localStorage.getItem('serverHost');
        const API_BASE = SERVER_OVERRIDE
            ? (SERVER_OVERRIDE.match(/^https?:\/\//) ? SERVER_OVERRIDE : `http://${SERVER_OVERRIDE}`)
            : (window.location.protocol === 'file:' ? `http://localhost:${API_PORT}` : `${window.location.protocol}//${window.location.hostname}:${window.location.port || API_PORT}`);

        const response = await fetch(`${API_BASE.replace(/\/$/, '')}/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            alert("Error: " + (data.message || "Unable to send reset link."));
            return;
        }

        if (data.success) {
            alert(data.message);
            window.location.href = "index.html";
        } else {
            alert("Error: " + (data.message || "Unable to send reset link."));
        }
    } catch (error) {
        console.error("Forgot password error:", error);
        alert("Unable to send reset link. Make sure the server is running and email is configured.");
    }
});
