import { Code, Group } from "@mantine/core";
import {
  IconHome,
  IconKarate,
  IconLayoutBoard,
  IconLogin,
  IconLogout,
  IconSettings,
  IconUserPlus,
} from "@tabler/icons-react";
// import { MantineLogo } from '@mantinex/mantine-logo';
import { useLocation } from "react-router-dom";
import { PROJECT_NAME } from "../../consts";
import { auth } from "../../firebase";
import { useUser } from "../../hooks/useUser";
import classes from "./Navbar.module.css";

const data = [
  { link: "/", label: "Home", icon: IconHome },
  { link: "/admin", label: "Admin", icon: IconSettings },
  { link: "/seasons", label: "Seasons", icon: IconLayoutBoard },
  { link: "/competitions", label: "Competitions", icon: IconKarate },
];

export const Navbar = () => {
  const { pathname } = useLocation();

  console.log({ pathname });

  const { user } = useUser();

  const links = data.map((item) => {
    const isActive =
      (pathname.startsWith("/seasons") && item.link === "/seasons") ||
      item.link === pathname ||
      undefined;

    return (
      <a
        className={classes.link}
        data-active={isActive}
        href={item.link}
        key={item.label}
      >
        <item.icon className={classes.linkIcon} stroke={1.5} />
        <span>{item.label}</span>
      </a>
    );
  });

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        {/* <Group className={classes.header} justify="space-between"> */}
        <Group className={classes.header}>
          {/* <MantineLogo size={28} /> */}
          <h1>{PROJECT_NAME}</h1>
          <Code fw={700}>v0.0.0</Code>
        </Group>
        {links}
      </div>

      <div className={classes.footer}>
        {!user && (
          <a href="/signup" className={classes.link}>
            <IconUserPlus className={classes.linkIcon} stroke={1.5} />
            <span>Register</span>
          </a>
        )}

        {!user && (
          <a href="/login" className={classes.link}>
            <IconLogin className={classes.linkIcon} stroke={1.5} />
            <span>Login</span>
          </a>
        )}

        {user && (
          <a href="#" className={classes.link} onClick={() => handleLogout()}>
            <IconLogout className={classes.linkIcon} stroke={1.5} />
            <span>Logout</span>
          </a>
        )}
      </div>
    </nav>
  );
};
