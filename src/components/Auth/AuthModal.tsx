import { Tabs } from "@mantine/core";
import { Login, Register } from ".";

export const AuthModal = () => {
  return (
    <>
      <Tabs defaultValue="login">
        <Tabs.List justify="center">
          <Tabs.Tab value="login">Login</Tabs.Tab>
          <Tabs.Tab value="register">Register</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="login">
          <Login />
        </Tabs.Panel>

        <Tabs.Panel value="register">
          <Register />
        </Tabs.Panel>
      </Tabs>
    </>
  );
};
