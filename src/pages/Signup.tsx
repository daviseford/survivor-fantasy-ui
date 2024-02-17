import {
  Anchor,
  Button,
  Paper,
  PasswordInput,
  Text,
  TextInput,
} from "@mantine/core";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
      const _user = userCredential.user;

      console.log({ _user });

      if (displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }

      const { uid } = _user;

      // Create a doc for this user
      setDoc(doc(db, "users", uid), { uid, email: _user.email, displayName });

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
          You are already logged in.{" "}
          <Button onClick={() => auth.signOut()}>Logout</Button>
        </p>
      </div>
    );
  }

  return (
    <main>
      <section>
        <div>
          <div>
            <h1>Register a new account</h1>

            <Paper radius={0} p={30}>
              <TextInput
                label="Display Name"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                size="md"
              />
              <TextInput
                label="Email address"
                placeholder="hello@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                size="md"
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                mt="md"
                size="md"
              />

              <Button type="submit" onClick={onSubmit}>
                Sign up
              </Button>

              <Text ta="center" mt="md">
                Already have an account?{" "}
                <Anchor<"a"> href="/login" fw={700}>
                  Login
                </Anchor>
              </Text>
            </Paper>
          </div>
        </div>
      </section>
    </main>
  );
};
