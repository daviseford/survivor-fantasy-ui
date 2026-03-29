import { User, onAuthStateChanged } from "firebase/auth";

import { useEffect, useMemo, useState } from "react";
import { auth } from "../firebase";
import { SlimUser } from "../types";

export const useUser = () => {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    // https://www.freecodecamp.org/news/use-firebase-authentication-in-a-react-app/
    // https://console.firebase.google.com/project/survivor-fantasy-51c4b/authentication/users
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(undefined);
      }
    });
  }, []);

  const slimUser: SlimUser | undefined = useMemo(() => {
    if (!user) return undefined;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email,
      isAdmin: user.uid === "nYFrQNEg8KX485tSVCtoLMjMMoJ3",
    };
  }, [user]);

  return { user, slimUser };
};
