import { AppShell, Burger, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { useDisclosure } from "@mantine/hooks";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { useUser } from "./hooks/useUser";
import { Admin } from "./pages/Admin";
import { App } from "./pages/App";
import { DraftComponent } from "./pages/Draft";
import { Login } from "./pages/Login";
import { Logout } from "./pages/Logout";
import { Seasons } from "./pages/Seasons";
import { Signup } from "./pages/Signup";
import { SingleSeason } from "./pages/SingleSeason";
import { theme } from "./theme";

export const AppRoutes = () => {
  const [opened, { toggle }] = useDisclosure();

  const { user } = useUser();

  return (
    <MantineProvider theme={theme}>
      <Router>
        <AppShell
          header={{ height: 60 }}
          navbar={{
            width: 300,
            breakpoint: "sm",
            collapsed: { mobile: !opened },
          }}
          padding="md"
        >
          <AppShell.Header>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            {user && (
              <div>
                Logged in: {user.displayName} Email: {user.email}
              </div>
            )}
          </AppShell.Header>

          <AppShell.Navbar p="md">
            <Navbar />
          </AppShell.Navbar>

          <AppShell.Main>
            <section>
              <Routes>
                <Route path="/" element={<App />} />

                {/* User stuff */}
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/logout" element={<Logout />} />

                {/* <Route path="/seasons/:season/:episode" element={<Seasons />} /> */}
                <Route
                  path="/seasons/:season/draft/:draftId"
                  element={<DraftComponent />}
                />
                <Route path="/seasons/:season" element={<SingleSeason />} />
                <Route path="/seasons" element={<Seasons />} />

                {/* TODO: Protect this */}
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </section>
          </AppShell.Main>
        </AppShell>
      </Router>
    </MantineProvider>
  );
};
