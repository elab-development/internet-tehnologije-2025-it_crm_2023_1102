"use client";

import NextImage, { type ImageProps as NextImageProps } from "next/image";

type Props = Omit<NextImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
  wrapperClassName?: string;
};

/**
 * Reusable Image komponenta.
 * - Wrapper radi lepo za rounded, shadow, border, itd.
 * - Osnovno ponašanje: responsive slika, bez izmišljanja dimenzija.
 */
export default function Image({
  src,
  alt,
  className,
  wrapperClassName,
  ...props
}: Props) {
  return (
    <div className={wrapperClassName ?? ""}>
      <NextImage
        src={src}
        alt={alt}
        className={className}
        {...props}
      />
    </div>
  );
}
