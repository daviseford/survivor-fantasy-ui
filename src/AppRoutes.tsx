import "@mantine/core/styles.css";
import { AppShell, Burger, MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import { App } from "./pages/App";
import { NavLink, BrowserRouter as Router } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import { Signup } from "./pages/Signup";
import { Login } from "./pages/Login";
import { Logout } from "./pages/Logout";
import { Seasons } from "./pages/Seasons";
import { Admin } from "./pages/Admin";
import { SingleSeason } from "./pages/SingleSeason";
import { useDisclosure } from "@mantine/hooks";
import { PROJECT_NAME } from "./consts";

export const AppRoutes = () => {
  const [opened, { toggle }] = useDisclosure();

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
            <div>Logo</div>
          </AppShell.Header>

          <AppShell.Navbar p="md">
            <h1>{PROJECT_NAME}</h1>

            <NavLink to="/admin">Admin</NavLink>
            <br />
            <NavLink to="/seasons">Seasons</NavLink>
            <br />
            <NavLink to="/logout">Logout</NavLink>
            <br />
            <NavLink to="/signup">Sign Up</NavLink>
            <br />
            <NavLink to="/login">Login</NavLink>
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
