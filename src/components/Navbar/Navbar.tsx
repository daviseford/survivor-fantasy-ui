import {
  Box,
  Divider,
  Group,
  NavLink,
  Stack,
  Text,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconCalendar,
  IconHome,
  IconKarate,
  IconLayoutBoard,
  IconList,
  IconLogin,
  IconLogout,
  IconMail,
  IconMoon,
  IconSettings,
  IconSun,
  IconUser,
  IconUserX,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Link, useLocation } from "react-router-dom";
import { auth } from "../../firebase";
import { useUser } from "../../hooks/useUser";
import classes from "./Navbar.module.css";

type NavItem = {
  link: string;
  label: string;
  icon: React.FC<{ className?: string; stroke?: number }>;
  adminOnly?: boolean;
  children?: {
    link: string;
    label: string;
    icon: React.FC<{ className?: string; stroke?: number }>;
  }[];
};

const data: NavItem[] = [
  { link: "/", label: "Home", icon: IconHome },
  {
    link: "/admin",
    label: "Admin",
    icon: IconSettings,
    adminOnly: true,
    children: [
      { link: "/competitions", label: "Competitions", icon: IconKarate },
      { link: "/seasons", label: "Seasons", icon: IconLayoutBoard },
      { link: "/admin", label: "Episodes", icon: IconList },
      { link: "/admin", label: "Events", icon: IconCalendar },
      { link: "/admin", label: "Challenges", icon: IconKarate },
      { link: "/admin", label: "Eliminations", icon: IconUserX },
      { link: "/admin", label: "Teams", icon: IconUsersGroup },
    ],
  },
  { link: "/seasons", label: "Seasons", icon: IconLayoutBoard },
  { link: "/competitions", label: "Competitions", icon: IconKarate },
];

export const Navbar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { pathname } = useLocation();

  const { slimUser } = useUser();

  const links = data.map((item) => {
    // Hide admin-only routes
    if (!slimUser?.isAdmin && item.adminOnly) return null;

    const isActive =
      (pathname.startsWith("/seasons") && item.link === "/seasons") ||
      (pathname.startsWith("/competitions") && item.link === "/competitions") ||
      (pathname.startsWith("/admin") && item.link === "/admin") ||
      item.link === pathname ||
      undefined;

    if (item.children) {
      return (
        <NavLink
          key={item.label}
          className={classes.link}
          label={item.label}
          leftSection={<item.icon className={classes.linkIcon} stroke={1.5} />}
          defaultOpened={pathname.startsWith(item.link)}
          active={Boolean(isActive)}
          childrenOffset={28}
        >
          {item.children.map((child) => {
            const hasUniqueRoute = child.link !== "/admin";
            const childIsActive = hasUniqueRoute
              ? pathname.startsWith(child.link)
              : false;

            return (
              <NavLink
                key={child.label}
                component={Link}
                to={child.link}
                label={child.label}
                leftSection={
                  <child.icon className={classes.childLinkIcon} stroke={1.5} />
                }
                className={classes.childLink}
                active={childIsActive || undefined}
                onClick={onNavigate}
              />
            );
          })}
        </NavLink>
      );
    }

    return (
      <NavLink
        key={item.label}
        component={Link}
        to={item.link}
        className={classes.link}
        active={Boolean(isActive)}
        label={item.label}
        leftSection={<item.icon className={classes.linkIcon} stroke={1.5} />}
        onClick={onNavigate}
      />
    );
  });

  const { toggleColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light");
  const isDark = computedColorScheme === "dark";

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <Stack className={classes.navbar} gap="md" justify="space-between">
      <Stack gap={4}>{links}</Stack>

      <Stack gap="xs">
        <Divider />

        <NavLink
          component="button"
          type="button"
          className={classes.link}
          label={isDark ? "Light mode" : "Dark mode"}
          leftSection={
            isDark ? (
              <IconSun className={classes.linkIcon} stroke={1.5} />
            ) : (
              <IconMoon className={classes.linkIcon} stroke={1.5} />
            )
          }
          onClick={toggleColorScheme}
          aria-label="Toggle color scheme"
        />

        {!slimUser && (
          <NavLink
            component="button"
            type="button"
            className={classes.link}
            label="Login"
            leftSection={
              <IconLogin className={classes.linkIcon} stroke={1.5} />
            }
            onClick={() =>
              modals.openContextModal({
                modal: "AuthModal",
                innerProps: {},
              })
            }
          />
        )}

        {slimUser && (
          <>
            <Box className={classes.userCard}>
              <Group align="flex-start" gap="sm" wrap="nowrap">
                <IconUser className={classes.linkIcon} stroke={1.5} />
                <Stack gap={2}>
                  <Text size="sm" fw={600} truncate>
                    {slimUser.displayName}
                  </Text>
                  <Group gap={6} wrap="nowrap">
                    <IconMail className={classes.metaIcon} stroke={1.5} />
                    <Text size="xs" c="dimmed" truncate>
                      {slimUser.email}
                    </Text>
                  </Group>
                </Stack>
              </Group>
            </Box>

            <NavLink
              component="button"
              type="button"
              className={classes.link}
              label="Logout"
              leftSection={
                <IconLogout className={classes.linkIcon} stroke={1.5} />
              }
              onClick={handleLogout}
            />
          </>
        )}
      </Stack>
    </Stack>
  );
};
