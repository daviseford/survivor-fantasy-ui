import { Anchor, Container, Group, Text } from "@mantine/core";

import classes from "./Footer.module.css";

const links = [
  {
    link: "https://github.com/daviseford/survivor-fantasy-ui/",
    label: "Github",
  },
  { link: "//daviseford.com", label: "daviseford.com" },
];

export const Footer = () => {
  return (
    <footer className={classes.footer}>
      <Container className={classes.inner}>
        <Group gap="xs" wrap="nowrap">
          <img src="/icons/probst.svg" alt="" className={classes.icon} />
          <Text c="dimmed" size="sm">
            Built for draft night chaos by Davis Ford
          </Text>
        </Group>
        <Group gap="sm">
          {links.map((link) => (
            <Anchor
              c="dimmed"
              key={link.label}
              href={link.link}
              size="sm"
              target="_blank"
            >
              {link.label}
            </Anchor>
          ))}
        </Group>
      </Container>
    </footer>
  );
};
