import { Anchor, Container, Group, Text } from "@mantine/core";
import { useLocation } from "react-router-dom";

import classes from "./Footer.module.css";

const links = [
  {
    link: "https://github.com/daviseford/survivor-fantasy-ui/",
    label: "Github",
  },
  { link: "//daviseford.com", label: "daviseford.com" },
];

export const Footer = () => {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className={`${classes.footer} ${!isHome ? classes.hideOnMobile : ""}`}>
      <Container className={classes.inner}>
        <Group gap="xs" wrap="nowrap">
          <img src="/icons/probst.svg" alt="" className={classes.icon} />
          <Text c="dimmed" size="xs">
            Created by Davis Ford
          </Text>
        </Group>
        <Group gap="sm">
          {links.map((link) => (
            <Anchor
              c="dimmed"
              key={link.label}
              href={link.link}
              size="xs"
              target="_blank"
            >
              {link.label}
            </Anchor>
          ))}
        </Group>
      </Container>
    </div>
  );
};
