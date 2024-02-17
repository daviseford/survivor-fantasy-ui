import { getApps } from "firebase/app";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { PROJECT_NAME } from "../consts";
import { auth } from "../firebase";

export const App = () => {
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
      <h1>{PROJECT_NAME}</h1>
      Welcome to the app. This is the home screen.
    </>
  );
};
