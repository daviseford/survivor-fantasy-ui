import { User, onAuthStateChanged } from "firebase/auth";

import { useEffect, useMemo, useState } from "react";
import { auth } from "../firebase";

export const useUser = () => {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    // https://www.freecodecamp.org/news/use-firebase-authentication-in-a-react-app/
    // https://console.firebase.google.com/project/survivor-fantasy-51c4b/authentication/users
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        console.log({ user });

        setUser(user);
      } else {
        // User is signed out
        console.log("user is logged out");
        setUser(undefined);
      }
    });
  }, []);

  const slimUser: Pick<User, "email" | "displayName" | "uid"> | undefined =
    useMemo(() => {
      if (!user) return undefined;

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      };
    }, [user]);

  return { user, slimUser };
};
