import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CarouselSlide {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  isActive: boolean;
}

interface HeroCarouselProps {
  slides?: CarouselSlide[];
  autoPlayInterval?: number;
  className?: string;
}

export function HeroCarousel({ 
  slides = [], 
  autoPlayInterval = 5000, 
  className 
}: HeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Only render if slides are provided
  if (!slides.length || slides.filter(slide => slide.isActive).length === 0) {
    return null;
  }

  const activeSlides = slides.filter(slide => slide.isActive);

  useEffect(() => {
    if (activeSlides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [activeSlides.length, autoPlayInterval]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => 
      prev === 0 ? activeSlides.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  };

  const currentSlideData = activeSlides[currentSlide];

  return (
    <section className={cn("relative h-96 overflow-hidden", className)}>
      {/* Carousel Images */}
      <div className="relative w-full h-full">
        {activeSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              index === currentSlide ? "opacity-100" : "opacity-0"
            )}
          >
            <img
              src={slide.imageUrl}
              alt={slide.title || "Promotional slide"}
              className="w-full h-full object-cover"
            />
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-black bg-opacity-30" />
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      {currentSlideData && (currentSlideData.title || currentSlideData.subtitle || currentSlideData.buttonText) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white max-w-4xl px-4">
            {currentSlideData.title && (
              <h2 className="text-4xl md:text-6xl font-oswald font-bold mb-4">
                {currentSlideData.title}
              </h2>
            )}
            {currentSlideData.subtitle && (
              <p className="text-xl md:text-2xl font-roboto-condensed mb-8">
                {currentSlideData.subtitle}
              </p>
            )}
            {currentSlideData.buttonText && currentSlideData.buttonLink && (
              <Button
                asChild
                className="bg-gun-gold hover:bg-gun-gold-bright text-gun-black px-8 py-3 text-lg font-medium"
              >
                <a href={currentSlideData.buttonLink}>
                  {currentSlideData.buttonText}
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Navigation Arrows - Only show if multiple slides */}
      {activeSlides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all duration-200"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all duration-200"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Slide Indicators - Only show if multiple slides */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {activeSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-200",
                index === currentSlide
                  ? "bg-gun-gold"
                  : "bg-white bg-opacity-50 hover:bg-opacity-75"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}