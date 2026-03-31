import { User, getIdTokenResult, onAuthStateChanged } from "firebase/auth";

import { useEffect, useMemo, useState } from "react";
import { auth } from "../firebase";
import { SlimUser } from "../types";

export const useUser = () => {
  const [user, setUser] = useState<User>();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        getIdTokenResult(user)
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
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
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
