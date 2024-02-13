import { useEffect, useState } from "react";
import reactLogo from "../assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { getApps } from "firebase/app";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { PROJECT_NAME } from "../consts";

export const App = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // https://www.freecodecamp.org/news/use-firebase-authentication-in-a-react-app/
    // https://console.firebase.google.com/project/survivor-fantasy-51c4b/authentication/users
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const uid = user.uid;
        // ...
        console.log({ user });
        console.log("uid", uid);
      } else {
        // User is signed out
        // ...
        console.log("user is logged out");
      }
    });
  }, []);

  const firebaseApps = getApps();

  console.log({ firebaseApps });

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>{PROJECT_NAME}</h1>

      <Link to="/logout">Logout</Link>
      <br />
      <Link to="/signup">Sign Up</Link>
      <br />
      <Link to="/login">Login</Link>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
};
