import { AppShell, Burger, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { useDisclosure } from "@mantine/hooks";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { useUser } from "./hooks/useUser";
import { Admin } from "./pages/Admin";
import { Competitions } from "./pages/Competitions";
import { DraftComponent } from "./pages/Draft";
import { Home } from "./pages/Home";
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
                <Route path="/" element={<Home />} />

                {/* User stuff */}
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/logout" element={<Logout />} />

                {/* <Route path="/seasons/:seasonId/:episodeId" element={<Seasons />} /> */}
                <Route
                  path="/seasons/:seasonId/draft/:draftId"
                  element={<DraftComponent />}
                />
                <Route path="/seasons/:seasonId" element={<SingleSeason />} />
                <Route path="/seasons" element={<Seasons />} />

                {/* Competitions */}
                {/* <Route path="/competitions/:competitionId" element={<Competitions />} /> */}
                <Route path="/competitions" element={<Competitions />} />

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
