import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { PROJECT_NAME } from "../consts";
import { auth } from "../firebase";

export const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onLogin = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in
        const user = userCredential.user;
        navigate("/");
        console.log(user);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorCode, errorMessage);
      });
  };

  return (
    <>
      <main>
        <section>
          <div>
            <p>{PROJECT_NAME}</p>

            <form>
              <div>
                <label htmlFor="email-address">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  placeholder="Email address"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <button onClick={onLogin}>Login</button>
              </div>
            </form>

            <p className="text-sm text-white text-center">
              No account yet? <NavLink to="/signup">Sign up</NavLink>
            </p>
          </div>
        </section>
      </main>
    </>
  );
};
