document.addEventListener("DOMContentLoaded", function () {

    const loginForm =
        document.getElementById("loginForm");

    const passwordInput =
        document.getElementById("password");

    const togglePassword =
        document.getElementById("togglePassword");

    const loginMessage =
        document.getElementById("loginMessage");


    /* ================================
       SHOW / HIDE PASSWORD
    ================================ */

    togglePassword.addEventListener(
        "click",
        function () {

            if (passwordInput.type === "password") {

                passwordInput.type = "text";
                togglePassword.textContent = "🙈";

            } else {

                passwordInput.type = "password";
                togglePassword.textContent = "👁";

            }

        }
    );


    /* ================================
       LOGIN
    ================================ */

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const password =
                passwordInput.value.trim();


            loginMessage.textContent = "";
            loginMessage.style.color = "#dc2626";


            if (email === "" || password === "") {

                loginMessage.textContent =
                    "Please fill all fields.";

                return;

            }


            if (password.length < 6) {

                loginMessage.textContent =
                    "Password must contain at least 6 characters.";

                return;

            }


            try {

                const response =
                    await fetch(
                        "https://placementhub-management-system.onrender.com/api/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                email: email,
                                password: password
                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    loginMessage.textContent =
                        data.message ||
                        "Login failed.";

                    return;

                }


                /* ================================
                   SAVE LOGIN INFORMATION
                ================================ */

                localStorage.setItem(
                    "authToken",
                    data.token
                );

                localStorage.setItem(
                    "loggedInUser",
                    data.user.email
                );

                localStorage.setItem(
                    "userName",
                    data.user.name
                );

                localStorage.setItem(
                    "userRole",
                    data.user.role
                );

                localStorage.setItem(
                    "userId",
                    data.user.id
                );


                loginMessage.textContent =
                    "Login successful!";

                loginMessage.style.color =
                    "#16a34a";


                setTimeout(
                    function () {

                      const destination =
    data.user.role === "admin"
        ? "./admin.html"
        : "./dashboard.html";

window.location.href = destination;  
                            

                    },
                    500
                );

            } catch (error) {

                console.error(error);

                loginMessage.textContent =
                    "Unable to connect to server.";

            }

        }
    );

});
