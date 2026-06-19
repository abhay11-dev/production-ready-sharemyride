import React from 'react';

/**
 * Consistent hero section design for all pages
 * - Blue gradient background
 * - Page title
 * - Optional subtitle/description
 * - Optional breadcrumb or action button
 */
export default function HeroSection({
  title,
  subtitle,
  description,
  actionButton,
  imageUrl,
  backgroundGradient = 'from-blue-700 via-blue-600 to-blue-500',
}) {
  return (
    <div className={`relative bg-gradient-to-r ${backgroundGradient} pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden`}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
          {/* Text content */}
          <div className="flex-1 max-w-2xl">
            {subtitle && (
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-2">
                {subtitle}
              </p>
            )}

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              {title}
            </h1>

            {description && (
              <p className="text-blue-100 text-base sm:text-lg leading-relaxed mb-6 max-w-xl">
                {description}
              </p>
            )}

            {actionButton && (
              <div className="flex flex-col sm:flex-row gap-3">
                {actionButton}
              </div>
            )}
          </div>

          {/* Optional image/illustration */}
          {imageUrl && (
            <div className="flex-1 flex items-center justify-center">
              <img
                src={imageUrl}
                alt={title}
                className="w-full max-w-md h-auto rounded-2xl shadow-2xl shadow-blue-900/30"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
