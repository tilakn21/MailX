import LinkifyReact from "linkify-react";
import Link from "next/link";

const renderLink = ({
  attributes,
  content,
}: {
  attributes: any;
  content: any;
}) => {
  const { href, ...props } = attributes;

  return (
    <a
      href={href}
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold hover:underline"
    >
      {content}
    </a>
  );
};

export function Linkify(props: { children: React.ReactNode }) {
  return (
    <LinkifyReact options={{ render: renderLink }}>
      {props.children}
    </LinkifyReact>
  );
}
