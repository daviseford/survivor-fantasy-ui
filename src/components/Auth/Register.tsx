import {
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { auth, db } from "../../firebase";
import { useUser } from "../../hooks/useUser";

export const Register = () => {
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

      // Signed in
      const _user = userCredential.user;

      console.log({ _user });

      if (displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }

      const { uid } = _user;

      // Create a doc for this user
      await setDoc(doc(db, "users", uid), {
        uid,
        email: _user.email,
        displayName,
      });

      modals.closeAll();

      window.location.reload();
      // ...
    } catch (error) {
      // @ts-expect-error asdas
      const errorCode = error.code;
      // @ts-expect-error asdasd
      const errorMessage = error.message;
      console.log(errorCode, errorMessage);
      setError(errorMessage);
      // ..
    }
  };

  if (user) {
    return (
      <Container size={420} my={40}>
        <Title ta="center">You are already logged in.</Title>
        <Button onClick={() => auth.signOut()}>Logout</Button>
      </Container>
    );
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Create a new account</Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <TextInput
          label="Display Name"
          placeholder="John Doe"
          description="Other users will see this name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <TextInput
          label="Email"
          placeholder="hello@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          mt="md"
        />
        <PasswordInput
          label="Password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          mt="md"
        />

        {error && (
          <Text c="red" mt="lg">
            {error}
          </Text>
        )}

        <Button fullWidth mt="xl" onClick={onSubmit}>
          Register
        </Button>
      </Paper>
    </Container>
  );
};
