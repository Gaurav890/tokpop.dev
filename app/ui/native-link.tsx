import type { AnchorHTMLAttributes } from 'react';

type NativeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
};

export default function NativeLink({ href, ...props }: NativeLinkProps) {
  return <a href={href} {...props} />;
}
