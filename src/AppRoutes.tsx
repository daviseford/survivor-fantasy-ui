import "@mantine/charts/styles.css";
import {
  Anchor,
  AppShell,
  Burger,
  Group,
  MantineProvider,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { useDisclosure } from "@mantine/hooks";
import { ModalsProvider } from "@mantine/modals";
import { QueryClientProvider } from "react-query";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import classes from "./AppRoutes.module.css";
import { AuthModal } from "./components/Auth/AuthModal";
import { Logout } from "./components/Auth/Logout";
import { Footer } from "./components/Footer";
import { Home } from "./components/Home/Home";
import { Navbar } from "./components/Navbar";
import { PROJECT_NAME } from "./consts";
import { Admin } from "./pages/Admin";
import { Competitions } from "./pages/Competitions";
import { DraftComponent } from "./pages/Draft";
import { SeasonAdmin } from "./pages/SeasonAdmin";
import { Seasons } from "./pages/Seasons";
import { SingleCompetition } from "./pages/SingleCompetition";
import { SingleSeason } from "./pages/SingleSeason";
import { queryClient } from "./queryClient";
import { theme } from "./theme";

const modals = { AuthModal };

declare module "@mantine/modals" {
  export interface MantineModalsOverride {
    modals: typeof modals;
  }
}

export const AppRoutes = () => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <MantineProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <ModalsProvider modals={modals}>
            <AppShell
              header={{
                height: {
                  base: 42,
                  sm: 55,
                },
              }}
              navbar={{
                width: 300,
                breakpoint: "sm",
                collapsed: { mobile: !opened },
              }}
              padding="md"
            >
              <AppShell.Header>
                <Group>
                  <Burger
                    opened={opened}
                    onClick={toggle}
                    hiddenFrom="sm"
                    size="sm"
                  />
                  <Anchor
                    className={classes.title}
                    variant="gradient"
                    gradient={{ from: "blue", to: "cyan" }}
                    inherit
                    href="/"
                  >
                    {PROJECT_NAME}
                  </Anchor>
                </Group>
              </AppShell.Header>

              <AppShell.Navbar p="md">
                <Navbar />
              </AppShell.Navbar>

              <AppShell.Main className={classes.main}>
                <Routes>
                  <Route path="/" element={<Home />} />

                  {/* User stuff */}
                  <Route path="/logout" element={<Logout />} />

                  {/* Drafting */}
                  <Route
                    path="/seasons/:seasonId/draft/:draftId"
                    element={<DraftComponent />}
                  />

                  {/* Seasons */}
                  <Route
                    path="/seasons/:seasonId/manage"
                    element={<SeasonAdmin />}
                  />
                  <Route path="/seasons/:seasonId" element={<SingleSeason />} />
                  <Route path="/seasons" element={<Seasons />} />

                  {/* Competitions */}
                  <Route
                    path="/competitions/:competitionId"
                    element={<SingleCompetition />}
                  />
                  <Route path="/competitions" element={<Competitions />} />

                  {/* TODO: Protect this */}
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </AppShell.Main>

              <AppShell.Footer>
                <Footer />
              </AppShell.Footer>
            </AppShell>
          </ModalsProvider>
        </Router>
      </QueryClientProvider>
    </MantineProvider>
  );
};
