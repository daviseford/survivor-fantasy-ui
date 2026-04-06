import {
  Anchor,
  AppShell,
  Burger,
  Center,
  Group,
  Loader,
  MantineProvider,
  Text,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { useDisclosure } from "@mantine/hooks";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import {
  Link,
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import classes from "./AppRoutes.module.css";
import { AuthModal } from "./components/Auth/AuthModal";
import { Logout } from "./components/Auth/Logout";
import { Footer } from "./components/Footer";
import { Home } from "./components/Home/Home";
import { Navbar } from "./components/Navbar";
import { NotFound } from "./components/NotFound";
import { theme } from "./theme";

const Admin = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.Admin })),
);
const Competitions = lazy(() =>
  import("./pages/Competitions").then((m) => ({ default: m.Competitions })),
);
const DraftComponent = lazy(() =>
  import("./pages/Draft").then((m) => ({ default: m.DraftComponent })),
);
const SeasonAdmin = lazy(() =>
  import("./pages/SeasonAdmin").then((m) => ({ default: m.SeasonAdmin })),
);
const Seasons = lazy(() =>
  import("./pages/Seasons").then((m) => ({ default: m.Seasons })),
);
const SingleCompetition = lazy(() =>
  import("./pages/SingleCompetition").then((m) => ({
    default: m.SingleCompetition,
  })),
);
const ScoringReference = lazy(() =>
  import("./pages/ScoringReference").then((m) => ({
    default: m.ScoringReference,
  })),
);
const SingleSeason = lazy(() =>
  import("./pages/SingleSeason").then((m) => ({ default: m.SingleSeason })),
);

// Legacy redirect: /seasons/:id/manage -> /admin/:id (safe to remove once old links age out)
const RedirectToAdmin = () => {
  const { seasonId } = useParams();
  if (!seasonId) return <Navigate to="/admin" replace />;
  return <Navigate to={`/admin/${seasonId}`} replace />;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("main-content")?.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const modals = { AuthModal };

declare module "@mantine/modals" {
  export interface MantineModalsOverride {
    modals: typeof modals;
  }
}

export const AppRoutes = () => {
  const [opened, { toggle, close }] = useDisclosure();

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications />
      <Router>
        <ScrollToTop />
        <ModalsProvider modals={modals}>
          <AppShell
            header={{
              height: {
                base: 56,
                sm: 64,
              },
            }}
            navbar={{
              width: 300,
              breakpoint: "md",
              collapsed: { mobile: !opened },
            }}
            padding={{ base: "md", sm: "lg" }}
          >
            <a className={classes.skipLink} href="#main-content">
              Skip to main content
            </a>
            <AppShell.Header>
              <Group h="100%" justify="space-between" px="md">
                <Burger
                  opened={opened}
                  onClick={toggle}
                  hiddenFrom="md"
                  size="sm"
                  aria-label="Toggle navigation"
                />
                <Anchor
                  className={classes.title}
                  component={Link}
                  to="/"
                  underline="never"
                >
                  <Text component="span" inherit fw={900}>
                    Survivor
                  </Text>{" "}
                  <Text component="span" inherit variant="gradient">
                    Fantasy
                  </Text>
                </Anchor>
              </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md" aria-label="Main navigation">
              <Navbar onNavigate={close} />
            </AppShell.Navbar>

            <AppShell.Main id="main-content" className={classes.main}>
              <Suspense
                fallback={
                  <Center h="60vh">
                    <Loader size="lg" />
                  </Center>
                }
              >
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
                    element={<RedirectToAdmin />}
                  />
                  <Route path="/seasons/:seasonId" element={<SingleSeason />} />
                  <Route path="/seasons" element={<Seasons />} />

                  {/* Competitions */}
                  <Route
                    path="/competitions/:competitionId"
                    element={<SingleCompetition />}
                  />
                  <Route path="/competitions" element={<Competitions />} />

                  {/* Scoring */}
                  <Route path="/scoring" element={<ScoringReference />} />

                  {/* Admin */}
                  <Route path="/admin/:seasonId" element={<SeasonAdmin />} />
                  <Route path="/admin" element={<Admin />} />

                  {/* 404 catch-all — must be last */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <Footer />
            </AppShell.Main>
          </AppShell>
        </ModalsProvider>
      </Router>
    </MantineProvider>
  );
};
