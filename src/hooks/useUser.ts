import { User, getIdTokenResult, onAuthStateChanged } from "firebase/auth";

import { useEffect, useMemo, useState } from "react";
import { auth } from "../firebase";
import { SlimUser } from "../types";

export const useUser = () => {
  const [user, setUser] = useState<User>();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      let cancelled = false;

      if (user) {
        setUser(user);
        getIdTokenResult(user, true)
          .then((tokenResult) => {
            if (!cancelled) {
              setIsAdmin(!!tokenResult.claims.admin);
            }
          })
          .catch(() => {
            if (!cancelled) {
              setIsAdmin(false);
            }
          });
      } else {
        setUser(undefined);
        setIsAdmin(false);
      }

      return () => {
        cancelled = true;
      };
    });

    return unsubscribe;
  }, []);

  const slimUser: SlimUser | undefined = useMemo(() => {
    if (!user) return undefined;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email,
      isAdmin,
    };
  }, [user, isAdmin]);

  return { user, slimUser };
};
