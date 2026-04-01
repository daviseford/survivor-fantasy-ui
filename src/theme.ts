import { createTheme, rem } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  autoContrast: true,
  defaultGradient: {
    from: "blue",
    to: "cyan",
    deg: 135,
  },
  headings: {
    sizes: {
      h1: { fontSize: rem(44), fontWeight: "800", lineHeight: "1.05" },
      h2: { fontSize: rem(32), fontWeight: "700", lineHeight: "1.3" },
      h3: { fontSize: rem(22), fontWeight: "600", lineHeight: "1.4" },
      h4: { fontSize: rem(17), fontWeight: "600", lineHeight: "1.5" },
    },
  },
  components: {
    AppShell: {
      styles: {
        header: {
          backgroundColor:
            "light-dark(var(--mantine-color-body), var(--mantine-color-dark-8))",
          borderColor:
            "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
        },
        navbar: {
          backgroundColor:
            "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
          borderColor:
            "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
        },
        main: {
          backgroundColor:
            "light-dark(var(--mantine-color-body), var(--mantine-color-dark-8))",
        },
      },
    },
    Badge: {
      styles: {
        label: {
          textBoxTrim: "none",
        },
      },
    },
    Button: {
      defaultProps: {
        radius: "xl",
      },
    },
    NavLink: {
      defaultProps: {
        variant: "filled",
      },
      styles: {
        root: {
          borderRadius: "var(--mantine-radius-md)",
        },
      },
    },
  },
});
