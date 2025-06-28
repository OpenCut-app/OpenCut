import React from "react";
import Link from "next/link";
import { RiGithubLine, RiTwitterXLine } from "react-icons/ri";

const footerLinks: { label: string; href: string }[] = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of use", href: "/terms" },
  {
    label: "About",
    href: "https://github.com/OpenCut-app/OpenCut/blob/main/README.md",
  },
  { label: "Contributors", href: "/contributors" },
];

const footerSocialNetwork: { icon: () => React.ReactElement; href: string }[] =
  [
    {
      icon: () => <RiGithubLine size={20} />,
      href: "https://github.com/OpenCut-app/OpenCut",
    },
    {
      icon: () => <RiTwitterXLine size={20} />,
      href: "https://x.com/OpenCutApp",
    },
  ];

const Footer = () => {
  return (
    <footer className="text-sm text-muted-foreground flex flex-col md:flex-row gap-6 items-center justify-between m-4">
      <p>© {new Date().getFullYear()} OpenCut, All Rights Reserved</p>
      <ul className="flex items-center gap-4">
        {footerLinks.map((link) => (
          <li key={`link-${link.label}`}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
      <ul className="flex items-center gap-4">
        {footerSocialNetwork.map((el) => (
          <li key={`el-${el.href}`}>
            <Link href={el.href}>{el.icon()}</Link>
          </li>
        ))}
      </ul>
    </footer>
  );
};

export default Footer;
