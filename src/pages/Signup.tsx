import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { PROJECT_NAME } from "../consts";
import { auth, db } from "../firebase";
import { useUser } from "../hooks/useUser";

export const Signup = () => {
  const navigate = useNavigate();

  const { user } = useUser();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Signed in
      const user = userCredential.user;

      console.log({ user });

      if (displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }

      const { uid } = user;

      // Create a doc for this user
      setDoc(doc(db, "users", uid), { uid, email: user.email, displayName });

      navigate("/");
      // ...
    } catch (error) {
      // @ts-expect-error asdas
      const errorCode = error.code;
      // @ts-expect-error asdasd
      const errorMessage = error.message;
      console.log(errorCode, errorMessage);
      // ..
    }
  };

  if (user) {
    return (
      <div>
        <p>
          You are already logged in. <NavLink to="/logout">Logout</NavLink>
        </p>
      </div>
    );
  }

  return (
    <main>
      <section>
        <div>
          <div>
            <h1>{PROJECT_NAME}</h1>
            <form>
              <div>
                <label htmlFor="display-name">Display Name</label>
                <input
                  type="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email-address">Email address</label>
                <input
                  type="email"
                  //   label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email address"
                />
              </div>

              <div>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  //   label="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                />
              </div>

              <button type="submit" onClick={onSubmit}>
                Sign up
              </button>
            </form>

            <p>
              Already have an account? <NavLink to="/login">Sign in</NavLink>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
