import {
  Anchor,
  Button,
  Paper,
  PasswordInput,
  Text,
  TextInput,
} from "@mantine/core";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
            <h1>Log in to an existing account</h1>

            <Paper radius={0} p={30}>
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

              <Button type="submit" onClick={onLogin}>
                Sign up
              </Button>

              <Text ta="center" mt="md">
                Don&apos;t have an account?{" "}
                <Anchor<"a"> href="/signup" fw={700}>
                  Register
                </Anchor>
              </Text>
            </Paper>
          </div>
        </section>
      </main>
    </>
  );
};
