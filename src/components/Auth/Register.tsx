import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { auth, db } from "../../firebase";
import { useUser } from "../../hooks/useUser";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export const Register = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { user } = useUser();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const _user = userCredential.user;
      console.log({ _user });

      if (displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }

      const { uid } = _user;

      await setDoc(doc(db, "users", uid), {
        uid,
        email: _user.email,
        displayName,
      });

      onSuccess?.();
      window.location.reload();
    } catch (error) {
      // @ts-expect-error firebase error typing
      const errorCode = error.code;
      // @ts-expect-error firebase error typing
      const errorMessage = error.message;
      console.log(errorCode, errorMessage);
      setError(errorMessage);
    }
  };

  if (user) {
    return (
      <div className="space-y-4 py-8 text-center">
        <h2 className="text-xl font-semibold">You are already logged in.</h2>
        <Button onClick={() => auth.signOut()}>Logout</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <h2 className="text-center text-xl font-semibold">
        Create a new account
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reg-display">Display Name</Label>
          <Input
            id="reg-display"
            placeholder="John Doe"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Other users will see this name
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="hello@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-password">Password</Label>
          <Input
            id="reg-password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full">
          Register
        </Button>
      </form>
    </div>
  );
};
