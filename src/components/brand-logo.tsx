import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ size = 28, className = '', priority = false }: BrandLogoProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-md flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="ETPlus Logo"
        width={size}
        height={size}
        priority={priority}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
